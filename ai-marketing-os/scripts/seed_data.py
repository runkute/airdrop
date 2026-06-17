#!/usr/bin/env python3
"""Seed the database with sample data for development."""
import asyncio
import sys
sys.path.insert(0, ".")

from app.core.database import AsyncSessionLocal
from app.repositories.user_repository import UserRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.repositories.brand_voice_repository import BrandVoiceRepository


async def seed():
    async with AsyncSessionLocal() as db:
        user_repo = UserRepository(db)
        workspace_repo = WorkspaceRepository(db)
        brand_voice_repo = BrandVoiceRepository(db)

        # Create admin user
        print("Creating admin user...")
        user = await user_repo.create_user(
            email="admin@aimarketingos.com",
            password="Admin123!",
            full_name="Admin User",
            is_superuser=True,
        )
        print(f"Created user: {user.email}")

        # Create workspace
        print("Creating workspace...")
        workspace = await workspace_repo.create_workspace(
            name="Demo Company",
            slug="demo-company",
            user_id=user.id,
        )
        print(f"Created workspace: {workspace.name}")

        # Create brand voices
        print("Creating brand voices...")
        voices = [
            {
                "name": "Professional Corporate",
                "tone": "professional",
                "writing_style": "concise",
                "cta_style": "Learn More",
                "forbidden_words": ["cheap", "discount", "free"],
                "emotional_positioning": "Trust and reliability",
                "keyword_preferences": ["innovation", "enterprise", "solutions"],
                "is_default": True,
            },
            {
                "name": "Playful & Engaging",
                "tone": "playful",
                "writing_style": "conversational",
                "cta_style": "Join the fun!",
                "forbidden_words": ["corporate", "synergy", "leverage"],
                "emotional_positioning": "Fun and community",
                "keyword_preferences": ["awesome", "community", "together"],
                "is_default": False,
            },
            {
                "name": "Bold & Direct",
                "tone": "authoritative",
                "writing_style": "direct",
                "cta_style": "Get Started Now",
                "forbidden_words": ["maybe", "perhaps", "consider", "might"],
                "emotional_positioning": "Confidence and results",
                "keyword_preferences": ["proven", "results", "guaranteed", "fast"],
                "is_default": False,
            },
        ]
        for voice_data in voices:
            voice = await brand_voice_repo.create_voice(
                workspace_id=workspace.id, **voice_data
            )
            print(f"Created brand voice: {voice.name}")

        await db.commit()
        print("\nSeeding complete!")
        print("\nLogin credentials:")
        print("  Email: admin@aimarketingos.com")
        print("  Password: Admin123!")
        print(f"\nWorkspace: {workspace.name} (slug: {workspace.slug})")


if __name__ == "__main__":
    asyncio.run(seed())
