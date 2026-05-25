from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    ads,
    alerts,
    auth,
    brand_voice,
    content,
    health,
    publishing,
    workspaces,
)

api_router = APIRouter()

# Authentication
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Workspace management
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["Workspaces"])

# Brand Voices (nested under workspace)
api_router.include_router(
    brand_voice.router,
    prefix="/workspaces/{workspace_id}/brand-voices",
    tags=["Brand Voice"],
)

# Content Studio
api_router.include_router(content.router, prefix="/content", tags=["Content Studio"])

# Publishing
api_router.include_router(
    publishing.router,
    prefix="/workspaces/{workspace_id}/publishing",
    tags=["Publishing"],
)

# Ads Monitoring
api_router.include_router(
    ads.router,
    prefix="/workspaces/{workspace_id}/ads",
    tags=["Ads Monitoring"],
)

# AI Alerts
api_router.include_router(
    alerts.router,
    prefix="/workspaces/{workspace_id}/alerts",
    tags=["AI Alerts"],
)

# Admin
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])

# Health
api_router.include_router(health.router, prefix="/health", tags=["Health"])
