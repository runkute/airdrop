import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { getYtDlpPath } from '@/lib/ytdlp'

export interface VideoResult {
  id: string
  title: string
  url: string
  thumbnail: string
  duration: number
  viewCount: number
  likeCount: number
  uploader: string
  uploadDate: string
  platform: string
  description: string
}

export async function POST(req: NextRequest) {
  const { query, platform = 'youtube', limit = 12 } = await req.json()

  if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 })

  // Build yt-dlp search query per platform
  const searchPrefix: Record<string, string> = {
    youtube: `ytsearch${limit}:`,
    tiktok: `ttsearch${limit}:`,
    all: `ytsearch${limit}:`,
  }

  const prefix = searchPrefix[platform] || `ytsearch${limit}:`
  const searchQuery = `${prefix}${query}`

  return new Promise<NextResponse>((resolve) => {
    const args = [
      '--dump-json',
      '--no-playlist',
      '--flat-playlist',
      '--no-warnings',
      '--socket-timeout', '15',
      searchQuery,
    ]

    const proc = spawn(getYtDlpPath(), args)
    let output = ''
    let errorOutput = ''

    proc.stdout.on('data', (data: Buffer) => { output += data.toString() })
    proc.stderr.on('data', (data: Buffer) => { errorOutput += data.toString() })

    const timeout = setTimeout(() => {
      proc.kill()
      resolve(NextResponse.json({ error: 'Search timeout' }, { status: 504 }))
    }, 30000)

    proc.on('close', (code) => {
      clearTimeout(timeout)
      if (code !== 0 && !output) {
        resolve(NextResponse.json({ error: 'Search failed', details: errorOutput }, { status: 500 }))
        return
      }

      const videos: VideoResult[] = []
      const lines = output.split('\n').filter(Boolean)

      for (const line of lines) {
        try {
          const info = JSON.parse(line)
          videos.push({
            id: info.id || info.url || String(Math.random()),
            title: info.title || 'Untitled',
            url: info.url || info.webpage_url || '',
            thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || '',
            duration: info.duration || 0,
            viewCount: info.view_count || 0,
            likeCount: info.like_count || 0,
            uploader: info.uploader || info.channel || info.creator || 'Unknown',
            uploadDate: info.upload_date || '',
            platform: info.extractor_key?.toLowerCase() || platform,
            description: (info.description || '').slice(0, 200),
          })
        } catch { /* skip invalid JSON lines */ }
      }

      resolve(NextResponse.json({ videos: videos.slice(0, limit) }))
    })
  })
}
