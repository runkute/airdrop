# Local Development Setup Guide

This guide walks through setting up AI Marketing OS on your local machine from scratch.

---

## Prerequisites

### Required software

**Docker and Docker Compose (recommended approach)**

Install Docker Desktop from https://www.docker.com/products/docker-desktop/

Verify installation:
```bash
docker --version      # Docker 24.0+ required
docker compose version  # Docker Compose v2.20+ required
```

**Python 3.12+ (for local dev without Docker)**

```bash
# macOS with Homebrew
brew install python@3.12

# Ubuntu/Debian
sudo apt-get install python3.12 python3.12-venv python3.12-dev

# Verify
python3.12 --version
```

**Node.js 20+ (for frontend development)**

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Verify
node --version  # v20.x.x
npm --version   # 10.x.x
```

**Make (optional but recommended)**

```bash
# macOS
xcode-select --install  # includes make

# Ubuntu/Debian
sudo apt-get install make
```

---

## Option A: Docker Setup (Recommended)

This is the fastest way to get all services running.

### Step 1: Clone the repository

```bash
git clone https://github.com/your-org/ai-marketing-os.git
cd ai-marketing-os
```

### Step 2: Configure environment

```bash
cp .env.example .env
```

Open `.env` in your editor and fill in the required values:

```bash
# REQUIRED: Generate a secure secret key
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
echo "SECRET_KEY=$SECRET_KEY"
# Copy the output and paste into .env

# REQUIRED: At least one AI provider key
OPENAI_API_KEY=sk-your-openai-key-here
# OR
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# REQUIRED: Generate an encryption key for storing credentials
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Copy the output and set as ENCRYPTION_KEY in .env
```

The database credentials (`POSTGRES_USER`, `POSTGRES_PASSWORD`) can stay as defaults for local development.

### Step 3: Build and start services

```bash
# Build Docker images (takes 3-5 minutes on first run)
docker compose build

# Start all services in the background
docker compose up -d

# Verify all containers are healthy
docker compose ps
```

Expected output:
```
NAME                          STATUS
ai_marketing_postgres         Up (healthy)
ai_marketing_redis            Up (healthy)
ai_marketing_backend          Up
ai_marketing_celery_worker    Up
ai_marketing_celery_beat      Up
ai_marketing_frontend         Up
```

### Step 4: Run database migrations

```bash
docker compose exec backend alembic upgrade head
```

Expected output:
```
INFO  [alembic.runtime.migration] Running upgrade  -> 001_initial_schema, Create initial schema
INFO  [alembic.runtime.migration] Running upgrade 001 -> 002_brand_voices, Add brand_voices table
...
```

### Step 5: Seed sample data (optional)

```bash
docker compose exec backend python scripts/seed_data.py
```

This creates:
- Admin user: `admin@aimarketingos.com` / `Admin123!`
- Demo workspace: `Demo Company`
- Two sample brand voices

### Step 6: Access the application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| API Docs (ReDoc) | http://localhost:8000/redoc |

---

## Option B: Local Python + Docker (Hybrid)

Run the database and Redis in Docker, but run the backend and frontend directly on your machine. Useful for faster Python iteration.

### Step 1: Start only infrastructure services

```bash
docker compose up -d postgres redis
```

### Step 2: Set up Python virtual environment

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

pip install -r requirements.txt
```

### Step 3: Configure environment

```bash
# In the project root, copy .env.example to .env
cp .env.example .env

# Update DATABASE_URL and REDIS_URL to use localhost
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/ai_marketing_os
REDIS_URL=redis://localhost:6379/0
```

### Step 4: Run migrations

```bash
cd backend
alembic upgrade head
```

### Step 5: Start the backend

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Step 6: Start the frontend

```bash
cd frontend
npm install
npm run dev
```

### Step 7: Start Celery workers (optional)

In separate terminal windows:

```bash
# Worker
cd backend
source .venv/bin/activate
celery -A app.workers.celery_app worker --loglevel=info

# Beat scheduler
cd backend
source .venv/bin/activate
celery -A app.workers.celery_app beat --loglevel=info
```

---

## Environment Configuration Reference

### AI Provider Keys

You only need keys for the providers you want to use. The system will skip unavailable providers and route to available ones.

