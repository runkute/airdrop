#!/bin/bash
# AI Marketing OS — macOS/Linux Desktop Build Script
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/dist"
BACKEND_DIST="$ROOT/backend-dist"
FRONTEND_DIST="$ROOT/frontend-dist"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   AI Marketing OS — Desktop Build                ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ─── Step 1: Backend ──────────────────────────────────────────────────────────
echo "[1/5] Building Python backend with PyInstaller..."
cd "$ROOT/backend"
pip install -r requirements-desktop.txt --quiet
pyinstaller build.spec --clean --noconfirm --distpath "$ROOT/pyinstaller-dist"

rm -rf "$BACKEND_DIST"
cp -r "$ROOT/pyinstaller-dist/backend-server" "$BACKEND_DIST"
echo "[OK] Backend built: $BACKEND_DIST"

# ─── Step 2: Frontend ─────────────────────────────────────────────────────────
echo ""
echo "[2/5] Building Next.js frontend (static export)..."
cd "$ROOT/frontend"
npm install --silent

# Temporarily enable static export
cat next.config.ts | sed "s/const nextConfig: NextConfig = {/const nextConfig: NextConfig = { output: 'export', trailingSlash: true, images: { unoptimized: true },/" > next.config.desktop.ts
cp next.config.ts next.config.ts.bak
cp next.config.desktop.ts next.config.ts

NEXT_PUBLIC_API_URL="http://127.0.0.1:8765/api/v1" npm run build

# Restore original config
cp next.config.ts.bak next.config.ts
rm -f next.config.desktop.ts next.config.ts.bak

rm -rf "$FRONTEND_DIST"
cp -r out "$FRONTEND_DIST"
echo "[OK] Frontend built: $FRONTEND_DIST"

# ─── Step 3: Electron ─────────────────────────────────────────────────────────
echo ""
echo "[3/5] Installing Electron dependencies..."
cd "$ROOT/electron"
npm install --silent

# Create assets dir and placeholder icon if needed
mkdir -p assets
if [ ! -f "assets/icon.png" ]; then
    echo "[WARN] No icon found. Creating placeholder..."
    # Create a minimal 1x1 PNG
    printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82' > assets/icon.png
fi

# Create NSIS helper
cat > assets/installer.nsh << 'EOF'
!macro customInstall
!macroend
!macro customUnInstall
!macroend
EOF

echo "[OK] Electron ready."

# ─── Step 4: electron-builder ─────────────────────────────────────────────────
echo ""
echo "[4/5] Building with electron-builder..."
cd "$ROOT/electron"

if [[ "$OSTYPE" == "darwin"* ]]; then
    npx electron-builder --mac --config.directories.output="$DIST"
else
    npx electron-builder --linux --config.directories.output="$DIST"
fi

# ─── Step 5: Verify ───────────────────────────────────────────────────────────
echo ""
echo "[5/5] Build output:"
ls -lh "$DIST"/*.{exe,dmg,AppImage} 2>/dev/null || ls -lh "$DIST"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   BUILD COMPLETE!                                ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "Output: $DIST"
