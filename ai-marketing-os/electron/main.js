const { app, BrowserWindow, shell, ipcMain, dialog, Menu, Tray, nativeImage } = require("electron")
const path = require("path")
const { spawn } = require("child_process")
const http = require("http")
const fs = require("fs")
const os = require("os")

// ─── Constants ───────────────────────────────────────────────────────────────
const BACKEND_PORT = 8765
const FRONTEND_PORT = 3000
const isDev = !app.isPackaged
const isMac = process.platform === "darwin"
const isWin = process.platform === "win32"

// ─── State ────────────────────────────────────────────────────────────────────
let mainWindow = null
let splashWindow = null
let backendProcess = null
let frontendProcess = null
let tray = null
let isQuitting = false

// ─── Paths ────────────────────────────────────────────────────────────────────
function getResourcePath(...segments) {
  if (isDev) {
    return path.join(__dirname, "..", ...segments)
  }
  return path.join(process.resourcesPath, ...segments)
}

function getUserDataPath(...segments) {
  return path.join(app.getPath("userData"), ...segments)
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

// ─── Logging ─────────────────────────────────────────────────────────────────
const logsDir = getUserDataPath("logs")
ensureDir(logsDir)

function log(level, ...args) {
  const ts = new Date().toISOString()
  const msg = `[${ts}] [${level.toUpperCase()}] ${args.join(" ")}\n`
  process.stdout.write(msg)
  try {
    fs.appendFileSync(path.join(logsDir, "main.log"), msg)
  } catch {}
}

// ─── Health Check ─────────────────────────────────────────────────────────────
async function waitForServer(url, timeoutMs = 40000, intervalMs = 600) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode < 500) resolve()
          else reject(new Error(`HTTP ${res.statusCode}`))
          res.resume()
        })
        req.on("error", reject)
        req.setTimeout(800, () => {
          req.destroy()
          reject(new Error("timeout"))
        })
      })
      return true
    } catch {
      await new Promise((r) => setTimeout(r, intervalMs))
    }
  }
  return false
}

// ─── Backend ──────────────────────────────────────────────────────────────────
function startBackend() {
  const dataDir = getUserDataPath("data")
  ensureDir(dataDir)

  const dbPath = path.join(dataDir, "aimarketingos.db").replace(/\\/g, "/")
  const logFile = path.join(logsDir, "backend.log")

  // Determine executable
  let exe, args, cwd

  if (isDev) {
    exe = isWin ? "python" : "python3"
    args = [
      "-m", "uvicorn",
      "app.main_desktop:app",
      "--host", "127.0.0.1",
      "--port", String(BACKEND_PORT),
      "--reload",
    ]
    cwd = getResourcePath("backend")
  } else {
    const exeName = isWin ? "backend-server.exe" : "backend-server"
    exe = getResourcePath("backend", exeName)
    args = []
    cwd = getResourcePath("backend")
  }

  // Read persisted config
  const configPath = getUserDataPath("config.json")
  let savedConfig = {}
  try {
    if (fs.existsSync(configPath)) {
      savedConfig = JSON.parse(fs.readFileSync(configPath, "utf8"))
    }
  } catch {}

  const env = {
    ...process.env,
    DATABASE_URL: `sqlite+aiosqlite:///${dbPath}`,
    BACKEND_PORT: String(BACKEND_PORT),
    ENVIRONMENT: isDev ? "development" : "desktop",
    DEBUG: isDev ? "true" : "false",
    CORS_ORIGINS: JSON.stringify([
      `http://localhost:${FRONTEND_PORT}`,
      "app://.",
      "file://",
    ]),
    SECRET_KEY: savedConfig.SECRET_KEY || generateSecret(),
    OPENAI_API_KEY: savedConfig.OPENAI_API_KEY || "",
    ANTHROPIC_API_KEY: savedConfig.ANTHROPIC_API_KEY || "",
    GOOGLE_API_KEY: savedConfig.GOOGLE_API_KEY || "",
    GROK_API_KEY: savedConfig.GROK_API_KEY || "",
    LOG_LEVEL: isDev ? "DEBUG" : "INFO",
    FRONTEND_URL: `http://localhost:${FRONTEND_PORT}`,
    APP_DATA_DIR: dataDir,
  }

  log("info", `Starting backend: ${exe}`)

  backendProcess = spawn(exe, args, {
    env,
    cwd,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  })

  const logStream = fs.createWriteStream(logFile, { flags: "a" })
  backendProcess.stdout?.on("data", (d) => {
    const s = d.toString()
    logStream.write(`[STDOUT] ${s}`)
    if (isDev) process.stdout.write(s)
  })
  backendProcess.stderr?.on("data", (d) => {
    const s = d.toString()
    logStream.write(`[STDERR] ${s}`)
    if (isDev) process.stderr.write(s)
  })
  backendProcess.on("exit", (code, signal) => {
    log("warn", `Backend exited: code=${code} signal=${signal}`)
    if (!isQuitting && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("backend-crashed", { code, signal })
    }
  })
  backendProcess.on("error", (err) => {
    log("error", `Backend spawn error: ${err.message}`)
  })
}