**OpenAI:**
1. Go to https://platform.openai.com/api-keys
2. Create a new key with "All" permissions
3. Set `OPENAI_API_KEY=sk-...`

**Anthropic Claude:**
1. Go to https://console.anthropic.com
2. Navigate to API Keys
3. Set `ANTHROPIC_API_KEY=sk-ant-...`

**Google Gemini:**
1. Go to https://aistudio.google.com/app/apikey
2. Create API key
3. Set `GOOGLE_API_KEY=AIza...`

**xAI Grok:**
1. Go to https://console.x.ai
2. Create API key
3. Set `GROK_API_KEY=xai-...`

### Social Publishing Credentials

**Facebook/Instagram Pages:**
1. Create a Facebook App at https://developers.facebook.com
2. Add the `Pages` and `Instagram` products
3. Generate a long-lived page access token
4. Set `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, and `INSTAGRAM_ACCESS_TOKEN`

**WordPress:**
1. Log in to your WordPress admin
2. Go to Users > Profile
3. Scroll to "Application Passwords" and create one
4. The URL, username, and application password are entered through the UI (stored encrypted in DB)

---

## Database Management

### View current migration status

```bash
docker compose exec backend alembic current
```

### Create a new migration

```bash
docker compose exec backend alembic revision --autogenerate -m "add_new_feature"
```

This inspects SQLAlchemy models and generates a migration file in `backend/alembic/versions/`.

### Apply migrations

```bash
docker compose exec backend alembic upgrade head
```

### Rollback one migration

```bash
docker compose exec backend alembic downgrade -1
```

### Connect to PostgreSQL directly

```bash
docker compose exec postgres psql -U postgres -d ai_marketing_os

# Useful SQL commands:
\dt          # List all tables
\d users     # Describe table structure
\q           # Quit
```

---

## Testing

### Run backend tests

```bash
docker compose exec backend pytest tests/ -v
```

### Run with coverage report

```bash
docker compose exec backend pytest tests/ --cov=app --cov-report=html
# Open htmlcov/index.html in browser
```

### Run specific test file

```bash
docker compose exec backend pytest tests/test_content_service.py -v
```

---

## Common Issues and Troubleshooting

### Container fails to start: "port is already allocated"

Another process is using the port. Find and stop it:

```bash
# Find process using port 5432
lsof -i :5432
# or
sudo ss -tlnp | grep 5432

# Kill the process (replace PID)
kill -9 <PID>
```

Or change the port in `.env`:
```bash
POSTGRES_PORT=5433
```

### Backend container exits immediately: "could not translate host name"

The backend started before PostgreSQL was ready. The `healthcheck` configuration should prevent this, but if it happens:

```bash
docker compose restart backend
```

### Alembic error: "Can't locate revision identified by..."

Your local migration history is out of sync. Reset and re-apply:

```bash
docker compose exec backend alembic stamp head
docker compose exec backend alembic upgrade head
```

### Frontend shows "ECONNREFUSED" when calling the API

The `NEXT_PUBLIC_API_URL` in the frontend is not correct for your environment. Update it in `.env`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Then restart the frontend:
```bash
docker compose restart frontend
```

### AI generation returns "Provider unavailable"

Check that your API key is set correctly:

```bash
docker compose exec backend python3 -c "
import os
print('OpenAI:', bool(os.getenv('OPENAI_API_KEY')))
print('Anthropic:', bool(os.getenv('ANTHROPIC_API_KEY')))
"
```

If the keys show as `False`, the env vars aren't being loaded. Make sure your `.env` file exists in the project root and the keys don't have any extra spaces.

### Celery worker not processing tasks

```bash
# Check worker logs
docker compose logs celery_worker

# Restart workers
docker compose restart celery_worker celery_beat

# Verify Redis connection
docker compose exec redis redis-cli ping
# Should return: PONG
```

### Docker disk space issues

```bash
# See Docker disk usage
docker system df

# Clean up stopped containers, unused images, and build cache
docker system prune -f

# Nuclear option (removes ALL Docker data including volumes)
# WARNING: This will delete your database data
docker system prune -a --volumes
```

---

## Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f celery_worker

# Last 100 lines
docker compose logs --tail=100 backend
```

---

## Stopping the Application

```bash
# Stop all services (preserves data)
docker compose down

# Stop and remove all data volumes (WARNING: deletes database)
docker compose down -v
```
