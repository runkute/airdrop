# Desktop Build Guide — Windows .exe

Build AI Marketing OS as a standalone Windows installer (`.exe`) using **Electron + PyInstaller**.

## Architecture

```
AI-Marketing-OS-Setup.exe
├── Electron shell          ← chromium renderer (Next.js UI)
├── backend-server.exe      ← FastAPI + SQLite (PyInstaller)
│   ├── SQLite database     ← stored in %APPDATA%\AI Marketing OS\data\
│   └── APScheduler         ← replaces Redis + Celery
└── frontend/               ← Next.js static export (HTML/JS/CSS)
```

**Key differences vs web/Docker version:**

| Feature | Web (Docker) | Desktop (.exe) |
|---|---|---|
| Database | PostgreSQL | SQLite (embedded) |
| Queue | Redis + Celery | APScheduler (in-process) |
| Backend port | 8000 | 8765 (local only) |
| Frontend | Next.js server | Static export |
| Config | `.env` file | `%APPDATA%\AI Marketing OS\config.json` |
| Logs | Docker logs | `%APPDATA%\AI Marketing OS\logs\` |

---

## Prerequisites

Install on the **build machine** (Windows):

```
Python 3.12+     → https://python.org/downloads
Node.js 20+      → https://nodejs.org
Git              → https://git-scm.com
```

Verify:
```cmd
python --version   # Python 3.12.x
node --version     # v20.x.x
npm --version      # 10.x.x
```

---

## Quick Build (Windows)

```cmd
cd ai-marketing-os
scripts\build-windows.bat
```

This script automatically:
1. Installs Python desktop dependencies
2. Bundles FastAPI + SQLite with PyInstaller → `backend-dist\`
3. Builds Next.js as static export → `frontend-dist\`
4. Packages Electron → `dist\AI Marketing OS Setup.exe`

Output: `dist\` folder with:
- `AI Marketing OS Setup 1.0.0.exe` — NSIS installer (~150-250MB)
- `AI Marketing OS 1.0.0 Portable.exe` — No-install portable version

---

## Manual Step-by-Step Build

### Step 1 — Build Python backend

```cmd
cd backend
pip install -r requirements-desktop.txt
pyinstaller build.spec --clean --noconfirm --distpath ..\pyinstaller-dist
xcopy /e pyinstaller-dist\backend-server ..\backend-dist\
```

### Step 2 — Build Next.js frontend

```cmd
cd frontend
npm install

rem Temporarily enable static export
set NEXT_PUBLIC_API_URL=http://127.0.0.1:8765/api/v1
npm run build
xcopy /e out ..\frontend-dist\
```

> **Note:** For static export, ensure `next.config.ts` has `output: 'export'` or use the build script which patches it automatically.

### Step 3 — Package with Electron

```cmd
cd electron
npm install
npx electron-builder --win --x64 --config.directories.output=..\dist
```

---

## Development Mode

Run the desktop app locally without building:

```cmd
rem Terminal 1 — Start backend
cd backend
set BACKEND_PORT=8765
set DATABASE_URL=sqlite+aiosqlite:///./aimarketingos-dev.db
uvicorn app.main_desktop:app --host 127.0.0.1 --port 8765 --reload

rem Terminal 2 — Start frontend
cd frontend
set NEXT_PUBLIC_API_URL=http://127.0.0.1:8765/api/v1
npm run dev

rem Terminal 3 — Start Electron
cd electron
set NODE_ENV=development
npx electron .
```

Or using Make:
```bash
make desktop-install   # Install all dependencies
make desktop-dev       # Run in development mode
```

---

## User Data Locations

After installation, user data is stored in:

| Type | Location |
|---|---|
| Database | `%APPDATA%\AI Marketing OS\data\aimarketingos.db` |
| Config / API keys | `%APPDATA%\AI Marketing OS\config.json` |
| Backend logs | `%APPDATA%\AI Marketing OS\logs\backend.log` |
| Main process logs | `%APPDATA%\AI Marketing OS\logs\main.log` |

Access from within the app: **Settings → Open Data Folder**

---

## Configuring API Keys

API keys are stored in `%APPDATA%\AI Marketing OS\config.json`:

```json
{
  "OPENAI_API_KEY": "sk-...",
  "ANTHROPIC_API_KEY": "sk-ant-...",
  "GOOGLE_API_KEY": "AIza...",
  "GROK_API_KEY": "xai-...",
  "SECRET_KEY": "auto-generated-on-first-run"
}
```

Users can set these from **Settings → AI Providers** in the app UI, or by editing the JSON file directly.

---

## Installer Features (NSIS)

- ✅ Custom install directory selector
- ✅ Desktop shortcut
- ✅ Start menu shortcut
- ✅ Adds Windows Firewall exception for port 8765
- ✅ Uninstaller keeps user data (database) by default
- ✅ Portable `.exe` version (no install needed)

---

## Troubleshooting

**App shows loading screen but never opens:**
- Check: `%APPDATA%\AI Marketing OS\logs\backend.log`
- Common causes: missing DLL, antivirus blocking backend-server.exe
- Fix: Whitelist `backend-server.exe` in antivirus

**"Backend Error" dialog on startup:**
- Port 8765 may be in use: `netstat -ano | findstr 8765`
- Python runtime may be missing (check PyInstaller --onefile vs --onedir)

**API keys not saving:**
- Check write permissions: `%APPDATA%\AI Marketing OS\`
- Edit `config.json` directly as fallback

**Build fails at PyInstaller:**
- Ensure Python 3.12 (not 3.13) for best compatibility
- Run: `pip install pyinstaller --upgrade`
- Try: `pyinstaller build.spec --clean --log-level=DEBUG`

**Build fails at electron-builder:**
- Install Windows SDK if NSIS errors occur
- Or skip NSIS: modify `electron/package.json` to use `"target": "portable"` only

---

## CI/CD (GitHub Actions)

```yaml
# .github/workflows/build-desktop.yml
name: Build Desktop

on:
  push:
    tags: ['v*']

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Build
        run: scripts\build-windows.bat
      - name: Upload
        uses: actions/upload-artifact@v4
        with:
          name: windows-installer
          path: dist/*.exe
```
