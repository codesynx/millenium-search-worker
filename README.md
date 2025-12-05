# Meilisearch Search Worker

Self-hosted search engine worker for Millenium marketplace. Syncs products and services from PostgreSQL to Meilisearch for fast, typo-tolerant full-text search.

## Features

- **Fast Full-Text Search**: Sub-50ms search responses with Meilisearch
- **Typo Tolerance**: Automatically handles misspellings
- **Faceted Filtering**: Filter by category, city, region, status
- **Auto-Sync**: Periodic synchronization from PostgreSQL (default: 5 minutes)
- **Self-Hosted**: Run locally or deploy alongside your backend

## Setup

### 1. Start Meilisearch with Docker

```bash
cd search

# Copy environment variables
cp .env.example .env

# Edit .env and set your MEILISEARCH_MASTER_KEY and DATABASE_URL

# Start Meilisearch container
docker-compose up -d

# Check status
docker-compose ps
```

Meilisearch will be available at http://localhost:7700

### 2. Install Dependencies

```bash
bun install
```

### 3. Generate Prisma Client

The worker uses the same Prisma schema as the backend:

```bash
cd ../backend
bunx prisma generate
```

### 4. Run Initial Sync

Populate Meilisearch with existing data:

```bash
bun run sync
```

This will:
- Initialize search indexes
- Sync all approved products
- Sync all approved services

### 5. Start the Worker

```bash
# Development (with hot reload)
bun run dev

# Production
bun start
```

The worker will:
- Run an initial full sync on startup
- Then sync every 5 minutes (configurable via `SYNC_INTERVAL_MINUTES`)

## Environment Variables

```env
# Meilisearch Configuration
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_MASTER_KEY=your_master_key_here

# Database Connection (same as backend)
DATABASE_URL=postgresql://user:password@localhost:5432/millenium

# Sync Settings
SYNC_INTERVAL_MINUTES=5
```

## Search Indexes

### Products Index (`products`)

**Searchable Fields**:
- name
- description
- category
- city
- region

**Filterable Fields**:
- type (RENTAL, RELATED_PRODUCT)
- status
- category
- city
- region
- sellerId
- isAvailable

**Sortable Fields**:
- createdAt
- pricePerDay
- pricePerHour
- viewCount
- rankingPoints

### Services Index (`services`)

**Searchable Fields**:
- title
- description
- category
- city
- region
- specialistName

**Filterable Fields**:
- status
- category
- city
- region
- specialistId
- isAvailable

**Sortable Fields**:
- createdAt
- price
- viewCount

## Using in Backend

Install Meilisearch client in your backend:

```bash
cd ../backend
bun add meilisearch
```

Example search endpoint:

```typescript
import { MeiliSearch } from 'meilisearch';

const meili = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_MASTER_KEY,
});

// Search products
router.get('/search/products', async (req, res) => {
  const { q, city, category } = req.query;

  const index = meili.index('products');
  const results = await index.search(q as string, {
    filter: [
      city ? `city = "${city}"` : null,
      category ? `category = "${category}"` : null,
    ].filter(Boolean),
    sort: ['rankingPoints:desc'],
    limit: 20,
  });

  res.json(results);
});
```

## Manual Operations

### Force Full Resync

```bash
bun run sync
```

### Clear All Data

```bash
# Access Meilisearch container
docker-compose exec meilisearch sh

# Delete indexes (inside container)
curl -X DELETE 'http://localhost:7700/indexes/products' \
  -H 'Authorization: Bearer YOUR_MASTER_KEY'

curl -X DELETE 'http://localhost:7700/indexes/services' \
  -H 'Authorization: Bearer YOUR_MASTER_KEY'
```

Then run `bun run sync` to repopulate.

## Deployment

### Docker Production

For production, update `docker-compose.yml`:

```yaml
environment:
  - MEILI_ENV=production
  - MEILI_MASTER_KEY=${MEILISEARCH_MASTER_KEY}
  - MEILI_NO_ANALYTICS=true
volumes:
  - ./data:/meili_data  # Persist data
```

### Worker as Systemd Service (Linux)

Create `/etc/systemd/system/millenium-search-worker.service`:

```ini
[Unit]
Description=Millenium Meilisearch Worker
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/millenium/search
ExecStart=/usr/bin/bun start
Restart=always
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable millenium-search-worker
sudo systemctl start millenium-search-worker
sudo systemctl status millenium-search-worker
```

## Monitoring

### Check Worker Logs

```bash
# Docker logs
docker-compose logs -f meilisearch

# Worker logs (if running with systemd)
sudo journalctl -u millenium-search-worker -f
```

### Meilisearch Health Check

```bash
curl http://localhost:7700/health
```

### Index Stats

```bash
curl http://localhost:7700/indexes/products/stats \
  -H 'Authorization: Bearer YOUR_MASTER_KEY'
```

## Troubleshooting

### Worker can't connect to Meilisearch

- Check if Meilisearch is running: `docker-compose ps`
- Verify `MEILISEARCH_HOST` in `.env`
- Check firewall rules

### Worker can't connect to database

- Verify `DATABASE_URL` matches backend
- Check if backend database is accessible from worker
- Ensure Prisma Client is generated

### Search returns no results

- Check if initial sync ran successfully: `bun run sync`
- Verify data exists in PostgreSQL
- Check Meilisearch index stats (see above)

## Performance

- **Search Speed**: ~20-50ms for typical queries
- **Sync Time**: ~1-5 seconds per 10,000 documents
- **Memory**: ~100MB base + ~1KB per document
- **Disk**: ~500 bytes per document (compressed)

## Next Steps

1. **Add to Backend**: Integrate Meilisearch client in backend
2. **Update Search Endpoints**: Replace PostgreSQL LIKE queries with Meilisearch
3. **Real-time Sync**: Add webhook triggers for instant indexing on create/update
4. **Autocomplete**: Implement instant search suggestions
5. **Analytics**: Track popular search queries
