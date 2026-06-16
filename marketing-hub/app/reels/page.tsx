'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Search, Download, Play, Eye, Heart, Clock, User, X, Check,
  Loader2, AlertCircle, Film, Sparkles, FolderOpen,
} from 'lucide-react'

interface VideoResult {
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

type DownloadStatus = 'downloading' | 'done' | 'error'

interface DownloadItem {
  videoId: string
  title: string
  status: DownloadStatus
  filename?: string
  error?: string
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
}

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube', color: 'bg-red-600 text-white' },
  { id: 'tiktok', label: 'TikTok', color: 'bg-slate-800 text-white border border-white/20' },
  { id: 'all', label: 'Tất cả', color: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' },
]

const QUALITIES = ['480p', '720p', '1080p', 'best']

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function fmtCount(n: number): string {
  if (!n || n <= 0) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return n.toString()
}

function formatDate(d: string): string {
  if (!d || d.length !== 8) return d || ''
  return `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-[#12121a] border border-white/10 overflow-hidden animate-pulse">
      <div className="aspect-video bg-white/5" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-white/5 rounded w-3/4" />
        <div className="h-3 bg-white/5 rounded w-1/2" />
        <div className="h-3 bg-white/5 rounded w-2/3" />
      </div>
    </div>
  )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  useEffect(() => {
    const t = setTimeout(onRemove, 4000)
    return () => clearTimeout(t)
  }, [onRemove])
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl border max-w-sm ${
      toast.type === 'success'
        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
        : 'bg-red-500/15 border-red-500/40 text-red-300'
    }`}>
      {toast.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      <span className="flex-1">{toast.message}</span>
      <button onClick={onRemove}><X className="w-3.5 h-3.5 opacity-60 hover:opacity-100" /></button>
    </div>
  )
}

