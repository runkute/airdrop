# AI Marketing OS - Architecture Documentation

## System Overview

AI Marketing OS follows a clean, layered architecture designed for scalability, testability, and maintainability. The system is composed of a Next.js frontend, a FastAPI async backend, PostgreSQL for persistence, Redis for caching and task brokering, and Celery for background job processing.

```
                         ┌─────────────────────────────────────────┐
                         │              CLIENTS                     │
                         │   Browser / Mobile / API Consumers       │
                         └─────────────────┬───────────────────────┘
                                           │ HTTPS
                         ┌─────────────────▼───────────────────────┐
                         │           NGINX (Reverse Proxy)          │
                         │   TLS Termination · Rate Limiting        │
                         │   Static Assets · Load Balancing         │
                         └──────────┬────────────────┬─────────────┘
                                    │                │
               ┌────────────────────▼──┐    ┌────────▼──────────────────┐
               │   Next.js 15 Frontend  │    │    FastAPI Backend         │
               │   App Router (SSR/CSR) │    │    Async Python 3.12       │
               │   TailwindCSS + shadcn │    │    SQLAlchemy 2.0 ORM      │
               │   Zustand + Recharts   │    │    Pydantic v2 Schemas     │
               └────────────────────┬──┘    └─────────┬─────────────────┘
                                    │                  │
                                    │         ┌────────▼─────────────────┐
                                    │         │       Service Layer        │
                                    │         │  ContentService           │
                                    │         │  BrandVoiceService        │
                                    │         │  PublishingService        │
                                    │         │  AdsMonitoringService     │
                                    │         │  AlertService             │
                                    │         └────────┬─────────────────┘
                                    │                  │
                         ┌──────────▼──────────────────▼──────────────┐
                         │              DATA LAYER                      │
                         │  ┌──────────────────┐  ┌──────────────────┐ │
                         │  │    PostgreSQL 16   │  │    Redis 7        │ │
                         │  │  Primary storage   │  │  Cache + Queues  │ │
                         │  │  ACID transactions │  │  Session store   │ │
                         │  │  Full-text search  │  │  Rate limiting   │ │
                         │  └──────────────────┘  └──────────────────┘ │
                         └─────────────────────────────────────────────┘
                                           │
                         ┌─────────────────▼───────────────────────────┐
                         │           CELERY WORKER POOL                  │
                         │  ┌─────────────────┐  ┌──────────────────┐  │
                         │  │  celery_worker   │  │   celery_beat    │  │
                         │  │  (4 concurrency) │  │  (cron scheduler)│  │
                         │  └─────────────────┘  └──────────────────┘  │
                         └─────────────────────────────────────────────┘
                                           │
                         ┌─────────────────▼───────────────────────────┐
                         │          EXTERNAL INTEGRATIONS               │
                         │  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────┐ │
                         │  │OpenAI  │ │Claude  │ │Gemini  │ │ Grok │ │
                         │  └────────┘ └────────┘ └────────┘ └──────┘ │
                         │  ┌────────┐ ┌────────┐ ┌────────┐          │
                         │  │  Meta  │ │Google  │ │TikTok  │          │
                         │  │  Ads   │ │  Ads   │ │  Ads   │          │
                         │  └────────┘ └────────┘ └────────┘          │
                         │  ┌────────┐ ┌────────────────────┐         │
                         │  │  Meta  │ │     WordPress      │         │
                         │  │ Graph  │ │    REST API         │         │
                         │  └────────┘ └────────────────────┘         │
                         └─────────────────────────────────────────────┘
```

---

## Clean Architecture Layers

The backend is structured around Clean Architecture principles to enforce separation of concerns and make the codebase testable without external dependencies.

### Layer 1 — Domain (innermost)

Located in `backend/app/domain/`. Contains pure Python business entities with no framework dependencies.

```
domain/
├── entities/
│   ├── content.py        # Content, ContentType, Platform enums
│   ├── brand_voice.py    # BrandVoice, Tone, WritingStyle
│   ├── workspace.py      # Workspace, WorkspaceMember, Role
│   ├── user.py           # User, UserRole
│   ├── campaign.py       # AdCampaign, AdSet, Ad, AdMetrics
│   └── alert.py          # Alert, AlertType, AlertSeverity
└── exceptions/
    ├── content.py        # ContentGenerationError, ProviderUnavailableError
    ├── auth.py           # AuthenticationError, PermissionDeniedError
    └── publishing.py     # PublishingError, PlatformAPIError
```

