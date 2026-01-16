# 🚀 Déploiement Plane sur Render (100% Gratuit)

Ce guide vous permet de déployer Plane gratuitement avec :
- **Render** : hébergement des services
- **Neon** : PostgreSQL serverless
- **Upstash** : Redis serverless (cache + broker Celery)
- **Cloudflare R2** : stockage des fichiers (S3 compatible)

⚠️ Notes importantes sur ce repo :
- Les apps **web/admin/space** utilisent des variables **Vite** (`VITE_*`) (voir `apps/*/.env.example`) et non `NEXT_PUBLIC_*`.
- Le worker Celery a besoin d’un **broker**. Dans ce code, le broker est lu via `AMQP_URL` mais vous pouvez y mettre une URL Redis (`redis://` / `rediss://`).
- Il n’y a pas de `render.yaml` dans ce repo : le guide décrit un déploiement **manuel**, et propose en option un exemple de blueprint à ajouter.

---

## 📋 Prérequis

- Un fork GitHub de ce repo
- Un compte Render : https://render.com
- Un compte Neon : https://neon.tech
- Un compte Upstash : https://upstash.com
- Un compte Cloudflare : https://cloudflare.com

---

## 🗄️ Étape 1 : Configurer PostgreSQL (Neon)

### 1.1 Créer un compte Neon
1. Aller sur https://neon.tech
2. Sign up avec GitHub

### 1.2 Créer un projet
1. Click **New Project**
2. Nom : `plane`
3. Region : `Frankfurt` (ou la plus proche)
4. PostgreSQL : `15`

### 1.3 Créer la base de données `plane`
Dans la console SQL de Neon :
```sql
CREATE DATABASE plane;
```

### 1.4 Récupérer la connection string
Dans Neon → **Connection Details**, copiez l’URL (puis remplacez la DB par `plane`) :

```text
postgresql://username:password@ep-xxx-xxx.eu-central-1.aws.neon.tech/plane?sslmode=require
```

Vous l’utiliserez comme `DATABASE_URL`.

---

## 🔴 Étape 2 : Configurer Redis (Upstash)

### 2.1 Créer un compte Upstash
1. Aller sur https://upstash.com
2. Sign up avec GitHub

### 2.2 Créer une base Redis
1. Click **Create Database**
2. Nom : `plane-redis`
3. Type : `Regional`
4. Region : `Frankfurt` (idéalement la même que Neon)

### 2.3 Récupérer l’URL Redis TLS
Dans Upstash → votre DB → **REST API** → onglet `.env` / credentials, copiez l’URL `rediss://...` :

```text
rediss://default:xxx@eu1-xxx-xxx.upstash.io:6379
```

⚠️ Important :
- Utiliser `rediss://` (TLS)
- Si Celery refuse TLS (rare selon versions), ajoutez `?ssl_cert_reqs=none` :

```text
rediss://default:xxx@eu1-xxx-xxx.upstash.io:6379/0?ssl_cert_reqs=none
```

---

## 📦 Étape 3 : Configurer Cloudflare R2

### 3.1 Activer R2
1. Cloudflare Dashboard → **R2**
2. Activer R2 (gratuit jusqu’à ~10GB)

### 3.2 Créer un bucket
1. Click **Create bucket**
2. Nom : `plane-uploads`
3. Location : `Automatic`

### 3.3 Créer les API credentials
1. R2 → **Manage R2 API Tokens**
2. **Create API Token**
3. Permissions : `Object Read & Write`
4. Bucket : `plane-uploads`
5. Sauvegardez :
   - `Access Key ID`
   - `Secret Access Key`
   - `Endpoint URL` au format : `https://<account_id>.r2.cloudflarestorage.com`

### 3.4 Configurer CORS (Important)
Dans le bucket → **Settings** → **CORS Policy** :

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Astuce : si vous voulez être plus strict, remplacez `"*"` par les domaines Render (`https://plane-web...`, etc.).

