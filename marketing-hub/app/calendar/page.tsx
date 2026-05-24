'use client'

import { useState, useEffect } from 'react'
import { storage } from '@/lib/storage'
import { ContentPost, Platform, ContentStatus } from '@/lib/types'
import { Plus, X, Calendar, FileText, Lightbulb, Clock, CheckCircle2, LayoutGrid, List, Columns, ChevronLeft, ChevronRight } from 'lucide-react'

const platformColors: Record<Platform, string> = {
  facebook: 'bg-blue-500 text-white',
  instagram: 'bg-pink-500 text-white',
  tiktok: 'bg-slate-700 text-white',
  youtube: 'bg-red-500 text-white',
  twitter: 'bg-sky-400 text-white',
  linkedin: 'bg-blue-700 text-white',
}

const statusConfig: Record<ContentStatus, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
  idea: {
    label: 'Idea',
    color: 'text-purple-400',
    icon: <Lightbulb className="w-4 h-4" />,
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
  draft: {
    label: 'Draft',
    color: 'text-yellow-400',
    icon: <FileText className="w-4 h-4" />,
    bg: 'bg-yellow-500/10 border-yellow-500/20',
  },
  scheduled: {
    label: 'Scheduled',
    color: 'text-blue-400',
    icon: <Clock className="w-4 h-4" />,
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  published: {
    label: 'Published',
    color: 'text-emerald-400',
    icon: <CheckCircle2 className="w-4 h-4" />,
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
}

const allStatuses: ContentStatus[] = ['idea', 'draft', 'scheduled', 'published']
const allPlatforms: Platform[] = ['facebook', 'instagram', 'tiktok', 'youtube', 'twitter', 'linkedin']

const dotColor: Record<string, string> = {
  facebook: 'bg-blue-500', instagram: 'bg-pink-500', tiktok: 'bg-slate-600',
  youtube: 'bg-red-500', twitter: 'bg-sky-400', linkedin: 'bg-blue-700',
}

function getDaysInMonth(date: Date): Date[] {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const days: Date[] = []
  const startDow = (firstDay.getDay() + 6) % 7 // 0=Mon
  for (let i = 0; i < startDow; i++) {
    days.push(new Date(year, month, -(startDow - 1 - i)))
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  while (days.length % 7 !== 0) {
    days.push(new Date(year, month + 1, days.length - lastDay.getDate() - startDow + 1))
  }
  return days
}

function getPostsForDay(posts: ContentPost[], date: Date): ContentPost[] {
  const dateStr = date.toISOString().split('T')[0]
  return posts.filter(p => p.scheduledDate === dateStr || p.publishedDate === dateStr)
}

const defaultForm = {
  title: '',
  content: '',
  platform: [] as Platform[],
  status: 'idea' as ContentStatus,
  scheduledDate: '',
  tags: '',
  notes: '',
}

export default function CalendarPage() {
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [filterStatus, setFilterStatus] = useState<ContentStatus | 'all'>('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ...defaultForm })
  const [editId, setEditId] = useState<string | null>(null)
  const [view, setView] = useState<'kanban' | 'list' | 'grid'>('kanban')
  const [gridMonth, setGridMonth] = useState(new Date())

  useEffect(() => {
    setPosts(storage.getPosts())
  }, [])

  const savePosts = (updated: ContentPost[]) => {
    setPosts(updated)
    storage.savePosts(updated)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const tagList = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    if (editId) {
      const updated = posts.map((p) =>
        p.id === editId
          ? {
              ...p,
              title: form.title,
              content: form.content,
              platform: form.platform,
              status: form.status,
              scheduledDate: form.scheduledDate || undefined,
              tags: tagList,
              notes: form.notes || undefined,
            }
          : p
      )
      savePosts(updated)
    } else {
      const newPost: ContentPost = {
        id: Date.now().toString(),
        title: form.title,
        content: form.content,
        platform: form.platform,
        status: form.status,
        scheduledDate: form.scheduledDate || undefined,
        tags: tagList,
        notes: form.notes || undefined,
        createdAt: new Date().toISOString().split('T')[0],
      }
      savePosts([...posts, newPost])
    }
    setShowModal(false)
    setForm({ ...defaultForm })
    setEditId(null)
  }

  const handleEdit = (post: ContentPost) => {
    setForm({
      title: post.title,
      content: post.content,
      platform: post.platform,
      status: post.status,
      scheduledDate: post.scheduledDate || '',
      tags: post.tags.join(', '),
      notes: post.notes || '',
    })
    setEditId(post.id)
    setShowModal(true)
  }

  const handleDelete = (post: ContentPost) => {
    if (!window.confirm(`Xóa bài "${post.title}"?\nHành động này không thể hoàn tác.`)) return
    savePosts(posts.filter((p) => p.id !== post.id))
  }

  const togglePlatform = (p: Platform) => {
    setForm((f) => ({
      ...f,
      platform: f.platform.includes(p) ? f.platform.filter((x) => x !== p) : [...f.platform, p],
    }))
  }

  const filtered = filterStatus === 'all' ? posts : posts.filter((p) => p.status === filterStatus)

  const columns = allStatuses.map((status) => ({
    status,
    posts: posts.filter((p) => p.status === status),
  }))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Content Calendar</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage and schedule your content</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              onClick={() => setView('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'kanban' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Columns className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'list' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
            <button
              onClick={() => setView('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'grid' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grid
            </button>
          </div>
          <button
            onClick={() => { setForm({ ...defaultForm }); setEditId(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25"
          >
            <Plus className="w-4 h-4" />
            Add Post
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filterStatus === 'all'
              ? 'bg-white/10 text-white border border-white/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          All ({posts.length})
        </button>
        {allStatuses.map((s) => {
          const cfg = statusConfig[s]
          const count = posts.filter((p) => p.status === s).length
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filterStatus === s
                  ? `${cfg.bg} ${cfg.color} border`
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className={cfg.color}>{cfg.icon}</span>
              {cfg.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map(({ status, posts: colPosts }) => {
            const cfg = statusConfig[status]
            const displayPosts = filterStatus === 'all' || filterStatus === status ? colPosts : []
            return (
              <div key={status} className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden">
                {/* Column header */}
                <div className={`flex items-center justify-between px-4 py-3 border-b border-white/10 ${cfg.bg}`}>
                  <div className={`flex items-center gap-2 ${cfg.color}`}>
                    {cfg.icon}
                    <span className="font-semibold text-sm">{cfg.label}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full bg-white/10 ${cfg.color}`}>
                    {displayPosts.length}
                  </span>
                </div>
                {/* Cards */}
                <div className="p-3 space-y-2 min-h-[200px]">
                  {displayPosts.map((post) => (
                    <div
                      key={post.id}
                      className="group p-3 rounded-xl bg-[#1a1a2e] border border-white/5 hover:border-white/15 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-white text-sm font-medium leading-snug flex-1">{post.title}</p>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={() => handleEdit(post)}
                            className="text-gray-500 hover:text-blue-400 transition-colors p-0.5"
                            title="Edit"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(post)}
                            className="text-gray-500 hover:text-red-400 transition-colors p-0.5"
                            title="Delete"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Platform badges */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {post.platform.map((p) => (
                          <span
                            key={p}
                            className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${platformColors[p]}`}
                          >
                            {p}
                          </span>
                        ))}
                      </div>

                      {/* Date */}
                      {(post.scheduledDate || post.publishedDate) && (
                        <div className="flex items-center gap-1 mt-2">
                          <Calendar className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-500 text-xs">
                            {post.scheduledDate || post.publishedDate}
                          </span>
                        </div>
                      )}

                      {/* Tags */}
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {post.tags.map((tag) => (
                            <span key={tag} className="text-xs text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {displayPosts.length === 0 && (
                    <div className="flex items-center justify-center h-24 text-gray-600 text-sm">
                      No posts
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">All Posts ({filtered.length})</h2>
          </div>
          <div className="divide-y divide-white/5">
            {filtered.map((post) => {
              const cfg = statusConfig[post.status]
              return (
                <div key={post.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/2 transition-colors group">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${cfg.bg} ${cfg.color} flex-shrink-0`}>
                    {cfg.icon}
                    {cfg.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{post.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {post.platform.map((p) => (
                        <span key={p} className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${platformColors[p]}`}>{p}</span>
                      ))}
                    </div>
                  </div>
                  {(post.scheduledDate || post.publishedDate) && (
                    <div className="flex items-center gap-1 text-gray-500 text-xs flex-shrink-0">
                      <Calendar className="w-3 h-3" />
                      {post.scheduledDate || post.publishedDate}
                    </div>
                  )}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => handleEdit(post)} className="text-gray-500 hover:text-blue-400 transition-colors p-1" title="Edit">
                      <FileText className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(post)} className="text-gray-500 hover:text-red-400 transition-colors p-1" title="Delete">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="flex items-center justify-center py-12 text-gray-600 text-sm">No posts found</div>
            )}
          </div>
        </div>
      )}

      {/* Grid (Calendar) View */}
      {view === 'grid' && (
        <div className="rounded-2xl border border-white/10 bg-[#12121a] p-4 space-y-4">
          {/* Month nav */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setGridMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}
              className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-white">
              {gridMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() => setGridMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}
              className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          {/* Day headers + cells */}
          <div className="grid grid-cols-7 gap-1">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
            ))}
            {getDaysInMonth(gridMonth).map((date, i) => {
              const dayPosts = getPostsForDay(filtered, date)
              const isToday = date.toDateString() === new Date().toDateString()
              const isCurrentMonth = date.getMonth() === gridMonth.getMonth()
              return (
                <div
                  key={i}
                  style={{ minHeight: '80px' }}
                  className={`rounded-lg p-1.5 border border-white/5 bg-[#1a1a2e] ${!isCurrentMonth ? 'opacity-30' : ''}`}
                >
                  <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ml-auto ${isToday ? 'bg-purple-600 text-white ring-2 ring-purple-400' : 'text-gray-400'}`}>
                    {date.getDate()}
                  </div>
                  {dayPosts.slice(0, 2).map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleEdit(p)}
                      className="flex items-center gap-1 mb-0.5 cursor-pointer rounded px-1 py-0.5 hover:bg-white/10 truncate"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor[p.platform[0]] || 'bg-gray-500'}`} />
                      <span className="text-xs text-gray-300 truncate">{p.title}</span>
                    </div>
                  ))}
                  {dayPosts.length > 2 && (
                    <div className="text-xs text-purple-400 px-1">+{dayPosts.length - 2} nữa</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#12121a] shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">
                {editId ? 'Edit Post' : 'New Post'}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditId(null); setForm({ ...defaultForm }) }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                  placeholder="Post title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Content</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 resize-none"
                  placeholder="Write your content..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {allPlatforms.map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                        form.platform.includes(p)
                          ? platformColors[p] + ' scale-105'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ContentStatus }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50"
                  >
                    {allStatuses.map((s) => (
                      <option key={s} value={s}>
                        {statusConfig[s].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Scheduled Date</label>
                  <input
                    type="date"
                    value={form.scheduledDate}
                    onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Tags (comma separated)</label>
                <input
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-purple-500/50"
                  placeholder="product, summer, promo"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditId(null); setForm({ ...defaultForm }) }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25"
                >
                  {editId ? 'Save Changes' : 'Create Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
