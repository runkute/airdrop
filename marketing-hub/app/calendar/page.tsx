'use client'

import { useState, useEffect } from 'react'
import { storage } from '@/lib/storage'
import { ContentPost, Platform, ContentStatus } from '@/lib/types'
import { Plus, X, Calendar, FileText, Lightbulb, Clock, CheckCircle2 } from 'lucide-react'

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

  const handleDelete = (id: string) => {
    savePosts(posts.filter((p) => p.id !== id))
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
        <button
          onClick={() => { setForm({ ...defaultForm }); setEditId(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25"
        >
          <Plus className="w-4 h-4" />
          Add Post
        </button>
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

      {/* Kanban Board */}
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
                          onClick={() => handleDelete(post.id)}
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