export default function ReelsPage() {
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState('youtube')
  const [quality, setQuality] = useState('720p')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<VideoResult[]>([])
  const [searched, setSearched] = useState(false)
  const [downloads, setDownloads] = useState<Map<string, DownloadItem>>(new Map())
  const [toasts, setToasts] = useState<Toast[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now().toString()
    setToasts(t => [...t, { id, message, type }])
  }
  const removeToast = (id: string) => setToasts(t => t.filter(x => x.id !== id))

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    setResults([])
    try {
      const res = await fetch('/api/reels/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), platform, limit: 12 }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResults(data.videos || [])
      if ((data.videos || []).length === 0) addToast('Không tìm thấy video nào. Thử từ khóa khác.', 'error')
    } catch (e) {
      addToast(`Lỗi tìm kiếm: ${e instanceof Error ? e.message : 'Không thể kết nối'}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (video: VideoResult) => {
    const q = quality.replace('p', '')
    setDownloads(m => {
      const n = new Map(m)
      n.set(video.id, { videoId: video.id, title: video.title, status: 'downloading' })
      return n
    })
    try {
      const res = await fetch('/api/reels/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: video.url, quality: q }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setDownloads(m => {
        const n = new Map(m)
        n.set(video.id, { videoId: video.id, title: video.title, status: 'done', filename: data.filename })
        return n
      })
      addToast(`✓ Đã tải: ${data.filename}`, 'success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Download failed'
      setDownloads(m => {
        const n = new Map(m)
        n.set(video.id, { videoId: video.id, title: video.title, status: 'error', error: msg })
        return n
      })
      addToast(`Lỗi tải video: ${msg}`, 'error')
    }
  }

  const platformBadge = (p: string) => {
    const map: Record<string, string> = {
      youtube: 'bg-red-600 text-white',
      tiktok: 'bg-slate-900 text-white border border-white/20',
      instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
      twitter: 'bg-sky-500 text-white',
      default: 'bg-gray-700 text-white',
    }
    return map[p] || map.default
  }

  const dlList = Array.from(downloads.values()).filter(d => d.status !== 'error' || true)

  return (
    <div className="p-6 space-y-6">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />)}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-teal-600/30 to-cyan-500/20 border border-teal-500/30">
              <Film className="w-5 h-5 text-teal-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Video Reels Discovery</h1>
          </div>
          <p className="text-gray-400 text-sm mt-1 ml-11">Tìm kiếm video viral theo chủ đề và tải về để repurpose</p>
        </div>
        {dlList.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-600/15 border border-teal-500/30 text-teal-300 text-sm">
            <FolderOpen className="w-4 h-4" />
            {dlList.filter(d => d.status === 'done').length}/{dlList.length} đã tải
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl bg-[#12121a] border border-white/10 p-5 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Nhập chủ đề tìm kiếm... (ví dụ: marketing tips, viral dance, cooking recipe)"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-teal-500/60 transition-all text-base"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-500 text-white font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-500/20 whitespace-nowrap"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            {loading ? 'Đang tìm...' : 'Tìm kiếm'}
          </button>
        </div>

        <div className="flex items-center gap-6">
          {/* Platform */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Platform:</span>
            <div className="flex gap-1.5">
              {PLATFORMS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    platform === p.id
                      ? p.color + ' shadow-md'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Chất lượng tải:</span>
            <div className="flex gap-1.5">
              {QUALITIES.map(q => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    quality === q
                      ? 'bg-gradient-to-r from-teal-600/40 to-cyan-500/40 text-white border border-teal-500/40'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Download Queue */}
      {dlList.length > 0 && (
        <div className="rounded-2xl bg-[#12121a] border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Hàng đợi tải về</h3>
          <div className="space-y-2">
            {dlList.map(d => (
              <div key={d.videoId} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm ${
                d.status === 'done' ? 'bg-emerald-500/10 border-emerald-500/20' :
                d.status === 'error' ? 'bg-red-500/10 border-red-500/20' :
                'bg-white/5 border-white/10'
              }`}>
                {d.status === 'downloading' && <Loader2 className="w-4 h-4 animate-spin text-teal-400 flex-shrink-0" />}
                {d.status === 'done' && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                {d.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                <span className={`flex-1 truncate ${d.status === 'done' ? 'text-emerald-300' : d.status === 'error' ? 'text-red-300' : 'text-gray-300'}`}>
                  {d.status === 'done' ? `✓ ${d.filename}` : d.status === 'error' ? `✗ ${d.title} — ${d.error}` : `Đang tải: ${d.title}`}
                </span>
                <button onClick={() => setDownloads(m => { const n = new Map(m); n.delete(d.videoId); return n })} className="text-gray-600 hover:text-gray-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Grid */}
      {loading && (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 mb-4">
            <Search className="w-10 h-10 text-gray-500" />
          </div>
          <p className="text-gray-400 text-lg font-medium">Không tìm thấy kết quả</p>
          <p className="text-gray-500 text-sm mt-2">Thử từ khóa khác hoặc đổi platform</p>
        </div>
      )}

      {!loading && !searched && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-teal-600/20 to-cyan-500/20 border border-teal-500/30 mb-5">
            <Sparkles className="w-12 h-12 text-teal-400" />
          </div>
          <p className="text-white text-xl font-bold">Tìm video viral theo chủ đề</p>
          <p className="text-gray-400 text-sm mt-2 max-w-md">
            Nhập chủ đề bất kỳ để tìm và tải video từ YouTube, TikTok về máy — sẵn sàng để reup
          </p>
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {['marketing tips 2026', 'viral dance tiktok', 'cooking recipes', 'gym motivation', 'digital marketing'].map(s => (
              <button
                key={s}
                onClick={() => { setQuery(s); inputRef.current?.focus() }}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-xs hover:text-white hover:border-white/20 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">{results.length} video tìm thấy cho <span className="text-white font-medium">"{query}"</span></p>
            <p className="text-xs text-gray-500">Lưu về: ~/marketing-hub-downloads/</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {results.map(video => {
              const dl = downloads.get(video.id)
              return (
                <div key={video.id} className="rounded-2xl bg-[#12121a] border border-white/10 overflow-hidden group hover:border-white/20 hover:-translate-y-1 transition-all duration-200 card-hover">
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-10 h-10 text-gray-600" />
                      </div>
                    )}
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                    {/* Platform badge */}
                    <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-xs font-bold ${platformBadge(video.platform)}`}>
                      {video.platform}
                    </div>
                    {/* Duration */}
                    {video.duration > 0 && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-white text-xs font-mono">
                        {formatDuration(video.duration)}
                      </div>
                    )}
                    {/* Play button on hover */}
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                    </a>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-white text-sm font-medium line-clamp-2 mb-2 leading-snug">{video.title}</h3>
                    <div className="flex items-center gap-1 text-gray-400 text-xs mb-2">
                      <User className="w-3 h-3" />
                      <span className="truncate">{video.uploader}</span>
                      {video.uploadDate && (
                        <>
                          <span className="mx-1">·</span>
                          <span>{formatDate(video.uploadDate)}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {fmtCount(video.viewCount)}
                      </div>
                      {video.likeCount > 0 && (
                        <div className="flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5" />
                          {fmtCount(video.likeCount)}
                        </div>
                      )}
                    </div>

                    {/* Download button */}
                    <button
                      onClick={() => !dl && handleDownload(video)}
                      disabled={dl?.status === 'downloading' || dl?.status === 'done'}
                      className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
                        dl?.status === 'done'
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 cursor-default'
                          : dl?.status === 'downloading'
                          ? 'bg-teal-600/15 border border-teal-500/30 text-teal-400 cursor-wait'
                          : dl?.status === 'error'
                          ? 'bg-red-600/15 border border-red-500/30 text-red-400 hover:bg-red-600/25'
                          : 'bg-gradient-to-r from-teal-600/30 to-cyan-500/30 border border-teal-500/40 text-teal-300 hover:from-teal-600/50 hover:to-cyan-500/50'
                      }`}
                    >
                      {dl?.status === 'downloading' ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />Đang tải...</>
                      ) : dl?.status === 'done' ? (
                        <><Check className="w-4 h-4" />Đã tải về</>
                      ) : dl?.status === 'error' ? (
                        <><AlertCircle className="w-4 h-4" />Thử lại</>
                      ) : (
                        <><Download className="w-4 h-4" />Tải về ({quality})</>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
