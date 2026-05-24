import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import * as http from 'http'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
const PORT = 3000

let mainWindow: BrowserWindow | null = null
let nextServer: ChildProcess | null = null

// ─── Find the Next.js standalone server ───────────────────────────────────────
function getServerPath(): string {
  if (isDev) return path.join(__dirname, '..', '.next', 'standalone', 'server.js')
  // In packaged app: resources/app/.next/standalone/server.js
  return path.join(process.resourcesPath, 'app', '.next', 'standalone', 'server.js')
}

function getStaticPath(): string {
  if (isDev) return path.join(__dirname, '..', '.next', 'static')
  return path.join(process.resourcesPath, 'app', '.next', 'static')
}

function getPublicPath(): string {
  if (isDev) return path.join(__dirname, '..', 'public')
  return path.join(process.resourcesPath, 'app', 'public')
}

// ─── Start Next.js standalone server ──────────────────────────────────────────
function startNextServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverPath = getServerPath()

    if (!fs.existsSync(serverPath)) {
      reject(new Error(`Server not found: ${serverPath}\n\nRun "npm run build" first.`))
      return
    }

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'production' as const,
      HOSTNAME: '127.0.0.1',
      NEXT_SHARP_PATH: '',
    }

    // Copy static files for standalone server (needed by Next.js standalone)
    const standaloneDir = path.dirname(serverPath)
    const standaloneStaticDest = path.join(standaloneDir, '.next', 'static')
    const standalonePublicDest = path.join(standaloneDir, 'public')

    if (!fs.existsSync(standaloneStaticDest)) {
      try {
        copyDir(getStaticPath(), standaloneStaticDest)
      } catch {}
    }
    if (!fs.existsSync(standalonePublicDest)) {
      try {
        copyDir(getPublicPath(), standalonePublicDest)
      } catch {}
    }

    nextServer = spawn(process.execPath, [serverPath], { env, cwd: standaloneDir })

    nextServer.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString()
      if (msg.includes('Ready') || msg.includes('ready') || msg.includes(String(PORT))) {
        resolve()
      }
    })

    nextServer.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString()
      if (msg.includes('Ready') || msg.includes('ready')) resolve()
    })

    nextServer.on('error', reject)

    // Fallback: poll until server responds
    let attempts = 0
    const poll = setInterval(() => {
      attempts++
      if (attempts > 60) {
        clearInterval(poll)
        resolve() // try anyway
      }
      const req = http.get(`http://127.0.0.1:${PORT}`, (res) => {
        if (res.statusCode && res.statusCode < 500) {
          clearInterval(poll)
          resolve()
        }
      })
      req.on('error', () => {})
      req.setTimeout(500, () => req.destroy())
    }, 500)
  })
}

// ─── Copy directory helper ─────────────────────────────────────────────────────
function copyDir(src: string, dest: string) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDir(srcPath, destPath)
    else fs.copyFileSync(srcPath, destPath)
  }
}

// ─── Create main window ────────────────────────────────────────────────────────
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: 'Marketing Hub',
    backgroundColor: '#0a0a0f',
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    icon: path.join(isDev ? path.join(__dirname, '..', 'public') : path.join(process.resourcesPath, 'app', 'public'), 'icon.ico'),
  })

  // Loading screen while server starts
  const loadingHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: #0a0a0f;
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          gap: 20px;
        }
        .logo {
          font-size: 32px;
          font-weight: 800;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .sub { color: #6b7280; font-size: 14px; }
        .spinner {
          width: 40px; height: 40px;
          border: 3px solid rgba(168,85,247,0.2);
          border-top-color: #a855f7;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="logo">Marketing Hub</div>
      <div class="sub">Đang khởi động...</div>
      <div class="spinner"></div>
    </body>
    </html>
  `
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(loadingHtml)}`)
  mainWindow.show()

  try {
    await startNextServer()
    await mainWindow.loadURL(`http://127.0.0.1:${PORT}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    dialog.showErrorBox('Lỗi khởi động', msg)
    app.quit()
    return
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://127.0.0.1:${PORT}`)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ─── IPC: open downloads folder ───────────────────────────────────────────────
ipcMain.handle('open-downloads', () => {
  const dir = path.join(app.getPath('home'), 'marketing-hub-downloads')
  fs.mkdirSync(dir, { recursive: true })
  shell.openPath(dir)
})

// ─── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.kill()
    nextServer = null
  }
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill()
    nextServer = null
  }
})