### Layer 2 — Repositories (data access interface)

Located in `backend/app/repositories/`. Defines abstract repository interfaces. Concrete implementations use SQLAlchemy.

```
repositories/
├── base.py                        # Generic CRUD base repository
├── user_repository.py             # UserRepository with auth methods
├── workspace_repository.py        # WorkspaceRepository + member management
├── brand_voice_repository.py      # BrandVoiceRepository
├── content_repository.py          # ContentRepository with filtering
├── publishing_repository.py       # ScheduledPost, PublishedPost
├── ads_account_repository.py      # AdsAccount + credentials
└── alert_repository.py            # Alert + notification tracking
```

### Layer 3 — Services (business logic)

Located in `backend/app/services/`. Orchestrates domain logic, calls repositories, and coordinates integrations.

```
services/
├── content_generation_service.py  # AI routing + prompt engineering
├── brand_voice_service.py         # Voice application + validation
├── publishing_service.py          # Schedule + publish to platforms
├── ads_monitoring_service.py      # Fetch + normalize ads data
├── alert_service.py               # Alert evaluation + notification
├── auth_service.py                # JWT, registration, password reset
└── workspace_service.py           # Workspace management + billing
```

### Layer 4 — API (outermost)

Located in `backend/app/api/`. FastAPI route handlers that parse HTTP requests, call services, and return JSON responses.

```
api/
└── v1/
    ├── auth.py           # /auth/register, /auth/login, /auth/refresh
    ├── content.py        # /content/generate, /content/history
    ├── brand_voice.py    # CRUD /brand-voices
    ├── publishing.py     # /publishing/schedule, /publishing/posts
    ├── ads.py            # /ads/accounts, /ads/metrics
    ├── alerts.py         # /alerts, /alerts/{id}/resolve
    ├── workspaces.py     # /workspaces, /workspaces/members
    └── admin.py          # /admin/users, /admin/workspaces
```

---

## Database Schema

The database schema is organized around the multi-tenant workspace model. All content and configuration is scoped to a `workspace_id`.

### Core Tables

```
users
├── id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
├── email           VARCHAR(255) UNIQUE NOT NULL
├── hashed_password VARCHAR(255) NOT NULL
├── full_name       VARCHAR(255)
├── is_active       BOOLEAN DEFAULT TRUE
├── is_superuser    BOOLEAN DEFAULT FALSE
├── created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
└── updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()

workspaces
├── id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
├── name            VARCHAR(255) NOT NULL
├── slug            VARCHAR(255) UNIQUE NOT NULL
├── owner_id        UUID REFERENCES users(id)
├── plan            VARCHAR(50) DEFAULT 'free'
├── created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
└── updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()

workspace_members
├── id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
├── workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE
├── user_id         UUID REFERENCES users(id) ON DELETE CASCADE
├── role            VARCHAR(50) DEFAULT 'member'  -- owner, admin, member, viewer
└── created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### Content Tables

```
brand_voices
├── id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4()
├── workspace_id         UUID REFERENCES workspaces(id) ON DELETE CASCADE
├── name                 VARCHAR(255) NOT NULL
├── tone                 VARCHAR(100)       -- professional, playful, authoritative
├── writing_style        VARCHAR(100)       -- concise, conversational, technical
├── cta_style            VARCHAR(255)       -- "Learn More", "Get Started"
├── forbidden_words      TEXT[]             -- words AI should never use
├── emotional_positioning TEXT
├── keyword_preferences  TEXT[]
├── is_default           BOOLEAN DEFAULT FALSE
├── created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
└── updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()

