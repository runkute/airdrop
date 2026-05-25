# AI Marketing OS - API Documentation

Base URL: `http://localhost:8000/api/v1`

Interactive docs: `http://localhost:8000/docs` (Swagger UI)
Alternative docs: `http://localhost:8000/redoc` (ReDoc)

All protected endpoints require the header:
```
Authorization: Bearer <access_token>
```

---

## Authentication

### Register a new account

```
POST /auth/register
```

Creates a user account and a workspace in a single request.

**Request body:**
```json
{
  "email": "jane@company.com",
  "password": "StrongPassword123!",
  "full_name": "Jane Smith",
  "workspace_name": "Acme Corp"
}
```

**Response 201:**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "jane@company.com",
    "full_name": "Jane Smith",
    "is_active": true,
    "created_at": "2025-01-15T10:30:00Z"
  },
  "workspace": {
    "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "name": "Acme Corp",
    "slug": "acme-corp"
  },
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "token_type": "bearer"
}
```

---

### Login

```
POST /auth/login
```

**Request body:**
```json
{
  "email": "jane@company.com",
  "password": "StrongPassword123!"
}
```

**Response 200:**
```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

---

### Refresh token

```
POST /auth/refresh
```

**Request body:**
```json
{
  "refresh_token": "eyJhbGci..."
}
```

**Response 200:**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

---

### Get current user

```
GET /auth/me
```

**Response 200:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "jane@company.com",
  "full_name": "Jane Smith",
  "is_active": true,
  "workspaces": [
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "role": "owner"
    }
  ]
}
```

---

## Content Generation

### Generate content

```
POST /content/generate
```

The `content_type` determines which AI provider and prompt template are used. Optionally specify a `brand_voice_id` to apply your brand's tone and style rules.

**Content types:** `social_post`, `seo_article`, `ad_copy`, `reel_script`, `email`, `hashtags`, `trend_analysis`

**Request body:**
```json
{
  "content_type": "social_post",
  "platform": "instagram",
  "topic": "Summer sale — 40% off all products",
  "target_audience": "Women aged 25-40 interested in fashion",
  "cta": "Shop now — link in bio",
  "keywords": ["summer", "sale", "fashion", "style"],
  "brand_voice_id": "550e8400-e29b-41d4-a716-446655440000",
  "additional_context": "Focus on limited time urgency"
}
```

**Response 200:**
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "content_type": "social_post",
  "platform": "instagram",
  "provider": "openai",
  "model": "gpt-4o",
  "result": {
    "headline": "Summer just got a whole lot sweeter.",
    "body": "40% off everything — yes, EVERYTHING — ends Sunday.\n\nWhether you've been eyeing that floral midi or the perfect white blazer, now's your moment. Stock is limited and moving fast.\n\nYour dream wardrobe is one tap away.",
    "cta": "Shop now — link in bio",
    "hashtags": ["#SummerSale", "#FashionDeals", "#StyleSale", "#OOTD", "#LimitedTime"]
  },
  "prompt_tokens": 342,
  "completion_tokens": 118,
  "status": "draft",
  "created_at": "2025-01-15T10:30:00Z"
}
```

---

### Generate SEO article

```
POST /content/generate
```