---

## 🚀 Étape 4 : Déployer sur Render

### 4.1 Connecter GitHub
1. Aller sur https://dashboard.render.com
2. Sign up avec GitHub
3. Autoriser l’accès au repo

### 4.2 (Optionnel) Blueprint
Ce repo ne contient pas `render.yaml`. Si vous voulez un déploiement type blueprint, vous pouvez ajouter un fichier `render.yaml` (exemple à adapter) et utiliser **New → Blueprint**.

Sinon, suivez le déploiement manuel ci-dessous.

### 4.3 Déploiement manuel (recommandé ici)
Vous allez créer 6 services :
- `plane-api` (Python, API Django)
- `plane-worker` (Python, Celery)
- `plane-web` (Node, UI principale)
- `plane-admin` (Node, UI admin)
- `plane-space` (Node, UI publique “spaces”)
- `plane-live` (Node, serveur temps réel)

Préconisation : créez-les dans cet ordre : **api → live → web/admin/space → worker**.

---

## 🧩 Étape 4.4 : Commandes Render (Build/Start)

Render exécute les commandes à la racine du repo.

### Service 1 : `plane-api` (Web Service)
- Type : **Web Service**
- Runtime : **Python**
- Build Command :

```bash
pip install -r apps/api/requirements.txt
```

- Start Command (inclut migrations au boot) :

```bash
cd apps/api && python manage.py migrate && ./bin/docker-entrypoint-api.sh
```

Notes :
- `./bin/docker-entrypoint-api.sh` lance aussi `collectstatic`, `create_bucket`, etc.
- Le service écoute sur `$PORT` automatiquement via le script.

### Service 2 : `plane-web` (Web Service)
- Type : **Web Service**
- Runtime : **Node**
- Build Command :

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm --filter web build
```

- Start Command (port dynamique Render) :

```bash
corepack enable && pnpm --filter web exec serve -s build/client -l $PORT
```

### Service 3 : `plane-admin` (Web Service)
- Runtime : **Node**
- Build Command :

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm --filter admin build
```

- Start Command :

```bash
corepack enable && pnpm --filter admin exec serve -s build/client -l $PORT
```

### Service 4 : `plane-space` (Web Service)
- Runtime : **Node**
- Build Command :

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm --filter space build
```

- Start Command (port dynamique) :

```bash
corepack enable && PORT=$PORT pnpm --filter space exec react-router-serve ./build/server/index.js
```

### Service 5 : `plane-live` (Web Service)
- Runtime : **Node**
- Build Command :

```bash
corepack enable && corepack prepare pnpm@10.24.0 --activate && pnpm install --frozen-lockfile && pnpm turbo run build --filter=live
```

> **Important** : Utiliser `pnpm turbo run build --filter=live` au lieu de `pnpm --filter live build` pour construire automatiquement les dépendances (@plane/types, @plane/logger, @plane/decorators, @plane/editor).

- Start Command :

```bash
node apps/live/dist/start.mjs
```

### Service 6 : `plane-worker` (Background Worker)
- Runtime : **Python**
- Build Command :

```bash
pip install -r apps/api/requirements.txt
```

- Start Command (attend DB + migrations, puis worker + beat) :

```bash
cd apps/api && python manage.py wait_for_db && python manage.py wait_for_migrations && celery -A plane worker -l info -B
```

---

## 🔐 Étape 4.5 : Variables d’environnement

Rappel : sur Render, ne mettez pas de guillemets autour des valeurs.

### 4.5.1 Variables `plane-api`

```bash
# Django
DEBUG=0
DJANGO_SETTINGS_MODULE=plane.settings.production
SECRET_KEY=<Generate>
ALLOWED_HOSTS=*

# Database (Neon)
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.eu-central-1.aws.neon.tech/plane?sslmode=require

# Redis (Upstash)
REDIS_URL=rediss://default:xxx@eu1-xxx-xxx.upstash.io:6379/0

