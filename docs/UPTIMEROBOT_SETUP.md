# Configuration UptimeRobot pour Plane (Render Free Tier)

Ce guide explique comment configurer UptimeRobot pour garder vos services Render actifs et éviter les cold starts.

## Problème

Sur le plan gratuit de Render, les services web **s'éteignent après 15 minutes d'inactivité**, causant un délai de 1-2 minutes au premier accès.

## Solution

UptimeRobot envoie des requêtes HTTP toutes les 5-10 minutes pour maintenir les services actifs.

---

## Endpoints à surveiller

| Service | URL | Méthode | Réponse attendue |
|---------|-----|---------|------------------|
| plane-api | `https://plane-api.onrender.com/` | GET | `{"status": "OK"}` |
| plane-live | `https://plane-live.onrender.com/` | GET | `{"status": "OK", ...}` |
| plane-space | `https://plane-space.onrender.com/health` | GET | `{"status": "OK", ...}` |

> **Note**: plane-live a aussi `/live/health` disponible, mais `/` est plus simple pour le monitoring.

> **Note**: Les sites statiques (`plane-web`, `plane-admin`) ne nécessitent pas de ping car ils ne s'éteignent jamais.

---

## Guide de configuration UptimeRobot

### Étape 1: Créer un compte

1. Aller sur [https://uptimerobot.com](https://uptimerobot.com)
2. Cliquer sur **"Register for FREE"** (coin supérieur droit)
3. Remplir le formulaire:
   - Email
   - Mot de passe
4. Confirmer votre email

### Étape 2: Créer le premier monitor (plane-api)

1. Connectez-vous à UptimeRobot
2. Cliquer sur **"+ Add New Monitor"** (bouton vert)
3. Configurer:

   | Champ | Valeur |
   |-------|--------|
   | Monitor Type | HTTP(s) |
   | Friendly Name | `Plane API` |
   | URL (or IP) | `https://plane-api.onrender.com/` |
   | Monitoring Interval | `5 minutes` ⚠️ |

4. Section **"Alert Contacts To Notify"**:
   - Cocher votre email pour recevoir des alertes si le service tombe

5. Cliquer **"Create Monitor"**

### Étape 3: Créer le monitor plane-live

1. Cliquer **"+ Add New Monitor"**
2. Configurer:

   | Champ | Valeur |
   |-------|--------|
   | Monitor Type | HTTP(s) |
   | Friendly Name | `Plane Live` |
   | URL (or IP) | `https://plane-live.onrender.com/` |
   | Monitoring Interval | `5 minutes` |

3. Cocher l'alerte email
4. Cliquer **"Create Monitor"**

### Étape 4: Créer le monitor plane-space

1. Cliquer **"+ Add New Monitor"**
2. Configurer:

   | Champ | Valeur |
   |-------|--------|
   | Monitor Type | HTTP(s) |
   | Friendly Name | `Plane Space` |
   | URL (or IP) | `https://plane-space.onrender.com/health` |
   | Monitoring Interval | `5 minutes` |

3. Cocher l'alerte email
4. Cliquer **"Create Monitor"**

---

## Configuration recommandée

### Intervalle de monitoring

| Plan UptimeRobot | Intervalle minimum | Recommandation |
|------------------|-------------------|----------------|
| Gratuit | 5 minutes | ✅ 5 minutes |
| Pro | 1 minute | 5 minutes suffit |

**5 minutes** est l'intervalle optimal car Render éteint après **15 minutes**.

### Options avancées (facultatif)

Dans les paramètres du monitor, vous pouvez activer:

- **HTTP Method**: GET (par défaut)
- **Keyword**: Ajouter `OK` pour vérifier que la réponse contient "OK"
- **Timeout**: 30 secondes (pour gérer les cold starts initiaux)

---

## Vérification

### Après configuration

1. Attendez 5-10 minutes
2. Vérifiez le dashboard UptimeRobot:
   - Tous les monitors doivent être **"Up"** (vert)
   - Response time: ~200-500ms (normal après warm-up)

### Test manuel

```bash
# Tester les endpoints
curl -s https://plane-api.onrender.com/ | jq
curl -s https://plane-live.onrender.com/ | jq
curl -s https://plane-space.onrender.com/health | jq
```

Réponses attendues:
```json
{"status": "OK"}
{"status": "OK", "timestamp": "2024-...", "version": "..."}
{"status": "OK", "timestamp": "2024-...", "service": "plane-space"}
```

---

## Tableau récapitulatif

| # | Service | URL à surveiller | Intervalle |
|---|---------|-----------------|------------|
| 1 | Plane API | `https://plane-api.onrender.com/` | 5 min |
| 2 | Plane Live | `https://plane-live.onrender.com/` | 5 min |
| 3 | Plane Space | `https://plane-space.onrender.com/health` | 5 min |

---

## Alternatives à UptimeRobot

Si vous préférez d'autres services:

| Service | Gratuit | Intervalle min | Lien |
|---------|---------|----------------|------|
| UptimeRobot | 50 monitors | 5 min | [uptimerobot.com](https://uptimerobot.com) |
| Cron-job.org | Illimité | 1 min | [cron-job.org](https://cron-job.org) |
| Freshping | 50 checks | 1 min | [freshping.io](https://freshping.io) |
| Betterstack | 10 monitors | 3 min | [betterstack.com](https://betterstack.com) |

---

## Résumé

Après configuration:
- ✅ Vos 3 services seront pingés toutes les 5 minutes
- ✅ Ils ne s'éteindront plus jamais
- ✅ Temps d'accès: ~200-500ms au lieu de 1-2 minutes
- ✅ Alertes email si un service tombe

**Coût total: 0€**