**Request body:**
```json
{
  "content_type": "seo_article",
  "topic": "Best email marketing strategies for e-commerce in 2025",
  "target_audience": "E-commerce store owners",
  "keywords": ["email marketing", "e-commerce", "email automation", "conversion rate"],
  "word_count": 1500,
  "brand_voice_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response 200:**
```json
{
  "id": "8d0e7790-8536-51ef-a55c-f18gd2g01bf8",
  "content_type": "seo_article",
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022",
  "result": {
    "title": "9 Email Marketing Strategies That Drive E-commerce Sales in 2025",
    "meta_description": "Discover proven email marketing strategies that top e-commerce brands use to boost conversions, reduce cart abandonment, and build customer loyalty.",
    "outline": ["Introduction", "1. Behavioral segmentation", "..."],
    "body": "# 9 Email Marketing Strategies...\n\n...",
    "word_count": 1487,
    "reading_time_minutes": 6
  },
  "prompt_tokens": 512,
  "completion_tokens": 2103,
  "status": "draft",
  "created_at": "2025-01-15T10:30:00Z"
}
```

---

### Generate ad copy

```
POST /content/generate
```

**Request body:**
```json
{
  "content_type": "ad_copy",
  "platform": "facebook",
  "topic": "SaaS project management tool launch",
  "target_audience": "Startup founders and team leads",
  "cta": "Start free trial",
  "keywords": ["productivity", "team collaboration", "project management"],
  "ad_format": "feed"
}
```

**Response 200:**
```json
{
  "result": {
    "primary_text": "Your team is working hard. But are they working on the right things?\n\nProjectOS gives your team instant clarity on what's done, what's blocked, and what needs attention — without the endless status meetings.\n\n3,000+ startup teams have shipped 40% faster since switching.",
    "headline": "Finally, a PM tool your team will actually use",
    "description": "14-day free trial. No credit card required.",
    "cta_button": "Start Free Trial",
    "variations": [
      {
        "headline": "Ship faster. Meet less.",
        "primary_text": "Status meetings eat 5+ hours a week..."
      }
    ]
  }
}
```

---

### List content history

```
GET /content/history?content_type=social_post&platform=instagram&status=approved&cursor=<id>&limit=20
```

**Query parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `content_type` | string | Filter by type |
| `platform` | string | Filter by platform |
| `status` | string | `draft`, `approved`, `published` |
| `cursor` | UUID | Pagination cursor (last item ID) |
| `limit` | integer | Items per page (default: 20, max: 100) |

**Response 200:**
```json
{
  "items": [...],
  "next_cursor": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "has_more": true,
  "total": 143
}
```

---

### Update content status

```
PATCH /content/{content_id}
```

**Request body:**
```json
{
  "status": "approved"
}
```

---

## Brand Voice

### List brand voices

```
GET /brand-voices
```

**Response 200:**
```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Professional Corporate",
      "tone": "professional",
      "writing_style": "concise",
      "cta_style": "Learn More",
      "forbidden_words": ["cheap", "discount"],
      "emotional_positioning": "Trust and reliability",
      "keyword_preferences": ["innovation", "enterprise"],
      "is_default": true,
      "created_at": "2025-01-10T09:00:00Z"
    }
  ]
}
```

---

### Create brand voice

```
POST /brand-voices
```

**Request body:**
```json
{
  "name": "Playful & Engaging",
  "tone": "playful",
  "writing_style": "conversational",
  "cta_style": "Join the fun!",
  "forbidden_words": ["corporate", "synergy", "leverage"],
  "emotional_positioning": "Fun and inclusive community",
  "keyword_preferences": ["awesome", "community", "together"],
  "is_default": false
}
```

**Response 201:**
```json
{
  "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "name": "Playful & Engaging",
  ...
}
```

---

### Update brand voice

```
PUT /brand-voices/{voice_id}
```

**Request body:** Same as create (all fields optional).

---

### Delete brand voice

```
DELETE /brand-voices/{voice_id}
```

**Response 204:** No content.

---

## Publishing

### Connect a publishing account

```
POST /publishing/accounts
```

**Request body (Facebook/Instagram):**
```json
{
  "platform": "facebook",
  "account_name": "Acme Corp Official",
  "account_id": "123456789",
  "credentials": {
    "access_token": "EAABsbCS...",
    "page_id": "123456789"
  }
}
```

**Request body (WordPress):**
```json
{
  "platform": "wordpress",
  "account_name": "Company Blog",
  "account_id": "https://blog.company.com",
  "credentials": {
    "url": "https://blog.company.com",
    "username": "api_user",
    "application_password": "xxxx xxxx xxxx xxxx xxxx xxxx"
  }
}
```

**Response 201:**
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "platform": "facebook",
  "account_name": "Acme Corp Official",
  "is_active": true,
  "created_at": "2025-01-15T10:30:00Z"
}
```

---

### Schedule a post

```
POST /publishing/schedule
```

**Request body:**
```json
{
  "content_id": "550e8400-e29b-41d4-a716-446655440000",
  "platform_account_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "scheduled_for": "2025-01-20T14:00:00Z"
}
```

**Response 201:**
```json
{
  "id": "8d0e7790-8536-51ef-a55c-f18gd2g01bf8",
  "content_id": "550e8400-e29b-41d4-a716-446655440000",
  "platform": "instagram",
  "account_name": "Acme Corp Official",
  "scheduled_for": "2025-01-20T14:00:00Z",
  "status": "pending"
}
```

---

### Publish immediately

```
POST /publishing/publish-now
```

**Request body:**
```json
{
  "content_id": "550e8400-e29b-41d4-a716-446655440000",
  "platform_account_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```

**Response 200:**
```json
{
  "id": "8d0e7790-8536-51ef-a55c-f18gd2g01bf8",
  "status": "published",
  "platform_post_id": "17841405822304885",
  "published_at": "2025-01-15T10:30:00Z",
  "platform_url": "https://www.instagram.com/p/ABC123/"
}
```

---

### List scheduled posts

```
GET /publishing/posts?status=pending&platform=instagram
```

---

### Cancel a scheduled post

```
DELETE /publishing/posts/{post_id}
```

---

## Ads Monitoring

### Connect an ads account

```
POST /ads/accounts
```

