# Deploying Meilisearch Worker to DigitalOcean

## Architecture Options

### Option 1: Single Droplet (Recommended)

Deploy Meilisearch + Worker together on one droplet. Simple and cost-effective.

**Requirements**:
- 1 GB RAM minimum (2 GB recommended)
- Ubuntu 22.04
- Docker & Docker Compose installed

**Steps**:

1. **Create DigitalOcean Droplet**
   ```bash
   # Choose: Ubuntu 22.04, 2GB RAM, $12/month
   ```

2. **Install Docker**
   ```bash
   ssh root@your-droplet-ip

   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

3. **Clone & Configure**
   ```bash
   git clone your-repo
   cd millenium/search

   # Create production .env
   nano .env
   ```

   ```env
   DATABASE_URL="postgresql://..."  # Your Neon DB URL
   MEILISEARCH_HOST=http://meilisearch:7700  # Docker service name
   MEILISEARCH_MASTER_KEY=your_secure_key_here
   SYNC_INTERVAL_MINUTES=5
   ```

4. **Start Services**
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```

5. **Run Initial Sync**
   ```bash
   docker-compose -f docker-compose.production.yml exec search-worker bun run sync
   ```

6. **Check Logs**
   ```bash
   docker-compose -f docker-compose.production.yml logs -f
   ```

**Your Backend `.env` on Heroku/Vercel**:
```env
# Point to your DigitalOcean droplet
MEILISEARCH_HOST=http://your-droplet-ip:7700
MEILISEARCH_API_KEY=your_secure_key_here
```

**Security**: Expose port 7700 only to your backend server IP, or use a VPN/private network.

---

### Option 2: Separate Droplets

Run Meilisearch on one droplet, worker on another.

**Meilisearch Droplet**:
```bash
cd millenium/search
docker-compose up -d meilisearch
```

**Worker Droplet**:
```env
MEILISEARCH_HOST=http://meilisearch-droplet-ip:7700
```

---

### Option 3: Backend + Worker on Heroku, Meilisearch on DigitalOcean

If your backend is already on Heroku:

**DigitalOcean (Meilisearch only)**:
```bash
docker-compose up -d meilisearch
```

**Worker on Heroku** (separate dyno):
```bash
# Add search/ folder to your Heroku app
# Procfile:
worker: cd search && bun start
```

```env
MEILISEARCH_HOST=http://your-droplet-ip:7700
```

---

### Option 4: Meilisearch Cloud (Managed)

Use Meilisearch's hosted service: https://www.meilisearch.com/cloud

```env
MEILISEARCH_HOST=https://your-project.meilisearch.io
MEILISEARCH_API_KEY=your_provided_api_key
```

No Docker needed. Just run the worker anywhere.

---

## Environment Variables Summary

### Local Development
```env
MEILISEARCH_HOST=http://localhost:7700
```

### Production - Same Server (Docker Compose)
```env
MEILISEARCH_HOST=http://meilisearch:7700  # Docker service name
```

### Production - Remote Server
```env
MEILISEARCH_HOST=http://123.45.67.89:7700  # Droplet IP
# or
MEILISEARCH_HOST=http://search.yourdomain.com:7700  # Domain
```

### Production - Meilisearch Cloud
```env
MEILISEARCH_HOST=https://your-project.meilisearch.io
```

---

## Security Best Practices

1. **Firewall**: Only allow port 7700 from your backend server IP
   ```bash
   ufw allow from your-backend-ip to any port 7700
   ```

2. **Strong Master Key**: Generate with `openssl rand -base64 32`

3. **HTTPS**: Use Nginx reverse proxy for SSL
   ```nginx
   server {
       listen 443 ssl;
       server_name search.yourdomain.com;

       location / {
           proxy_pass http://localhost:7700;
       }
   }
   ```

4. **Private Network**: Use DigitalOcean VPC for internal communication

---

## Monitoring

### Check Worker Status
```bash
docker-compose logs -f search-worker
```

### Check Meilisearch Health
```bash
curl http://your-droplet-ip:7700/health
```

### View Index Stats
```bash
curl http://your-droplet-ip:7700/indexes/products/stats \
  -H 'Authorization: Bearer YOUR_MASTER_KEY'
```

---

## Updating

```bash
# Pull latest code
git pull

# Rebuild worker
docker-compose -f docker-compose.production.yml up -d --build

# Force full resync if needed
docker-compose -f docker-compose.production.yml exec search-worker bun run sync
```

---

## Troubleshooting

### Worker can't connect to Meilisearch
- Check if Meilisearch is running: `docker-compose ps`
- Verify network: `docker network inspect millenium_millenium-network`
- Check environment variables: `docker-compose config`

### Worker can't connect to database
- Verify DATABASE_URL is correct
- Check if Neon DB allows connections from DigitalOcean IP
- Test connection: `psql $DATABASE_URL`

### Search returns no results
- Run manual sync: `docker-compose exec search-worker bun run sync`
- Check index stats (see Monitoring section)
- Verify data exists in PostgreSQL
