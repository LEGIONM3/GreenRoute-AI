# Production Deployment & Operations Guide

## Smart Waste Management & Disposal Guidance Platform

This document details the production deployment, infrastructure architecture, environment configurations, backup strategies, and monitoring hooks for the platform.

---

## 1. System Architecture Overview

```
                      [ Internet (Clients) ]
                                 │
                                 ▼
                     [ Nginx Reverse Proxy / SSL ]
                       │                       │
           ┌───────────┴───────────┐           │
           │                       │           │
           ▼                       ▼           ▼
  [ /api/* & /uploads/* ]       [ /* ]    [ Static Assets ]
           │                       │           │
           ▼                       ▼           │
   FastAPI Backend         Next.js 15 App ─────┘
     (Port 8000)             (Port 3000)
           │
     ┌─────┴─────────────────────┐
     ▼                           ▼
PostgreSQL + pgvector     Local / S3 Storage
  (Port 5432)               (/app/uploads)
```

---

## 2. Prerequisites & Server Sizing

### Minimum Recommended Production Specs
- **CPU**: 2 vCPUs (4 vCPUs recommended for concurrent vector similarity workloads)
- **RAM**: 4 GB RAM (8 GB recommended for PostgreSQL buffer caches and Next.js SSR)
- **Disk**: 40 GB NVMe SSD
- **OS**: Ubuntu 22.04 LTS / Debian 12 / RHEL 9
- **Required Software**: Docker Engine 24+ and Docker Compose v2.20+

---

## 3. Quick Start Deployment via Docker Compose

### Step 1: Clone Repository
```bash
git clone <repository_url> /opt/wastecare
cd /opt/wastecare
```

### Step 2: Configure Environment Variables
Copy the template and set production secrets:
```bash
cp .env.example .env
nano .env
```

Ensure you customize the following:
```ini
PROJECT_NAME="Smart Waste Management Platform"
SECRET_KEY="generate_a_cryptographically_secure_random_key_using_openssl_rand_hex_32"
DATABASE_URL=postgresql://wasteuser:secure_production_password@db:5432/wastedb
POSTGRES_USER=wasteuser
POSTGRES_PASSWORD=secure_production_password
POSTGRES_DB=wastedb

# Optional AI API Keys (if using external OpenAI/Gemini models; otherwise localized embedding engine is used)
OPENAI_API_KEY=
GEMINI_API_KEY=

# Administrative accounts
ADMIN_EMAIL=admin@yourmunicipality.gov
ADMIN_PASSWORD=StrongAdminPassword!123
```

### Step 3: Launch Multi-Container Stack
```bash
docker compose up --build -d
```

### Step 4: Verify Container Health
```bash
docker compose ps
```

All three services (`wastecare_db`, `wastecare_backend`, `wastecare_frontend`) should show status `Up (healthy)`.

---

## 4. Production Nginx Reverse Proxy with Let's Encrypt SSL

Create `/etc/nginx/sites-available/wastecare.conf`:

```nginx
server {
    listen 80;
    server_name wastecare.yourdomain.gov;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name wastecare.yourdomain.gov;

    ssl_certificate /etc/letsencrypt/live/wastecare.yourdomain.gov/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wastecare.yourdomain.gov/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Client payload limit for citizen issue photos
    client_max_body_size 15M;

    # Frontend Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API Endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploaded Citizen Issue Evidence
    location /uploads/ {
        proxy_pass http://127.0.0.1:8000/uploads/;
        proxy_set_header Host $host;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

Enable the configuration and obtain SSL certificate:
```bash
ln -s /etc/nginx/sites-available/wastecare.conf /etc/nginx/sites-enabled/
certbot --nginx -d wastecare.yourdomain.gov
nginx -t && systemctl reload nginx
```

---

## 5. Database Migrations & Seeding

Initial schema and vector embeddings are seeded automatically on startup. To trigger manual migration or re-seeding:

```bash
docker compose exec backend python -c "from app.core.database import SessionLocal; from app.db.seed_data import seed_initial_data; db = SessionLocal(); seed_initial_data(db); db.close()"
```

---

## 6. Backup & Recovery Protocol

### Automated Nightly PostgreSQL Backup
Create a daily cron job script `/opt/wastecare/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/wastecare"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Dump PostgreSQL database
docker compose exec -T db pg_dump -U wasteuser wastedb | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Archive uploads
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C /opt/wastecare/backend uploads

# Keep last 14 days
find $BACKUP_DIR -type f -mtime +14 -delete
```

Make executable and add to crontab:
```bash
chmod +x /opt/wastecare/backup.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/wastecare/backup.sh") | crontab -
```

---

## 7. Health Checks & Monitoring

- **API Health**: `GET /health` returns `{ "status": "healthy" }`
- **Container Logs**:
  ```bash
  docker compose logs -f backend
  docker compose logs -f frontend
  ```
- **Process Timing Metrics**: Every response includes `X-Process-Time-Sec` header for latency profiling.
