import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import { getYtDlpPath, getDownloadDir } from '@/lib/ytdlp'

export async function POST(req: NextRequest) {
  const { url, quality = '720', format = 'mp4' } = await req.json()

  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  // Validate URL is a real URL from allowed domains
  try {
    const parsed = new URL(url)
    const allowed = ['youtube.com', 'youtu.be', 'tiktok.com', 'instagram.com', 'facebook.com', 'twitter.com', 'x.com', 'm.youtube.com']
    const isAllowed = allowed.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d))
    if (!isAllowed) {
      return NextResponse.json({ error: 'URL domain không được phép' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'URL không hợp lệ' }, { status: 400 })
  }

  const downloadDir = getDownloadDir()
  const outputTemplate = path.join(downloadDir, '%(title)s.%(ext)s')

  return new Promise<NextResponse>((resolve) => {
    const heightMap: Record<string, string> = { '480': '480', '720': '720', '1080': '1080', 'best': 'best' }
    const h = heightMap[quality] || '720'
    const formatStr =
      h === 'best'
        ? 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
        : `bestvideo[height<=${h}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${h}][ext=mp4]/best[height<=${h}]`

    const args = [
      '-o', outputTemplate,
      '-f', formatStr,
      '--merge-output-format', 'mp4',
      '--no-playlist',
      '--no-warnings',
      '--socket-timeout', '30',
      '--progress',
      url,
    ]

    let lastFilename = ''
    let stderr = ''

    const proc = spawn(getYtDlpPath(), args)

    proc.stdout.on('data', (data: Buffer) => {
      const text = data.toString()
      // Parse destination filename
      const fnMatch = text.match(/\[download\] Destination: (.+)$/)
      if (fnMatch) lastFilename = fnMatch[1].trim()
      const mergeMatch = text.match(/\[Merger\] Merging formats into "(.+)"/)
      if (mergeMatch) lastFilename = mergeMatch[1].trim()
    })

    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString() })

    const timeout = setTimeout(() => {
      proc.kill()
      resolve(NextResponse.json({ error: 'Download timeout (5min)' }, { status: 504 }))
    }, 300000)

    proc.on('close', (code) => {
      clearTimeout(timeout)
      if (code !== 0) {
        resolve(NextResponse.json({ error: 'Download failed', details: stderr }, { status: 500 }))
        return
      }
      const filename = lastFilename ? path.basename(lastFilename) : 'video.mp4'
      resolve(NextResponse.json({
        success: true,
        filename,
        downloadDir,
        filePath: lastFilename || path.join(downloadDir, filename),
      }))
    })
  })
}
