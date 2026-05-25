# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for AI Marketing OS Desktop Backend
#
# Build with:
#   pyinstaller build.spec --clean
#
# Output: dist/backend-server[.exe]

import sys
import os
from pathlib import Path
from PyInstaller.utils.hooks import collect_all, collect_submodules, collect_data_files

block_cipher = None
IS_WIN = sys.platform == "win32"
IS_MAC = sys.platform == "darwin"
EXE_NAME = "backend-server"

# ─── Collect packages ─────────────────────────────────────────────────────────
# Each collect_all returns (datas, binaries, hiddenimports)

datas_total = []
binaries_total = []
hidden_imports_total = []

for pkg in ["fastapi", "uvicorn", "sqlalchemy", "pydantic", "pydantic_settings", "aiosqlite"]:
    d, b, h = collect_all(pkg)
    datas_total += d
    binaries_total += b
    hidden_imports_total += h

# Copy app source into bundle
datas_total += [
    ("app", "app"),
    ("alembic", "alembic"),
    ("alembic.ini", "."),
]

# ─── Hidden imports ───────────────────────────────────────────────────────────
hidden_imports_total += [
    # Uvicorn internals
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.loops.asyncio",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    # SQLAlchemy async
    "sqlalchemy.ext.asyncio",
    "sqlalchemy.dialects.sqlite",
    "sqlalchemy.dialects.sqlite.aiosqlite",
    "aiosqlite",
    # APScheduler
    "apscheduler",
    "apscheduler.schedulers.asyncio",
    "apscheduler.triggers.interval",
    "apscheduler.triggers.cron",
    # Crypto
    "jose",
    "jose.jwt",
    "passlib",
    "passlib.handlers.bcrypt",
    "cryptography",
    # AI SDKs
    "openai",
    "anthropic",
    "google.generativeai",
    # HTTP
    "httpx",
    "anyio",
    "anyio.abc",
    "anyio._backends._asyncio",
    # Email validation
    "email_validator",
    # Structlog
    "structlog",
    # App modules
    "app",
    "app.main_desktop",
    "app.core",
    "app.core.config",
    "app.core.security",
    "app.core.database",
    "app.core.logging",
    "app.core.exceptions",
    "app.core.middleware",
    "app.core.dependencies",
    "app.models",
    "app.schemas",
    "app.repositories",
    "app.services",
    "app.api",
    "app.api.v1",
    "app.api.v1.router",
    "app.integrations",
    "app.integrations.ai",
    "app.integrations.ai.gateway",
]

# ─── Analysis ─────────────────────────────────────────────────────────────────
a = Analysis(
    ["backend_entry.py"],
    pathex=["."],
    binaries=binaries_total,
    datas=datas_total,
    hiddenimports=hidden_imports_total,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "tkinter",
        "matplotlib",
        "numpy",
        "pandas",
        "PIL",
        "pytest",
        "asyncpg",
        "celery",
        "redis",
        "psycopg2",
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# ─── PYZ ──────────────────────────────────────────────────────────────────────
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# ─── EXE ──────────────────────────────────────────────────────────────────────
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name=EXE_NAME,
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    console=False if IS_WIN else True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon="assets/icon.ico" if IS_WIN else None,
)

# ─── COLLECT ──────────────────────────────────────────────────────────────────
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name=EXE_NAME,
)
