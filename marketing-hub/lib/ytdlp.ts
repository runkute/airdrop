import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

/**
 * Resolve the yt-dlp executable path cross-platform.
 * Priority:
 *  1. Bundled in Electron resources/yt-dlp(.exe)
 *  2. System PATH via 'yt-dlp' command
 *  3. Common install locations
 */
export function getYtDlpPath(): string {
  const isWindows = process.platform === 'win32'
  const bin = isWindows ? 'yt-dlp.exe' : 'yt-dlp'

  // 1. Bundled with Electron app (resources/yt-dlp.exe)
  if (process.resourcesPath) {
    const bundled = path.join(process.resourcesPath, 'resources', bin)
    if (fs.existsSync(bundled)) return bundled
    // Also check directly in resourcesPath
    const bundled2 = path.join(process.resourcesPath, bin)
    if (fs.existsSync(bundled2)) return bundled2
  }

  // 2. Common system paths
  const candidates = isWindows
    ? [
        path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'yt-dlp', 'yt-dlp.exe'),
        path.join(os.homedir(), 'scoop', 'shims', 'yt-dlp.exe'),
        'C:\\ProgramData\\chocolatey\\bin\\yt-dlp.exe',
        path.join(os.homedir(), 'Downloads', 'yt-dlp.exe'),
      ]
    : [
        '/usr/local/bin/yt-dlp',
        '/usr/bin/yt-dlp',
        '/opt/homebrew/bin/yt-dlp',
        path.join(os.homedir(), '.local', 'bin', 'yt-dlp'),
      ]

  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }

  // 3. Fall back to system command (relies on PATH)
  return bin
}

/**
 * Default download directory.
 */
export function getDownloadDir(): string {
  const dir = path.join(os.homedir(), 'marketing-hub-downloads')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}