generated_content
├── id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
├── workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE
├── brand_voice_id  UUID REFERENCES brand_voices(id)
├── content_type    VARCHAR(100)   -- social_post, seo_article, ad_copy, reel_script
├── platform        VARCHAR(100)   -- instagram, facebook, twitter, linkedin
├── provider        VARCHAR(100)   -- openai, anthropic, google, grok
├── model           VARCHAR(100)
├── prompt_tokens   INTEGER
├── completion_tokens INTEGER
├── topic           TEXT NOT NULL
├── result          JSONB          -- structured output: headline, body, hashtags
├── status          VARCHAR(50) DEFAULT 'draft'  -- draft, approved, published
├── created_by      UUID REFERENCES users(id)
├── created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
└── updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### Publishing Tables

```
scheduled_posts
├── id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
├── workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE
├── content_id      UUID REFERENCES generated_content(id)
├── platform        VARCHAR(100)
├── platform_account_id VARCHAR(255)  -- the page/profile ID on that platform
├── scheduled_for   TIMESTAMP WITH TIME ZONE NOT NULL
├── status          VARCHAR(50) DEFAULT 'pending'  -- pending, published, failed, cancelled
├── platform_post_id VARCHAR(255)     -- ID returned by platform after publish
├── error_message   TEXT
├── published_at    TIMESTAMP WITH TIME ZONE
├── created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
└── updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()

publishing_accounts
├── id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
├── workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE
├── platform        VARCHAR(100)   -- facebook, instagram, wordpress
├── account_name    VARCHAR(255)
├── account_id      VARCHAR(255)   -- platform-specific page/profile ID
├── credentials_enc TEXT           -- Fernet-encrypted JSON credentials
├── is_active       BOOLEAN DEFAULT TRUE
├── created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
└── updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### Ads Monitoring Tables

```
ads_accounts
├── id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
├── workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE
├── platform        VARCHAR(100)   -- meta, google, tiktok
├── account_name    VARCHAR(255)
├── account_id      VARCHAR(255)
├── credentials_enc TEXT
├── is_active       BOOLEAN DEFAULT TRUE
├── last_sync_at    TIMESTAMP WITH TIME ZONE
├── created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
└── updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()

ads_metrics_snapshots
├── id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
├── ads_account_id  UUID REFERENCES ads_accounts(id) ON DELETE CASCADE
├── campaign_id     VARCHAR(255)
├── campaign_name   VARCHAR(500)
├── adset_id        VARCHAR(255)
├── ad_id           VARCHAR(255)
├── date            DATE NOT NULL
├── impressions     BIGINT DEFAULT 0
├── clicks          BIGINT DEFAULT 0
├── spend           NUMERIC(12,4) DEFAULT 0
├── conversions     INTEGER DEFAULT 0
├── ctr             NUMERIC(8,6)   -- computed: clicks/impressions
├── cpm             NUMERIC(10,4)  -- computed: (spend/impressions)*1000
├── cpa             NUMERIC(10,4)  -- computed: spend/conversions
├── roas            NUMERIC(8,4)   -- return on ad spend
└── created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### Alerts Tables

```
alert_rules
├── id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
├── workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE
├── name            VARCHAR(255) NOT NULL
├── alert_type      VARCHAR(100)  -- ctr_drop, cpm_spike, creative_fatigue, spend_limit
├── threshold       NUMERIC(10,4)
├── comparison      VARCHAR(20)   -- above, below, change_percent
├── time_window     INTEGER       -- hours to look back
├── is_active       BOOLEAN DEFAULT TRUE
├── created_by      UUID REFERENCES users(id)
├── created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
└── updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()

alerts
├── id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
├── workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE
├── rule_id         UUID REFERENCES alert_rules(id)
├── severity        VARCHAR(50)   -- info, warning, critical
├── title           VARCHAR(500)
├── message         TEXT
├── metadata        JSONB          -- context: campaign_id, metric values, etc.
├── is_resolved     BOOLEAN DEFAULT FALSE
├── resolved_by     UUID REFERENCES users(id)
├── resolved_at     TIMESTAMP WITH TIME ZONE
└── created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

---

## AI Routing Logic

The `ContentGenerationService` routes each content request to the most appropriate AI provider based on content type, with fallback handling.

```python
AI_ROUTING_TABLE = {
    "seo_article":    ("anthropic", "claude-3-5-sonnet-20241022"),
    "email":          ("anthropic", "claude-3-5-sonnet-20241022"),
    "ad_copy":        ("openai",    "gpt-4o"),
    "reel_script":    ("openai",    "gpt-4o"),
    "social_post":    ("openai",    "gpt-4o"),
    "hashtags":       ("openai",    "gpt-4o"),
    "trend_analysis": ("grok",      "grok-beta"),
    "research":       ("google",    "gemini-1.5-pro"),
    "image_prompt":   ("openai",    "gpt-4o"),
}

