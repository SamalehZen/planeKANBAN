## Worker Celery (Free Tier)

### Limitations
- Le worker "spin down" après 15min d'inactivité
- Redémarre en ~30s quand une tâche arrive
- Limite Upstash : 10K commandes Redis/jour

### Optimisations appliquées
- Heartbeat désactivé (économise des commandes Redis)
- Concurrency limitée à 2
- Beat schedule réduit (tâches moins fréquentes)
- Pas de gossip/mingle (économise Redis)

### Si vous dépassez les limites
1. Upgrade Upstash à $10/mois (illimité)
2. OU Upgrade Render Worker à $7/mois (pas de spin down)
