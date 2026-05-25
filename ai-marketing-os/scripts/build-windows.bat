@echo off
setlocal EnableDelayedExpansion
title AI Marketing OS — Windows Build

:: ============================================================
:: AI MARKETING OS — WINDOWS BUILD SCRIPT
:: ============================================================
:: Prerequisites:
::   - Python 3.12+ in PATH
::   - Node.js 20+ in PATH
::   - npm in PATH
::
:: Output: dist/AI-Marketing-OS-Setup.exe
::         dist/AI-Marketing-OS-Portable.exe
:: ============================================================

set ROOT=%~dp0..
set DIST=%ROOT%\dist
set BACKEND_DIST=%ROOT%\backend-dist
set FRONTEND_DIST=%ROOT%\frontend-dist
set BUILD_LOG=%ROOT%\build.log

echo.
echo ╔══════════════════════════════════════════════════╗
echo ║   AI Marketing OS — Windows Build                ║
echo ║   Building .exe installer...                     ║
echo ╚══════════════════════════════════════════════════╝
echo.

:: Verify prerequisites
call :check_prereq python "Python 3.12+" || exit /b 1
call :check_prereq node "Node.js 20+" || exit /b 1
call :check_prereq npm "npm" || exit /b 1

:: Check Python version
python --version 2>&1 | findstr /C:"3.12" /C:"3.13" > nul
if errorlevel 1 (
    echo [WARN] Python 3.12+ recommended. Continuing with installed version...
)

echo.
echo [STEP 1/5] Building Python backend with PyInstaller...
echo ─────────────────────────────────────────────────────
cd /d "%ROOT%\backend"

:: Install desktop requirements
echo Installing backend dependencies...
pip install -r requirements-desktop.txt --quiet
if errorlevel 1 (
    echo [ERROR] Failed to install backend dependencies.
    pause & exit /b 1
)

:: Run PyInstaller
echo Running PyInstaller...
pyinstaller build.spec --clean --noconfirm --distpath "%ROOT%\pyinstaller-dist" 2>&1
if errorlevel 1 (
    echo [ERROR] PyInstaller build failed. Check output above.
    pause & exit /b 1
)

:: Copy backend output
echo Copying backend artifacts...
if exist "%BACKEND_DIST%" rmdir /s /q "%BACKEND_DIST%"
mkdir "%BACKEND_DIST%"
xcopy /e /i /q "%ROOT%\pyinstaller-dist\backend-server\*" "%BACKEND_DIST%\"
echo [OK] Backend built successfully.

echo.
echo [STEP 2/5] Building Next.js frontend (static export)...
echo ──────────────────────────────────────────────────────
cd /d "%ROOT%\frontend"

:: Install frontend dependencies
echo Installing frontend dependencies...
call npm install --silent
if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause & exit /b 1
)

:: Set environment for static export
set NEXT_PUBLIC_API_URL=http://127.0.0.1:8765/api/v1
set NEXT_PUBLIC_APP_URL=app://.

:: Patch next.config for static export
echo Patching next.config for static export...
node -e "
const fs = require('fs');
const cfg = fs.readFileSync('next.config.ts', 'utf8');
if (!cfg.includes(\"output: 'export'\")) {
    const patched = cfg.replace(
        'const nextConfig: NextConfig = {',
        'const nextConfig: NextConfig = { output: \"export\", trailingSlash: true, images: { unoptimized: true },'
    );
    fs.writeFileSync('next.config.desktop.ts', patched);
    console.log('Created next.config.desktop.ts');
} else {
    fs.copyFileSync('next.config.ts', 'next.config.desktop.ts');
    console.log('Config already has static export');
}
"

:: Build with static config
copy /y next.config.desktop.ts next.config.ts.bak > nul
copy /y next.config.desktop.ts next.config.ts > nul
call npm run build
if errorlevel 1 (
    copy /y next.config.ts.bak next.config.ts > nul
    echo [ERROR] Next.js build failed.
    pause & exit /b 1
)
copy /y next.config.ts.bak next.config.ts > nul

:: Copy frontend output
echo Copying frontend artifacts...
if exist "%FRONTEND_DIST%" rmdir /s /q "%FRONTEND_DIST%"
mkdir "%FRONTEND_DIST%"
xcopy /e /i /q "out\*" "%FRONTEND_DIST%\"
echo [OK] Frontend built successfully.

echo.
echo [STEP 3/5] Setting up Electron...
echo ──────────────────────────────────
cd /d "%ROOT%\electron"

echo Installing Electron dependencies...
call npm install --silent
if errorlevel 1 (
    echo [ERROR] Electron npm install failed.
    pause & exit /b 1
)

:: Copy app icon placeholder if not exists
if not exist "assets\icon.ico" (
    echo [WARN] assets\icon.ico not found. Using default icon.
    mkdir assets 2>nul
    :: Generate a minimal valid ICO file (placeholder)
    node -e "
const fs = require('fs');
// Minimal 1x1 ICO file
const ico = Buffer.from([
    0,0,1,0,1,0,1,1,0,0,1,0,24,0,40,0,0,0,22,0,0,0,
    40,0,0,0,1,0,0,0,2,0,0,0,1,0,24,0,0,0,0,0,4,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,123,104,196,0,0,0,0,0,0,0
]);
if (!fs.existsSync('assets')) fs.mkdirSync('assets');
fs.writeFileSync('assets/icon.ico', ico);
fs.writeFileSync('assets/icon.png', ico);
console.log('Created placeholder icon.');
"
)

:: Create NSIS helper script
echo Creating NSIS helper...
(
echo !macro customInstall
echo   ; Custom installer actions here
echo !macroend
echo !macro customUnInstall
echo   ; Custom uninstaller actions here
echo !macroend
) > "assets\installer.nsh"

echo [OK] Electron ready.

echo.
echo [STEP 4/5] Building Windows installer with electron-builder...
echo ──────────────────────────────────────────────────────────────
cd /d "%ROOT%\electron"

:: Set paths for electron-builder
set BUILD_EXTRA_RESOURCES_BACKEND=%BACKEND_DIST%
set BUILD_EXTRA_RESOURCES_FRONTEND=%FRONTEND_DIST%

call npx electron-builder --win --x64 --config.directories.output="%DIST%"
if errorlevel 1 (
    echo [ERROR] electron-builder failed.
    pause & exit /b 1
)

echo.
echo [STEP 5/5] Verifying output...
echo ───────────────────────────────
if exist "%DIST%\AI Marketing OS Setup*.exe" (
    echo [OK] NSIS installer found.
) else if exist "%DIST%\*.exe" (
    echo [OK] Executable found.
) else (
    echo [WARN] Could not verify output. Check %DIST%\
)

dir "%DIST%\*.exe" 2>nul

echo.
echo ╔══════════════════════════════════════════════════╗
echo ║   BUILD COMPLETE!                                ║
echo ╚══════════════════════════════════════════════════╝
echo.
echo Output files:
dir /b "%DIST%\*.exe" 2>nul
echo.
echo Location: %DIST%\
echo.
explorer "%DIST%"

cd /d "%ROOT%"
pause
exit /b 0

:: ─── Functions ───────────────────────────────────────────────────────────────
:check_prereq
where %1 > nul 2>&1
if errorlevel 1 (
    echo [ERROR] %2 not found in PATH. Please install it and try again.
    exit /b 1
)
echo [OK] %2 found.
exit /b 0