FALLBACK_ORDER = ["openai", "anthropic", "google", "grok"]
```

**Routing decisions:**
- Claude: Long-form content requiring nuanced reasoning and factual accuracy (SEO articles, email campaigns)
- GPT-4o: High-volume, conversion-optimized short content (ad copy, social posts)
- Grok: Trend-aware content requiring knowledge of recent events
- Gemini: Research and analysis tasks requiring synthesis of large information sets

---

## API Design Decisions

### Versioning
All endpoints are prefixed with `/api/v1/`. When breaking changes are required, a new `/api/v2/` prefix is introduced while v1 remains active for a defined deprecation window.

### Authentication
JWT Bearer tokens with 30-minute expiry for access tokens and 7-day expiry for refresh tokens. Refresh tokens are stored in Redis with the ability to revoke all sessions per user.

### Multi-tenancy
Every authenticated endpoint extracts `workspace_id` from the JWT claims. Repository queries always filter by `workspace_id` to enforce data isolation between workspaces. Superusers can bypass this filter via the `/admin/` endpoints.

### Error Handling
All errors follow RFC 7807 Problem Details format:
```json
{
  "type": "https://aimarketingos.com/errors/content-generation-failed",
  "title": "Content Generation Failed",
  "status": 422,
  "detail": "The selected AI provider returned an empty response.",
  "instance": "/api/v1/content/generate"
}
```

### Pagination
List endpoints use cursor-based pagination for performance:
```
GET /api/v1/content/history?cursor=<last_id>&limit=20
```

---

## Security Architecture

### Secrets Management
- Application secrets loaded from environment variables only — never hardcoded
- Fernet symmetric encryption for third-party API credentials stored in the database
- Encryption key stored in `ENCRYPTION_KEY` env var, never in DB

### Authentication Flow
```
1. Client sends email + password to POST /api/v1/auth/login
2. Server verifies password with bcrypt (cost factor 12)
3. Server issues signed JWT (HS256) with sub=user_id, workspace_id, role
4. Client stores access token in memory (NOT localStorage)
5. Client stores refresh token in httpOnly secure cookie
6. Access token refreshed transparently before expiry
```

### CORS
CORS origins are strictly controlled via the `CORS_ORIGINS` environment variable. In production, only the exact frontend domain is allowed.

### Rate Limiting
Per-endpoint rate limits enforced via Redis sliding window:
- Auth endpoints: 10 req/min per IP
- Content generation: 60 req/hour per workspace
- Publishing: 100 req/hour per workspace

### Input Validation
All API inputs validated with Pydantic v2 with strict mode enabled. SQL injection is not possible due to exclusive use of SQLAlchemy parameterized queries.

---

## Scalability Considerations

### Horizontal Scaling
The backend is stateless — any number of backend replicas can run behind a load balancer. Session state lives in Redis, not in-process.

### Worker Scaling
Celery workers scale independently. Add workers with:
```bash
docker compose up -d --scale celery_worker=4
```

### Database Connection Pooling
SQLAlchemy async engine uses connection pooling (pool_size=10, max_overflow=20). PgBouncer can be added in front of PostgreSQL for very high connection counts.

### Caching Strategy
- AI-generated content responses cached in Redis for 24h (content is deterministic given same inputs)
- Ads metrics cached for 1h (metrics are refreshed by Celery beat every hour)
- User session data cached for access token lifetime (30 min)

### Queue Architecture
Three separate Redis databases are used:
- `redis/0` — general cache
- `redis/1` — Celery broker (task queue)
- `redis/2` — Celery result backend

High-priority tasks (publishing scheduled posts) use a dedicated `priority` queue to prevent them from being blocked by bulk content generation jobs.
