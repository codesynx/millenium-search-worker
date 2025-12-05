# Deploying Search Worker to DigitalOcean

## Option 1: DigitalOcean App Platform (Recommended - Easy)

### Prerequisites
- DigitalOcean account
- GitHub repo with this code
- Meilisearch instance running (separate droplet or cloud service)

### Steps

1. **Push code to GitHub**
   ```bash
   cd /path/to/millenium/search
   git add .
   git commit -m "Add search worker"
   git push
   ```

2. **Create App on DigitalOcean**
   - Go to https://cloud.digitalocean.com/apps
   - Click "Create App"
   - Connect your GitHub repo
   - Select the branch (e.g., `main`)
   - Set source directory: `/search`

3. **Configure Worker**
   - Type: **Worker** (not Web Service)
   - Build Command: Leave default or set to `bun run build`
   - Run Command: `bun start`
   - Instance Size: Basic XXS ($5/month)

4. **Set Environment Variables**
   Click "Edit" next to environment variables and add:

   ```
   DATABASE_URL=postgresql://neondb_owner:npg_BnoGWOy15lET@ep-hidden-thunder-a9qr84uq-pooler.gwc.azure.neon.tech/neondb?sslmode=require&channel_binding=require

   MEILISEARCH_HOST=http://YOUR_MEILISEARCH_IP:7700
   (or if using Meilisearch Cloud: https://your-project.meilisearch.io)

   MEILISEARCH_MASTER_KEY=your_master_key_here

   SYNC_INTERVAL_MINUTES=5
   ```

5. **Deploy**
   - Click "Create Resources"
   - Wait for build and deployment (~2-3 minutes)

### Where to Get MEILISEARCH_HOST

#### Option A: Separate Droplet for Meilisearch
1. Create a droplet: Ubuntu 22.04, $6/month (1GB RAM)
2. SSH into droplet:
   ```bash
   ssh root@your-droplet-ip
   ```
3. Install Docker:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```
4. Run Meilisearch:
   ```bash
   docker run -d \
     -p 7700:7700 \
     -v $(pwd)/data:/meili_data \
     -e MEILI_MASTER_KEY=your_master_key_here \
     -e MEILI_ENV=production \
     --name meilisearch \
     --restart unless-stopped \
     getmeili/meilisearch:v1.10
   ```
5. Use in worker: `MEILISEARCH_HOST=http://YOUR_DROPLET_IP:7700`

#### Option B: Meilisearch Cloud (Easiest)
1. Go to https://www.meilisearch.com/cloud
2. Sign up and create a project
3. Copy the URL and API key
4. Use in worker:
   ```
   MEILISEARCH_HOST=https://your-project.meilisearch.io
   MEILISEARCH_API_KEY=provided_api_key
   ```

---

## Option 2: Deploy to Existing Droplet with Docker

If you already have a DigitalOcean droplet:

1. **SSH into your droplet**
   ```bash
   ssh root@your-droplet-ip
   ```

2. **Install Docker** (if not installed)
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

3. **Clone your repo**
   ```bash
   git clone your-repo-url
   cd millenium/search
   ```

4. **Create .env file**
   ```bash
   nano .env
   ```

   Paste:
   ```env
   DATABASE_URL=postgresql://...
   MEILISEARCH_HOST=http://localhost:7700
   MEILISEARCH_MASTER_KEY=your_master_key_here
   SYNC_INTERVAL_MINUTES=5
   ```

5. **Start everything with Docker Compose**
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```

6. **Check logs**
   ```bash
   docker-compose -f docker-compose.production.yml logs -f
   ```

7. **Run initial sync**
   ```bash
   docker-compose -f docker-compose.production.yml exec search-worker bun run sync
   ```

---

## Option 3: Heroku Worker Dyno

If your backend is on Heroku, you can add the worker as a dyno:

1. **Add to Procfile** (in root of project):
   ```
   web: cd backend && npm start
   worker: cd search && bun start
   ```

2. **Add buildpacks**:
   ```bash
   heroku buildpacks:add --index 1 heroku/nodejs
   heroku buildpacks:add https://github.com/oven-sh/heroku-buildpack-bun.git
   ```

3. **Set config vars**:
   ```bash
   heroku config:set MEILISEARCH_HOST=http://your-meilisearch-host:7700
   heroku config:set MEILISEARCH_MASTER_KEY=your_key
   ```

4. **Enable worker dyno**:
   ```bash
   heroku ps:scale worker=1
   ```

---

## Update Backend to Use Meilisearch

Once the worker and Meilisearch are deployed, update your backend's environment variables:

### Heroku Backend
```bash
cd backend
heroku config:set MEILISEARCH_HOST=http://your-meilisearch-ip:7700
heroku config:set MEILISEARCH_API_KEY=your_master_key_here
```

### Vercel/Other
Add to environment variables in dashboard:
```
MEILISEARCH_HOST=http://your-meilisearch-ip:7700
MEILISEARCH_API_KEY=your_master_key_here
```

---

## Testing

1. **Check worker is running**:
   - DigitalOcean: Check "Runtime Logs" in App Platform
   - Docker: `docker-compose logs -f search-worker`
   - Heroku: `heroku logs --tail --dyno worker`

2. **Verify Meilisearch has data**:
   ```bash
   curl http://your-meilisearch-host:7700/indexes/products/stats \
     -H 'Authorization: Bearer YOUR_MASTER_KEY'
   ```

3. **Test search from backend**:
   ```bash
   curl "https://your-backend.herokuapp.com/api/search/products?q=excavator"
   ```

---

## Costs Summary

### Budget Option (~$11/month)
- DigitalOcean Worker: $5/month (Basic XXS)
- Meilisearch Droplet: $6/month (1GB RAM)

### Recommended Option (~$17/month)
- DigitalOcean Worker: $5/month
- Meilisearch Droplet: $12/month (2GB RAM - better performance)

### Premium Option (~$29/month)
- Meilisearch Cloud: ~$29/month (includes hosting + backups)
- DigitalOcean Worker: $5/month

---

## Troubleshooting

### Build fails with "prisma generate" error
Make sure `postinstall` script runs during deployment. Check DigitalOcean build logs.

### Worker can't connect to Meilisearch
- Check firewall: Port 7700 must be open
- Verify MEILISEARCH_HOST is correct
- Test connection: `curl http://host:7700/health`

### Worker can't connect to database
- Verify DATABASE_URL includes `?sslmode=require`
- Check if Neon DB allows connections from DigitalOcean IPs
- Test connection: `psql $DATABASE_URL`

### No data in Meilisearch
- Check worker logs for sync errors
- Run manual sync: `bun run sync`
- Verify products exist in PostgreSQL