// ─── Frontend (Next.js standalone) ───────────────────────────────────────────
function startFrontendServer() {
  if (isDev) return // Dev uses `npm run dev` separately

  const serverScript = getResourcePath("frontend", "server.js")
  if (!fs.existsSync(serverScript)) {
    log("warn", "No frontend server.js found — will load static export")
    return
  }

  const nodeBin = process.execPath
  frontendProcess = spawn(nodeBin, [serverScript], {
    env: {
      ...process.env,
      PORT: String(FRONTEND_PORT),
      HOSTNAME: "127.0.0.1",
      NEXT_PUBLIC_API_URL: `http://127.0.0.1:${BACKEND_PORT}/api/v1`,
    },
    windowsHide: true,
    stdio: "ignore",
  })

  frontendProcess.on("exit", (code) => {
    log("warn", `Frontend server exited: ${code}`)
  })
}

// ─── Splash Window ────────────────────────────────────────────────────────────
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    icon: path.join(__dirname, "assets", "icon.png"),
  })
  splashWindow.loadFile(path.join(__dirname, "loading.html"))
  splashWindow.center()
}

// ─── Main Window ─────────────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: !isDev,
    },
    icon: path.join(__dirname, "assets", "icon.png"),
    backgroundColor: "#0a0a0a",
    show: false,
    titleBarStyle: "default",
    title: "AI Marketing OS",
  })

  // Prevent external navigation — open in default browser instead
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith("http://localhost") && !url.startsWith("file://")) {
      shell.openExternal(url)
    }
    return { action: "deny" }
  })

  mainWindow.on("close", (e) => {
    if (!isQuitting && !isMac) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  return mainWindow
}

// ─── Tray ─────────────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, "assets", "icon-tray.png")
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    : nativeImage.createEmpty()

  tray = new Tray(icon)
  tray.setToolTip("AI Marketing OS")

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open AI Marketing OS",
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      },
    },
    { type: "separator" },
    {
      label: "Open Logs Folder",
      click: () => shell.openPath(logsDir),
    },
    {
      label: "Open Data Folder",
      click: () => shell.openPath(getUserDataPath("data")),
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
  tray.on("double-click", () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

// ─── App Menu ─────────────────────────────────────────────────────────────────
function setAppMenu() {
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "Open Data Folder",
          click: () => shell.openPath(getUserDataPath("data")),
        },
        {
          label: "Open Logs Folder",
          click: () => shell.openPath(logsDir),
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        ...(isDev ? [{ role: "toggleDevTools" }] : []),
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: `Version ${app.getVersion()}`,
          enabled: false,
        },
        { type: "separator" },
        {
          label: "Report an Issue",
          click: () => shell.openExternal("https://github.com/your-org/ai-marketing-os/issues"),
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────
ipcMain.handle("app:version", () => app.getVersion())
ipcMain.handle("app:logs-path", () => logsDir)
ipcMain.handle("app:data-path", () => getUserDataPath("data"))
ipcMain.handle("app:open-logs", () => shell.openPath(logsDir))
ipcMain.handle("app:open-data", () => shell.openPath(getUserDataPath("data")))
ipcMain.handle("app:backend-url", () => `http://127.0.0.1:${BACKEND_PORT}`)

ipcMain.handle("config:get", () => {
  try {
    const p = getUserDataPath("config.json")
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"))
  } catch {}
  return {}
})

ipcMain.handle("config:set", (_, config) => {
  const p = getUserDataPath("config.json")
  const existing = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {}
  fs.writeFileSync(p, JSON.stringify({ ...existing, ...config }, null, 2))
  return true
})

// ─── Utility ──────────────────────────────────────────────────────────────────
function generateSecret() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  return Array.from({ length: 48 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

// ─── Startup ──────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Single instance lock
  if (!app.requestSingleInstanceLock()) {
    app.quit()
    return
  }

  setAppMenu()
  createSplashWindow()
  createTray()
  createMainWindow()

  // Start services
  log("info", "Starting backend service...")
  startBackend()
  startFrontendServer()

  // Wait for backend
  const backendUrl = `http://127.0.0.1:${BACKEND_PORT}/health`
  log("info", `Waiting for backend at ${backendUrl}...`)
  const ready = await waitForServer(backendUrl)

  if (!ready) {
    dialog.showErrorBox(
      "Startup Error",
      `Could not start the AI Marketing OS backend.\n\nCheck logs at:\n${path.join(logsDir, "backend.log")}`
    )
    app.quit()
    return
  }

  log("info", "Backend ready. Loading application...")

  // Wait for frontend if we started a server
  if (frontendProcess) {
    await waitForServer(`http://127.0.0.1:${FRONTEND_PORT}`, 20000)
  }

  // Load the app
  if (isDev) {
    await mainWindow.loadURL(`http://localhost:${FRONTEND_PORT}`)
    mainWindow.webContents.openDevTools({ mode: "detach" })
  } else if (frontendProcess) {
    await mainWindow.loadURL(`http://127.0.0.1:${FRONTEND_PORT}`)
  } else {
    // Static export
    const indexPath = getResourcePath("frontend", "index.html")
    if (fs.existsSync(indexPath)) {
      await mainWindow.loadFile(indexPath)
    } else {
      await mainWindow.loadURL(`http://127.0.0.1:${BACKEND_PORT}/docs`)
    }
  }

  // Transition from splash to main
  splashWindow?.close()
  splashWindow = null
  mainWindow.show()
  mainWindow.focus()
})

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
})

app.on("window-all-closed", () => {
  if (isMac) return
  isQuitting = true
  app.quit()
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  } else {
    mainWindow?.show()
  }
})

app.on("before-quit", () => {
  isQuitting = true
  log("info", "Shutting down services...")
  backendProcess?.kill("SIGTERM")
  frontendProcess?.kill("SIGTERM")
})
