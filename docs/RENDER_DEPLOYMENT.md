## Configuration Cloudflare R2

### 1. Créer un bucket R2
1. Aller sur Cloudflare Dashboard > R2
2. Créer un bucket `plane-uploads`
3. Noter l’Account ID

### 2. Créer des API credentials
1. R2 > Manage R2 API Tokens
2. Create API Token avec permissions `Object Read & Write`
3. Copier :
   - Access Key ID
   - Secret Access Key

### 3. Variables d’environnement
```bash
AWS_ACCESS_KEY_ID=<r2_access_key>
AWS_SECRET_ACCESS_KEY=<r2_secret_key>
AWS_S3_ENDPOINT_URL=https://<account_id>.r2.cloudflarestorage.com
AWS_S3_BUCKET_NAME=plane-uploads
AWS_REGION=auto
```

### 4. (Optionnel) Custom Domain pour les fichiers publics
1. R2 > Bucket Settings > Public Access
2. Ajouter un custom domain (ex: `cdn.yourdomain.com`)
3. Définir :
```bash
AWS_S3_CUSTOM_DOMAIN=cdn.yourdomain.com
```

## Variables d’environnement pour Render

```bash
# Cloudflare R2 Storage
AWS_ACCESS_KEY_ID=xxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_S3_ENDPOINT_URL=https://xxxxxxxxx.r2.cloudflarestorage.com
AWS_S3_BUCKET_NAME=plane-uploads
AWS_REGION=auto

# Optionnel - Custom domain pour fichiers publics
# AWS_S3_CUSTOM_DOMAIN=cdn.yourdomain.com
```

## CORS Configuration pour R2
Dans Cloudflare R2 bucket settings, ajouter cette configuration CORS :

```json
[
  {
    "AllowedOrigins": ["https://your-plane-web.onrender.com", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## Vérifications
- Upload de fichier fonctionne
- Les images/avatars s’affichent correctement
- Les presigned URLs sont générées correctement
- Pas d’erreur CORS dans la console
