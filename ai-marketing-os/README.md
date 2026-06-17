# AI Marketing OS

> An enterprise-grade AI Marketing Operating System powered by multiple AI providers.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Python](https://img.shields.io/badge/python-3.12+-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)

## Overview

AI Marketing OS is a production-ready platform that centralizes your entire marketing operation:

- **Multi-AI Content Engine** — Generate content with OpenAI, Claude, Gemini, and Grok
- **Brand Voice System** — Maintain consistent brand identity across all AI-generated content
- **Auto Publishing** — Schedule and publish to Facebook, Instagram, and WordPress
- **Ads Monitoring** — Track performance across Meta, Google, and TikTok Ads
- **AI Alert Engine** — Automated alerts for CTR drops, CPM spikes, creative fatigue
- **Admin Dashboard** — Full workspace and user management

## Tech Stack

### Frontend
- **Next.js 15** with App Router
- **TypeScript** strict mode
- **TailwindCSS** + **shadcn/ui**
- **Framer Motion** animations
- **Zustand** state management
- **Recharts** data visualization

### Backend
- **FastAPI** async Python API
- **SQLAlchemy 2.0** async ORM
- **PostgreSQL** database
- **Redis** cache + queues
- **Celery** background workers
- **Alembic** migrations

### AI Providers
- **OpenAI** GPT-4o (ad copy, social posts)
- **Anthropic Claude** (SEO content, email)
- **Google Gemini** (research, analysis)
- **xAI Grok** (trend analysis)

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Python 3.12+ (for local dev)
- Node.js 20+ (for local dev)

### 1. Clone and setup

```bash
git clone https://github.com/your-org/ai-marketing-os
cd ai-marketing-os
make setup
```

### 2. Configure environment

Edit `.env` with your API keys:

```bash
# Required
SECRET_KEY=your-32-char-secret-key

# At least one AI provider
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Start services

```bash
make up
make migrate
```

### 4. Access the app

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Redoc | http://localhost:8000/redoc |

## Architecture

```
ai-marketing-os/
├── frontend/          # Next.js 15 app
│   ├── app/           # App router pages
│   ├── components/    # UI components
│   ├── lib/           # API client, utilities
│   └── store/         # Zustand state
│
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── api/       # Route handlers
│   │   ├── core/      # Config, security, DB
│   │   ├── domain/    # Business entities
│   │   ├── models/    # SQLAlchemy models
│   │   ├── schemas/   # Pydantic schemas
│   │   ├── repositories/  # Data access
│   │   ├── services/  # Business logic
│   │   ├── integrations/  # External APIs
│   │   └── workers/   # Celery tasks
│   └── alembic/       # DB migrations
│
├── docker/            # Docker configs
├── docs/              # Documentation
└── scripts/           # Utility scripts
```

## AI Content Routing

| Content Type | Provider | Reason |
|---|---|---|
| SEO Articles | Claude | Best long-form, nuanced writing |
| Ad Copy | GPT-4o | High-conversion direct response |
| Reel Scripts | GPT-4o | Creative, punchy short-form |
| Social Posts | GPT-4o | Platform-optimized engagement |
| Trend Analysis | Grok | Real-time internet knowledge |
| Research | Gemini | Deep analysis capabilities |

## Development

### Backend development

```bash
cd backend
pip install -r requirements.txt
cp ../.env.example ../.env
uvicorn app.main:app --reload
```

### Frontend development

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

### Database migrations

```bash
# Create migration
make migrate-create

# Apply migrations
make migrate

# Rollback one step
make migrate-down
```

### Running workers locally

```bash
# In separate terminals:
celery -A app.workers.celery_app worker --loglevel=info
celery -A app.workers.celery_app beat --loglevel=info
```

## API Documentation

Full API docs available at http://localhost:8000/docs after starting the server.

### Authentication

```bash
# Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123", "full_name": "John Doe", "workspace_name": "My Company"}'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### Generate Content

```bash
curl -X POST http://localhost:8000/api/v1/content/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content_type": "social_post",
    "platform": "instagram",
    "topic": "Product launch announcement",
    "target_audience": "Young professionals",
    "cta": "Shop now",
    "keywords": ["innovation", "launch", "exclusive"]
  }'
```

## Deployment

### Production with Docker

```bash
ENVIRONMENT=production make up-build
```

### Environment variables for production

```bash
DEBUG=false
ENVIRONMENT=production
SECRET_KEY=<strong-random-key>
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://...
SENTRY_DSN=https://...
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.
