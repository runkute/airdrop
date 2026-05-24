@echo off
echo ========================================
echo  Marketing Hub - Windows Build Script
echo ========================================
echo.

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

:: Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm not found.
    pause
    exit /b 1
)

echo [1/5] Installing dependencies...
npm install
if %errorlevel% neq 0 goto :error

echo.
echo [2/5] Downloading yt-dlp.exe for Windows...
if not exist "resources" mkdir resources
if not exist "resources\yt-dlp.exe" (
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' -OutFile 'resources\yt-dlp.exe'"
    if %errorlevel% neq 0 (
        echo [WARNING] Could not download yt-dlp.exe automatically.
        echo           Download manually from: https://github.com/yt-dlp/yt-dlp/releases
        echo           Place yt-dlp.exe in the 'resources' folder.
    ) else (
        echo yt-dlp.exe downloaded successfully.
    )
) else (
    echo yt-dlp.exe already exists, skipping.
)

echo.
echo [3/5] Compiling Electron TypeScript...
npx tsc --project electron/tsconfig.json --outDir electron
if %errorlevel% neq 0 goto :error

echo.
echo [4/5] Building Next.js (production)...
npm run build
if %errorlevel% neq 0 goto :error

echo.
echo [5/5] Packaging as Windows .exe installer...
npx electron-builder --win --x64
if %errorlevel% neq 0 goto :error

echo.
echo ========================================
echo  BUILD SUCCESS!
echo  Output: dist-electron\
echo    - Marketing Hub Setup.exe  (installer)
echo    - Marketing Hub.exe        (portable)
echo ========================================
pause
exit /b 0

:error
echo.
echo [ERROR] Build failed at step above.
pause
exit /b 1
