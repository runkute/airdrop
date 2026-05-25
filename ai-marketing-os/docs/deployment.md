# Production Deployment Guide

This guide covers deploying AI Marketing OS to a VPS (Ubuntu 22.04) with Docker, SSL/TLS, monitoring, and automated backups.

---

## Server Requirements

**Minimum (small team, up to 10 users):**
- 2 vCPU
- 4 GB RAM
- 40 GB SSD
- Ubuntu 22.04 LTS

**Recommended (growing team, up to 100 users):**
- 4 vCPU
- 8 GB RAM
- 80 GB SSD
- Ubuntu 22.04 LTS

**Cloud provider recommendations:** DigitalOcean Droplet, Hetzner Cloud CX21, AWS EC2 t3.medium, Vultr.

---

## Initial Server Setup

### Step 1: Create a non-root user

```bash
# Log in as root
ssh root@your-server-ip

# Create a deploy user
adduser deploy
usermod -aG sudo deploy

# Copy SSH key for the deploy user
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Test login
ssh deploy@your-server-ip
```

### Step 2: Harden SSH

```bash
sudo nano /etc/ssh/sshd_config
```

Set:
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

```bash
sudo systemctl restart ssh
```

### Step 3: Configure firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### Step 4: Install Docker

```bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add deploy user to docker group (no sudo required)
sudo usermod -aG docker deploy

# Log out and back in for group change to take effect
exit
ssh deploy@your-server-ip

# Verify
docker run hello-world
```

---

## Deploying the Application

### Step 1: Clone the repository

```bash
cd /home/deploy
git clone https://github.com/your-org/ai-marketing-os.git
cd ai-marketing-os
```

### Step 2: Configure production environment

```bash
cp .env.example .env
nano .env
```

Critical production values to set:

```bash
# Application
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=<run: python3 -c "import secrets; print(secrets.token_hex(32))">
FRONTEND_URL=https://your-domain.com

# Database — use strong passwords
POSTGRES_USER=aimarketing_prod
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=ai_marketing_os_prod

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Encryption
ENCRYPTION_KEY=<run: python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
LOG_LEVEL=WARNING

# Ports
BACKEND_PORT=8000
FRONTEND_PORT=3000
```

### Step 3: Set file permissions

```bash
chmod 600 .env
```

### Step 4: Build and start production services

```bash
# Build with production targets
BUILD_TARGET=production FRONTEND_BUILD_TARGET=production docker compose build

# Start with production profile (includes Nginx)
docker compose --profile production up -d

# Check status
docker compose ps
```

### Step 5: Run migrations

```bash
docker compose exec backend alembic upgrade head
```

---

## SSL/TLS with Let's Encrypt

### Install Certbot

```bash
sudo apt-get install -y certbot
```

### Obtain certificate (standalone mode)

Temporarily stop Nginx if it's running:

```bash
docker compose stop nginx

sudo certbot certonly --standalone \
  -d your-domain.com \
  -d www.your-domain.com \
  --email admin@your-domain.com \
  --agree-tos \
  --no-eff-email
```

Certificates are saved to `/etc/letsencrypt/live/your-domain.com/`.

### Configure Nginx for SSL

Create a production Nginx config at `docker/nginx/conf.d/default.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /docs {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Mount certificates into Nginx

Update `docker-compose.yml` Nginx volumes:

```yaml
nginx:
  volumes:
    - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./docker/nginx/conf.d:/etc/nginx/conf.d:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro
```

### Set up automatic renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal
sudo crontab -e
# Add this line:
0 3 * * * certbot renew --quiet && docker compose -f /home/deploy/ai-marketing-os/docker-compose.yml --profile production restart nginx
```

---

## Database Backup Strategy

### Manual backup

```bash
# Create a timestamped backup
docker compose exec postgres pg_dump -U postgres ai_marketing_os_prod | gzip > \
  /home/deploy/backups/db_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Automated daily backups

Create `/home/deploy/scripts/backup_db.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="/home/deploy/backups"
DB_NAME="ai_marketing_os_prod"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
docker compose -f /home/deploy/ai-marketing-os/docker-compose.yml \
  exec -T postgres pg_dump -U postgres "$DB_NAME" | gzip > "$BACKUP_FILE"

echo "Backup created: $BACKUP_FILE ($(du -sh $BACKUP_FILE | cut -f1))"

