# Déploiement sur Render (Gratuit)

## Services externes requis

### 1. PostgreSQL - Neon (https://neon.tech)
1. Créer un compte gratuit
2. Créer un projet "plane"
3. Copier la connection string:
   ```
   postgresql://user:pass@ep-xxx.region.neon.tech/plane?sslmode=require
   ```

### 2. Redis - Upstash (https://upstash.com)
1. Créer un compte gratuit
2. Créer une database Redis
3. Copier l'URL TLS:
   ```
   rediss://default:xxx@eu1-xxx.upstash.io:6379
   ```

### 3. Stockage - Cloudflare R2
Voir la documentation R2 pour la configuration.

## Variables d'environnement Render

```bash
DATABASE_URL=postgresql://...@neon.tech/plane?sslmode=require
REDIS_URL=rediss://default:...@upstash.io:6379
SECRET_KEY=<generated>
```