# Celery broker
# IMPORTANT: dans ce repo, CELERY_BROKER_URL est dérivé de AMQP_URL.
# Vous pouvez y mettre une URL redis/rediss.
AMQP_URL=rediss://default:xxx@eu1-xxx-xxx.upstash.io:6379/0

# URLs publiques (utilisées pour les redirections / liens / CORS)
WEB_URL=https://plane-web.onrender.com
APP_BASE_URL=https://plane-web.onrender.com
APP_BASE_PATH=/

ADMIN_BASE_URL=https://plane-admin.onrender.com
ADMIN_BASE_PATH=/god-mode

SPACE_BASE_URL=https://plane-space.onrender.com
SPACE_BASE_PATH=/spaces

LIVE_BASE_URL=https://plane-live.onrender.com
LIVE_BASE_PATH=/live

# Live secret (doit matcher plane-live)
LIVE_SERVER_SECRET_KEY=<Generate>

# CORS (séparé par des virgules)
CORS_ALLOWED_ORIGINS=https://plane-web.onrender.com,https://plane-admin.onrender.com,https://plane-space.onrender.com

# Storage (Cloudflare R2)
USE_MINIO=0
AWS_REGION=auto
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_ENDPOINT_URL=https://<account_id>.r2.cloudflarestorage.com
AWS_S3_BUCKET_NAME=plane-uploads
SIGNED_URL_EXPIRATION=3600
FILE_SIZE_LIMIT=5242880

# Gunicorn (optionnel)
GUNICORN_WORKERS=2
```

### 4.5.2 Variables `plane-worker`

```bash
DJANGO_SETTINGS_MODULE=plane.settings.production
SECRET_KEY=<same as plane-api>

DATABASE_URL=<same as plane-api>
REDIS_URL=<same as plane-api>
AMQP_URL=<same as plane-api>

# Storage (pour les tâches liées aux fichiers)
USE_MINIO=0
AWS_REGION=auto
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_ENDPOINT_URL=https://<account_id>.r2.cloudflarestorage.com
AWS_S3_BUCKET_NAME=plane-uploads
SIGNED_URL_EXPIRATION=3600
FILE_SIZE_LIMIT=5242880

# Si vous utilisez le live server
LIVE_SERVER_SECRET_KEY=<same as plane-api>
```

### 4.5.3 Variables `plane-live`

```bash
API_BASE_URL=https://plane-api-6urj.onrender.com
LIVE_BASE_PATH=/live
LIVE_SERVER_SECRET_KEY=<same as plane-api>

# Redis (Upstash)
REDIS_URL=rediss://default:xxx@eu1-xxx-xxx.upstash.io:6379/0

# CORS (optionnel)
CORS_ALLOWED_ORIGINS=https://plane-web-32l5.onrender.com,https://plane-admin-ztbn.onrender.com,https://plane-space-huu9.onrender.com
```

### 4.5.4 Variables `plane-web`

```bash
VITE_API_BASE_URL=https://plane-api-6urj.onrender.com

VITE_WEB_BASE_URL=https://plane-web-32l5.onrender.com

VITE_ADMIN_BASE_URL=https://plane-admin-ztbn.onrender.com
VITE_ADMIN_BASE_PATH=/god-mode

VITE_SPACE_BASE_URL=https://plane-space-huu9.onrender.com
VITE_SPACE_BASE_PATH=/spaces

VITE_LIVE_BASE_URL=https://plane-live-x3iu.onrender.com
VITE_LIVE_BASE_PATH=/live
```

### 4.5.5 Variables `plane-admin`

```bash
VITE_API_BASE_URL=https://plane-api-6urj.onrender.com

VITE_WEB_BASE_URL=https://plane-web-32l5.onrender.com

VITE_ADMIN_BASE_URL=https://plane-admin-ztbn.onrender.com
VITE_ADMIN_BASE_PATH=/god-mode

