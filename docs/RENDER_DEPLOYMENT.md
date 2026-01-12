## Déploiement Plane sur Render via Blueprint (render.yaml)

Cette repo contient un `render.yaml` prêt pour Render Blueprints. Le but est que Render crée automatiquement tous les services (API, worker, web, admin, space, live) sans configuration manuelle service-par-service.

### 0) Prérequis
- Un dépôt GitHub contenant ce projet (public ou privé) connecté à Render.
- 3 services externes (recommandé pour le free tier) :
  - PostgreSQL: Neon
  - Redis: Upstash
  - Stockage S3: Cloudflare R2

---

## 1) Créer les services externes

### A. PostgreSQL (Neon)
1. Créer un projet Neon
2. Copier la `DATABASE_URL` (avec `sslmode=require`) :
   `postgresql://user:pass@...neon.tech/dbname?sslmode=require`

### B. Redis (Upstash)
1. Créer une database Redis
2. Copier l’URL TLS :
   `rediss://default:password@...upstash.io:6379`

### C. Stockage (Cloudflare R2)
#### 1. Créer un bucket R2
1. Cloudflare Dashboard → R2
2. Créer un bucket `plane-uploads`
3. Noter l’Account ID

#### 2. Créer des API credentials
1. R2 → Manage R2 API Tokens
2. Create API Token avec permissions `Object Read & Write`
3. Copier :
   - Access Key ID
   - Secret Access Key

#### 3. Variables S3 (R2)
- `AWS_ACCESS_KEY_ID=<r2_access_key>`
- `AWS_SECRET_ACCESS_KEY=<r2_secret_key>`
- `AWS_S3_ENDPOINT_URL=https://<account_id>.r2.cloudflarestorage.com`
- `AWS_S3_BUCKET_NAME=plane-uploads`
- `AWS_REGION=auto`

#### 4. (Optionnel) Custom Domain
- `AWS_S3_CUSTOM_DOMAIN=cdn.votre-domaine.com`

#### 5. CORS (R2)
Dans le bucket R2 → CORS config, ajouter par ex. :

```json
[
  {
    "AllowedOrigins": [
      "https://plane-web.onrender.com",
      "https://plane-admin.onrender.com",
      "https://plane-space.onrender.com",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 2) Déployer sur Render avec Blueprints (A → Z)

### Étape 1 — Vérifier le fichier Blueprint
- Le fichier doit s’appeler exactement `render.yaml` et être à la racine du repo.

### Étape 2 — Créer le Blueprint
1. Render Dashboard → **New** → **Blueprint**
2. Choisir le repo + la branche
3. Render détecte `render.yaml` et affiche la liste des services/env groups
4. Cliquer **Apply**

### Étape 3 — Renseigner les variables d’environnement (une seule fois)
Le `render.yaml` crée des `envVarGroups`. L’essentiel à compléter est le groupe :

- `plane-runtime`
  - `DATABASE_URL` (Neon)
  - `REDIS_URL` (Upstash)
  - `AWS_ACCESS_KEY_ID` (R2)
  - `AWS_SECRET_ACCESS_KEY` (R2)
  - `AWS_S3_ENDPOINT_URL` (R2)
  - (optionnel) `AWS_S3_CUSTOM_DOMAIN`

Les secrets sont générés automatiquement :
- `plane-secrets.SECRET_KEY` (Django)
- `plane-secrets.LIVE_SERVER_SECRET_KEY` (Live server)

### Étape 4 — Lancer le premier déploiement
1. Après avoir mis `DATABASE_URL`/`REDIS_URL`/R2, relancer un deploy si Render ne l’a pas fait automatiquement.
2. Attendre que `plane-api` devienne **Live**.

### Étape 5 — Vérifications
- Ouvrir :
  - `https://plane-web.onrender.com`
  - `https://plane-admin.onrender.com`
  - `https://plane-space.onrender.com`
  - `https://plane-api.onrender.com`
  - `https://plane-live.onrender.com`
- Vérifier les logs :
  - `plane-api`: migrations, collectstatic, démarrage gunicorn
  - `plane-worker`: worker + beat
  - `plane-live`: validation des env vars

### Étape 6 — Si vous mettez des domaines custom
1. Configurer les domaines sur Render (Custom Domains)
2. Mettre à jour les URLs dans le groupe `plane-client` (pour le front)
3. Mettre à jour les URLs dans le groupe `plane-urls` (pour le backend)
4. Mettre à jour `plane-cors.CORS_ALLOWED_ORIGINS` avec les nouveaux domaines

---

## 3) Notes Free Tier (Render/Upstash)
- Les services free "sleep" après ~15 min d’inactivité.
- Upstash free a une limite quotidienne de commandes Redis.
- Le worker est configuré pour réduire la consommation Redis (sans gossip/mingle/heartbeat, concurrency=2).

Si vous dépassez les limites :
1. Upgrade Upstash
2. Ou upgrade le worker Render