**Request body (Meta Ads):**
```json
{
  "platform": "meta",
  "account_name": "Acme Corp Ads",
  "account_id": "act_123456789",
  "credentials": {
    "access_token": "EAABsbCS...",
    "app_id": "1234567890",
    "app_secret": "abc123def456"
  }
}
```

---

### Sync ads metrics

```
POST /ads/accounts/{account_id}/sync
```

Triggers a background sync for the specified account. Returns a task ID.

**Response 202:**
```json
{
  "task_id": "c2ce0fba-4f2c-4a23-b0e2-c9a0d8f52c1f",
  "status": "pending",
  "message": "Sync started. Results available in 30-60 seconds."
}
```

---

### Get campaign metrics

```
GET /ads/metrics?account_id=<id>&date_from=2025-01-01&date_to=2025-01-15&group_by=campaign
```

**Query parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `account_id` | UUID | Filter by account |
| `date_from` | date | Start date (YYYY-MM-DD) |
| `date_to` | date | End date (YYYY-MM-DD) |
| `group_by` | string | `campaign`, `adset`, `ad`, `day` |
| `platform` | string | `meta`, `google`, `tiktok` |

**Response 200:**
```json
{
  "items": [
    {
      "campaign_id": "23851234567890",
      "campaign_name": "Summer Sale - Prospecting",
      "impressions": 145230,
      "clicks": 3104,
      "spend": 892.50,
      "conversions": 87,
      "ctr": 0.02137,
      "cpm": 6.14,
      "cpa": 10.26,
      "roas": 4.2
    }
  ],
  "totals": {
    "impressions": 145230,
    "clicks": 3104,
    "spend": 892.50,
    "conversions": 87
  },
  "date_range": {
    "from": "2025-01-01",
    "to": "2025-01-15"
  }
}
```

---

## Alert Management

### List alert rules

```
GET /alerts/rules
```

---

### Create alert rule

```
POST /alerts/rules
```

**Request body:**
```json
{
  "name": "CTR Drop Alert",
  "alert_type": "ctr_drop",
  "threshold": 20.0,
  "comparison": "change_percent",
  "time_window": 24,
  "is_active": true
}
```

Alert types:
- `ctr_drop` — CTR falls below threshold or drops by percentage
- `cpm_spike` — CPM rises above threshold or increases by percentage
- `creative_fatigue` — CTR declining trend over N days
- `spend_limit` — Daily/total spend exceeds limit
- `roas_drop` — ROAS falls below minimum threshold

---

### List active alerts

```
GET /alerts?is_resolved=false&severity=critical
```

**Response 200:**
```json
{
  "items": [
    {
      "id": "9e107d9d-372b-5d42-a116-557fd7a8b2e4",
      "severity": "critical",
      "title": "CTR dropped 35% in the last 24 hours",
      "message": "Campaign 'Summer Sale - Prospecting' CTR fell from 2.8% to 1.8% in the last 24 hours. This may indicate audience fatigue or creative burnout.",
      "metadata": {
        "campaign_id": "23851234567890",
        "campaign_name": "Summer Sale - Prospecting",
        "previous_ctr": 0.028,
        "current_ctr": 0.018,
        "change_percent": -35.7
      },
      "is_resolved": false,
      "created_at": "2025-01-15T08:00:00Z"
    }
  ]
}
```

---

### Resolve an alert

```
POST /alerts/{alert_id}/resolve
```

**Response 200:**
```json
{
  "id": "9e107d9d-372b-5d42-a116-557fd7a8b2e4",
  "is_resolved": true,
  "resolved_by": "550e8400-e29b-41d4-a716-446655440000",
  "resolved_at": "2025-01-15T09:15:00Z"
}
```

---

## Workspace Management

### Get workspace details

```
GET /workspaces/{workspace_id}
```

---

### Update workspace

```
PUT /workspaces/{workspace_id}
```

**Request body:**
```json
{
  "name": "Acme Corp Marketing"
}
```

---

### List workspace members

```
GET /workspaces/{workspace_id}/members
```

---

### Invite a member

```
POST /workspaces/{workspace_id}/members/invite
```

**Request body:**
```json
{
  "email": "teammate@company.com",
  "role": "member"
}
```

Roles: `admin`, `member`, `viewer`

---

### Remove a member

```
DELETE /workspaces/{workspace_id}/members/{user_id}
```

---

## Error Responses

All errors follow RFC 7807 Problem Details:

```json
{
  "type": "https://aimarketingos.com/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "content_type must be one of: social_post, seo_article, ad_copy, reel_script, email, hashtags, trend_analysis",
  "instance": "/api/v1/content/generate"
}
```

Common status codes:
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (async task started) |
| 204 | No Content (successful delete) |
| 400 | Bad Request |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 422 | Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 503 | Service Unavailable (AI provider down) |