VITE_SPACE_BASE_URL=https://plane-space-huu9.onrender.com
VITE_SPACE_BASE_PATH=/spaces

VITE_LIVE_BASE_URL=https://plane-live-x3iu.onrender.com
VITE_LIVE_BASE_PATH=/live
```

### 4.5.6 Variables `plane-space`

```bash
VITE_API_BASE_URL=https://plane-api-6urj.onrender.com

VITE_WEB_BASE_URL=https://plane-web-32l5.onrender.com

VITE_ADMIN_BASE_URL=https://plane-admin-ztbn.onrender.com
VITE_ADMIN_BASE_PATH=/god-mode

VITE_SPACE_BASE_URL=https://plane-space-huu9.onrender.com
VITE_SPACE_BASE_PATH=/spaces

VITE_LIVE_BASE_URL=https://plane-live-x3iu.onrender.com
VITE_LIVE_BASE_PATH=/live
```

---

## ✅ Étape 5 : Vérifications post-déploiement

### 5.1 Tester l’API
L’endpoint de health check de l’API (dans ce repo) répond sur la racine `/` :

```bash
curl https://plane-api-6urj.onrender.com/
```

Réponse attendue :

```json
{"status":"OK"}
```

### 5.2 Tester le Live server

```bash
curl https://plane-live-x3iu.onrender.com/health/
```

### 5.3 Accéder aux interfaces
- Web : `https://plane-web.onrender.com`
- Admin : `https://plane-admin.onrender.com/god-mode`
- Space : `https://plane-space.onrender.com/spaces`

### 5.4 Créer le premier utilisateur
1. Aller sur `https://plane-web.onrender.com`
2. Sign up avec email
3. Créer un workspace

---

## ⚠️ Limitations du Free Tier (à connaître)

| Service | Limitation | Impact |
|---------|------------|--------|
| Render Web | Sleep après ~15 min d’inactivité | ~30s au premier accès |
| Render Worker | Selon plan | Les tâches peuvent être retardées |
| Neon PostgreSQL | stockage limité | croissance limitée |
| Upstash Redis | quota commandes/jour | suffisant pour petits usages |
| Cloudflare R2 | ~10GB | dépend des uploads |

---

## 🔧 Troubleshooting

### L’API renvoie 502/504 juste après le déploiement
- Les migrations peuvent tourner au premier boot (start command fait `migrate`).
- Attendre 1–2 minutes et recharger.

### Erreur CORS dans le navigateur
- Vérifier `CORS_ALLOWED_ORIGINS` sur `plane-api`.
- Vérifier que vous utilisez les bons domaines Render (https).
- Vérifier la policy CORS R2 si le problème concerne les uploads.

### Le worker ne traite rien / erreurs RabbitMQ
Symptôme : logs Celery avec `Connection refused` ou tentative `amqp://...`.
- Vérifier que `AMQP_URL` est bien défini.
- Pour un setup 100% gratuit : mettez `AMQP_URL` sur la même valeur que `REDIS_URL` (Upstash).

Si TLS échoue côté broker :
- Essayez : `AMQP_URL=rediss://...:6379/0?ssl_cert_reqs=none`

### Uploads cassés / erreurs S3
- Vérifier `AWS_S3_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`.
- Vérifier que le bucket existe (R2 Dashboard).
- Vérifier la CORS Policy du bucket.

### Erreur "too many Redis commands"
- Vous avez dépassé le quota Upstash.
- Attendre le reset (souvent minuit UTC) ou upgrader.

---

## 💰 Upgrade Path

Quand vous êtes prêts à payer :

| Upgrade | Coût | Bénéfice |
|---------|------|----------|
| Render Starter | ~7$/service | pas de sleep |
| Upstash Pro | ~10$/mois | quotas plus confortables |
| Neon Pro | ~19$/mois | plus de stockage + perf |

Total “confort” (selon nombre de services) : généralement ~50–70$/mois.
