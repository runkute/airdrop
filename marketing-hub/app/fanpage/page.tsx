'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Plus, X, Share2, Sparkles, Copy, Send, Check, ChevronDown,
  AlertCircle, Users, RefreshCw, Clock, Globe, Loader2,
} from 'lucide-react'
import { getSettings } from '@/lib/settings'

interface FanPage {
  id: string
  name: string
  pageId: string
  pageToken: string
  verified: boolean
  fanCount?: number
  category?: string
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
}

const TONES = [
  { id: 'professional', label: 'Chuyên nghiệp' },
  { id: 'friendly', label: 'Thân thiện' },
  { id: 'exciting', label: 'Sôi nổi' },
  { id: 'informative', label: 'Thông tin' },
  { id: 'promotional', label: 'Quảng bá' },
]

const STORAGE_KEY = 'mh_fanpages'

// Detect if running inside Electron
const isElectron = typeof window !== 'undefined' && !!(window as Window & { electronAPI?: { encryptString?: unknown } }).electronAPI?.encryptString

async function encryptToken(token: string): Promise<string> {
  if (isElectron && (window as any).electronAPI?.encryptString) {
    return (window as any).electronAPI.encryptString(token)
  }
  return token
}

async function decryptToken(encoded: string): Promise<string> {
  if (isElectron && (window as any).electronAPI?.decryptString) {
    return (window as any).electronAPI.decryptString(encoded)
  }
  return encoded
}

async function loadPages(): Promise<FanPage[]> {
  if (typeof window === 'undefined') return []
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as FanPage[]
    // Decrypt all tokens
    return Promise.all(raw.map(async p => ({ ...p, pageToken: await decryptToken(p.pageToken) })))
  } catch { return [] }
}