# Remove backups older than RETENTION_DAYS
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "Removed backups older than $RETENTION_DAYS days"
```

```bash
chmod +x /home/deploy/scripts/backup_db.sh

# Add to crontab (2 AM daily)
crontab -e
# Add:
0 2 * * * /home/deploy/scripts/backup_db.sh >> /home/deploy/logs/backup.log 2>&1
```

### Offsite backup to S3

Install AWS CLI and configure:

```bash
sudo apt-get install -y awscli
aws configure
```

Add to backup script:
```bash
# Upload to S3
aws s3 cp "$BACKUP_FILE" "s3://your-bucket/db-backups/"
```

### Restore from backup

```bash
# Stop the backend to prevent writes
docker compose stop backend celery_worker celery_beat

# Restore
gunzip -c /home/deploy/backups/db_20250115_020000.sql.gz | \
  docker compose exec -T postgres psql -U postgres ai_marketing_os_prod

# Start services
docker compose start backend celery_worker celery_beat
```

---

## Monitoring and Logging

### Health check endpoint

The backend exposes `GET /health` which returns:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Application monitoring with Sentry

1. Create a project at https://sentry.io
2. Copy the DSN and set `SENTRY_DSN=https://...@sentry.io/...` in `.env`
3. Sentry will automatically capture unhandled exceptions

### Structured logging

The application uses Python's `structlog` for structured JSON logging. In production, logs are written to stdout and can be collected by your preferred log aggregator.

View logs:
```bash
# All services
docker compose logs -f

# Backend only with timestamps
docker compose logs -f --timestamps backend

# Last hour of backend logs
docker compose logs --since=1h backend
```

### Uptime monitoring

Set up a free uptime monitor (UptimeRobot, Better Stack, etc.) pointing to:
```
https://your-domain.com/health
```

Configure alerts for downtime notifications.

---

## Scaling Workers

### Scale Celery workers

```bash
# Add more worker instances
docker compose up -d --scale celery_worker=3
```

### Use separate queues for different task types

In production, configure high-priority publishing tasks to run on dedicated workers:

```bash
# High-priority worker (only processes publishing tasks)
docker compose exec celery_worker celery -A app.workers.celery_app worker \
  --queues=publishing \
  --concurrency=2 \
  --loglevel=warning

# General worker (content generation, alerts)
docker compose exec celery_worker celery -A app.workers.celery_app worker \
  --queues=default,content,alerts \
  --concurrency=4 \
  --loglevel=warning
```

---

## Deployment Updates

### Rolling update procedure

```bash
# Pull latest code
cd /home/deploy/ai-marketing-os
git pull origin main

# Rebuild images
docker compose build backend frontend

# Run any new migrations
docker compose exec backend alembic upgrade head

# Restart services one by one (zero downtime with Nginx)
docker compose up -d --no-deps backend
docker compose up -d --no-deps frontend
docker compose up -d --no-deps celery_worker celery_beat

# Verify health
curl https://your-domain.com/health
```

### Create a deploy script

```bash
#!/bin/bash
# /home/deploy/scripts/deploy.sh
set -e

APP_DIR="/home/deploy/ai-marketing-os"

echo "Pulling latest changes..."
cd "$APP_DIR"
git pull origin main

echo "Building new images..."
docker compose build backend frontend

echo "Running database migrations..."
docker compose exec backend alembic upgrade head

echo "Restarting services..."
docker compose up -d --no-deps backend frontend celery_worker celery_beat

echo "Waiting for health check..."
sleep 10
curl -sf https://your-domain.com/health || (echo "Health check failed!" && exit 1)

echo "Deployment complete!"
```

---

## Security Checklist for Production

- [ ] `DEBUG=false` in `.env`
- [ ] `SECRET_KEY` is at least 32 random characters
- [ ] Database password is strong and unique
- [ ] `ENCRYPTION_KEY` is set for credential encryption
- [ ] `.env` file has `chmod 600` permissions
- [ ] SSL/TLS certificate is installed and auto-renewing
- [ ] `CORS_ORIGINS` only includes your exact domain
- [ ] Firewall only exposes ports 22, 80, 443
- [ ] SSH root login is disabled
- [ ] SSH password authentication is disabled
- [ ] Sentry DSN is configured for error tracking
- [ ] Daily database backups are configured and tested
- [ ] Restore procedure has been tested at least once