async function savePages(pages: FanPage[]): Promise<void> {
  if (typeof window === 'undefined') return
  // Encrypt tokens before saving
  const toStore = await Promise.all(pages.map(async p => ({ ...p, pageToken: await encryptToken(p.pageToken) })))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  useEffect(() => {
    const t = setTimeout(onRemove, 4000)
    return () => clearTimeout(t)
  }, [onRemove])

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl border max-w-sm transition-all ${
      toast.type === 'success'
        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
        : 'bg-red-500/15 border-red-500/40 text-red-300'
    }`}>
      {toast.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      <span>{toast.message}</span>
      <button onClick={onRemove} className="ml-auto opacity-60 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default function FanpagePage() {
  const [pages, setPages] = useState<FanPage[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [showAddPage, setShowAddPage] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [pageForm, setPageForm] = useState({ name: '', pageId: '', pageToken: '' })

  // Generator state
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('professional')
  const [context, setContext] = useState('')
  const [count, setCount] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [generatedPosts, setGeneratedPosts] = useState<string[]>([])
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  // Publisher state
  const [editContent, setEditContent] = useState('')
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set())
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleTime, setScheduleTime] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => { loadPages().then(setPages) }, [])

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now().toString()
    setToasts(t => [...t, { id, message, type }])
  }
  const removeToast = (id: string) => setToasts(t => t.filter(x => x.id !== id))

  const handleVerifyPage = async () => {
    if (!pageForm.pageId || !pageForm.pageToken || !pageForm.name) return
    setVerifying(true)
    try {
      const res = await fetch('/api/fanpage/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageToken: pageForm.pageToken }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const newPage: FanPage = {
        id: Date.now().toString(),
        name: pageForm.name,
        pageId: pageForm.pageId,
        pageToken: pageForm.pageToken,
        verified: true,
        fanCount: data.fan_count,
        category: data.category,
      }
      const updated = [...pages, newPage]
      setPages(updated)
      await savePages(updated)
      setPageForm({ name: '', pageId: '', pageToken: '' })
      setShowAddPage(false)
      addToast(`✓ Đã thêm page "${newPage.name}" thành công`, 'success')
    } catch (e) {
      const newPage: FanPage = {
        id: Date.now().toString(),
        name: pageForm.name,
        pageId: pageForm.pageId,
        pageToken: pageForm.pageToken,
        verified: false,
      }
      const updated = [...pages, newPage]
      setPages(updated)
      await savePages(updated)
      setPageForm({ name: '', pageId: '', pageToken: '' })
      setShowAddPage(false)
      addToast(`Page đã thêm (chưa xác minh: ${e instanceof Error ? e.message : 'lỗi kết nối'})`, 'error')
    } finally {
      setVerifying(false)
    }
  }

  const removePage = async (id: string) => {
    const updated = pages.filter(p => p.id !== id)
    setPages(updated)
    await savePages(updated)
    setSelectedPages(s => { const n = new Set(s); n.delete(id); return n })
  }

  const handleGenerate = async () => {
    if (!topic.trim()) return
    setGenerating(true)
    setGeneratedPosts([])
    try {
      const { anthropicApiKey } = getSettings()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (anthropicApiKey) headers['x-api-key'] = anthropicApiKey
      const res = await fetch('/api/fanpage/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ topic, tone, count, context }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setGeneratedPosts(data.posts || [])
      if (data.posts?.length > 0) setEditContent(data.posts[0])
    } catch (e) {
      addToast(`Lỗi tạo nội dung: ${e instanceof Error ? e.message : 'Kiểm tra ANTHROPIC_API_KEY'}`, 'error')
    } finally {
      setGenerating(false)
    }
  }

  const copyPost = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const usePost = (text: string) => {
    setEditContent(text)
    document.getElementById('publisher')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handlePost = async () => {
    if (!editContent.trim() || selectedPages.size === 0) return
    setPosting(true)
    let successCount = 0
    let errorCount = 0
    for (const pageId of selectedPages) {
      const page = pages.find(p => p.id === pageId)
      if (!page) continue
      try {
        const res = await fetch('/api/fanpage/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageId: page.pageId,
            pageToken: page.pageToken,
            message: editContent,
            scheduledTime: scheduleEnabled && scheduleTime ? scheduleTime : undefined,
          }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        successCount++
      } catch (e) {
        errorCount++
        addToast(`Lỗi đăng "${page.name}": ${e instanceof Error ? e.message : 'unknown'}`, 'error')
      }
    }
    if (successCount > 0) {
      addToast(`✓ Đã ${scheduleEnabled ? 'lên lịch' : 'đăng'} thành công lên ${successCount} page`, 'success')
      setEditContent('')
      setScheduleEnabled(false)
      setScheduleTime('')
    }
    setPosting(false)
  }

  const togglePageSelect = (id: string) => {
    setSelectedPages(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />)}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600/30 to-blue-400/20 border border-blue-500/30">
              <Share2 className="w-5 h-5 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Facebook Fanpage Manager</h1>
          </div>
          <p className="text-gray-400 text-sm mt-1 ml-11">Quản lý pages, tạo nội dung AI và đăng bài đa kênh</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Page Config */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#12121a] border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 className="text-base font-semibold text-white">Pages của bạn</h2>
              <button
                onClick={() => setShowAddPage(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-600/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm Page
              </button>
            </div>

            {/* Add Page Form */}
            {showAddPage && (
              <div className="px-5 py-4 border-b border-white/10 bg-white/2 space-y-3">
                <input
                  value={pageForm.name}
                  onChange={e => setPageForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Tên page (ví dụ: Công ty ABC)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/60"
                />
                <input
                  value={pageForm.pageId}
                  onChange={e => setPageForm(f => ({ ...f, pageId: e.target.value }))}
                  placeholder="Page ID (123456789)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/60"
                />
                <input
                  type="password"
                  value={pageForm.pageToken}
                  onChange={e => setPageForm(f => ({ ...f, pageToken: e.target.value }))}
                  placeholder="Page Access Token"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/60"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowAddPage(false)} className="flex-1 py-2 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5 transition-colors">
                    Hủy
                  </button>
                  <button
                    onClick={handleVerifyPage}
                    disabled={verifying || !pageForm.name || !pageForm.pageId || !pageForm.pageToken}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
                  >
                    {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {verifying ? 'Đang xác minh...' : 'Thêm & Xác minh'}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Lấy token tại Facebook Developer → Graph API Explorer
                </p>
              </div>
            )}

            {/* Page List */}
            <div className="divide-y divide-white/5">
              {pages.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <Globe className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Chưa có page nào</p>
                  <p className="text-gray-600 text-xs mt-1">Thêm Facebook Page Access Token để bắt đầu</p>
                </div>
              )}
              {pages.map(page => (
                <div key={page.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/2 transition-colors group">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${page.verified ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{page.name}</p>
                    <p className="text-xs text-gray-500">
                      {page.verified ? (page.fanCount ? `${page.fanCount.toLocaleString()} fans` : 'Đã xác minh') : 'Chưa xác minh'} • ID: {page.pageId.slice(0, 8)}…
                    </p>
                  </div>
                  <button onClick={() => removePage(page.id)} className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-2xl bg-[#12121a] border border-white/10 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Thống kê nhanh</h3>
            {[
              { label: 'Pages đã kết nối', value: pages.length.toString(), color: 'text-blue-400' },
              { label: 'Pages đã xác minh', value: pages.filter(p => p.verified).length.toString(), color: 'text-emerald-400' },
              { label: 'Bài sẵn sàng đăng', value: generatedPosts.length.toString(), color: 'text-purple-400' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{s.label}</span>
                <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Generator + Publisher */}
        <div className="col-span-2 space-y-5">
          {/* AI Content Generator */}
          <div className="rounded-2xl bg-[#12121a] border border-white/10 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-600/10 to-pink-600/10">
              <div className="p-1.5 rounded-lg bg-purple-500/20">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <h2 className="text-base font-semibold text-white">AI Content Generator</h2>
              <span className="ml-auto text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">Claude AI</span>
            </div>
            <div className="p-6 space-y-4">
              {/* Topic + Count */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm text-gray-400 mb-1.5">Chủ đề *</label>
                  <input
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                    placeholder="Ví dụ: Ra mắt sản phẩm mới mùa hè 2026..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/60 transition-all"
                  />
                </div>
                <div className="w-28">
                  <label className="block text-sm text-gray-400 mb-1.5">Số bài</label>
                  <select
                    value={count}
                    onChange={e => setCount(Number(e.target.value))}
                    className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60"
                  >
                    {[1, 2, 3, 5].map(n => <option key={n} value={n}>{n} bài</option>)}
                  </select>
                </div>
              </div>

              {/* Tone selector */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Giọng điệu</label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        tone === t.id
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20'
                          : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Context */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Context thêm (tùy chọn)</label>
                <textarea
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder="Thông tin thêm về sản phẩm, chương trình khuyến mãi..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/60 resize-none transition-all"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || !topic.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/20"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? 'Đang tạo nội dung...' : 'Tạo nội dung với AI'}
              </button>
            </div>

            {/* Generated Posts */}
            {generatedPosts.length > 0 && (
              <div className="border-t border-white/10 p-6 space-y-3">
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{generatedPosts.length} bài được tạo</p>
                {generatedPosts.map((post, i) => (
                  <div key={i} className="relative p-4 rounded-xl bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/20 group">
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyPost(post, i)}
                        className="p-1.5 rounded-lg bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 transition-all"
                        title="Copy"
                      >
                        {copiedIdx === i ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => usePost(post)}
                        className="p-1.5 rounded-lg bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 transition-all"
                        title="Dùng bài này"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap pr-16 leading-relaxed">{post}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Publisher */}
          <div id="publisher" className="rounded-2xl bg-[#12121a] border border-white/10 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 bg-gradient-to-r from-blue-600/10 to-cyan-600/10">
              <div className="p-1.5 rounded-lg bg-blue-500/20">
                <Send className="w-4 h-4 text-blue-400" />
              </div>
              <h2 className="text-base font-semibold text-white">Đăng bài</h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Content editor */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Nội dung bài đăng</label>
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  placeholder="Nhập nội dung bài viết hoặc chọn từ bài được tạo bên trên..."
                  rows={5}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/60 resize-none transition-all"
                />
                <p className="text-xs text-gray-500 mt-1 text-right">{editContent.length} ký tự</p>
              </div>

              {/* Page selector */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Chọn Pages để đăng</label>
                {pages.length === 0 ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Thêm ít nhất 1 Facebook Page ở cột trái để đăng bài
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {pages.map(page => (
                      <button
                        key={page.id}
                        onClick={() => togglePageSelect(page.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                          selectedPages.has(page.id)
                            ? 'bg-blue-600/30 border-blue-500/50 text-white'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${page.verified ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                        {page.name}
                        {selectedPages.has(page.id) && <Check className="w-3 h-3 text-blue-300" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Schedule toggle */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setScheduleEnabled(v => !v)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-all ${
                    scheduleEnabled
                      ? 'bg-orange-600/20 border-orange-500/40 text-orange-400'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  {scheduleEnabled ? 'Đã bật lên lịch' : 'Lên lịch đăng'}
                </button>
                {scheduleEnabled && (
                  <input
                    type="datetime-local"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50 [color-scheme:dark]"
                  />
                )}
              </div>

              {/* Post button */}
              <button
                onClick={handlePost}
                disabled={posting || !editContent.trim() || selectedPages.size === 0 || (scheduleEnabled && !scheduleTime)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {posting ? 'Đang đăng...' : scheduleEnabled ? `Lên lịch cho ${selectedPages.size} page` : `Đăng ngay lên ${selectedPages.size} page`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
