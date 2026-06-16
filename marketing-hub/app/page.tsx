'use client'

import { useState, useEffect } from 'react'
import { storage } from '@/lib/storage'
import { ContentPost, Campaign } from '@/lib/types'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  Users,
  DollarSign,
  Target,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Megaphone,
  FileDown,
  Download,
  Upload,
} from 'lucide-react'
import { exportDashboardPDF } from '@/lib/pdf'

const weeklyData = [
  { week: 'T1', reach: 45000, clicks: 1800, conversions: 90 },
  { week: 'T2', reach: 62000, clicks: 2400, conversions: 120 },
  { week: 'T3', reach: 58000, clicks: 2200, conversions: 110 },
  { week: 'T4', reach: 75000, clicks: 3000, conversions: 150 },
  { week: 'T5', reach: 82000, clicks: 3500, conversions: 175 },
  { week: 'T6', reach: 95000, clicks: 4200, conversions: 210 },
  { week: 'T7', reach: 88000, clicks: 3800, conversions: 190 },
  { week: 'T8', reach: 110000, clicks: 4800, conversions: 240 },
]

const platformColors: Record<string, string> = {
  facebook: 'bg-blue-500',
  instagram: 'bg-pink-500',
  tiktok: 'bg-slate-800',
  youtube: 'bg-red-500',
  twitter: 'bg-sky-400',
  linkedin: 'bg-blue-700',
}

const statusColors: Record<string, string> = {
  active: 'text-emerald-400 bg-emerald-400/10',
  paused: 'text-yellow-400 bg-yellow-400/10',
  completed: 'text-blue-400 bg-blue-400/10',
  draft: 'text-gray-400 bg-gray-400/10',
}

const postStatusColors: Record<string, string> = {
  idea: 'text-purple-400 bg-purple-400/10',
  draft: 'text-yellow-400 bg-yellow-400/10',
  scheduled: 'text-blue-400 bg-blue-400/10',
  published: 'text-emerald-400 bg-emerald-400/10',
}

export default function DashboardPage() {
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  const handleBackup = () => {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      posts: storage.getPosts(),
      campaigns: storage.getCampaigns(),
      keywords: storage.getKeywords(),
      competitors: storage.getCompetitors(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `marketing-hub-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!data.version) throw new Error('Invalid backup file')
        if (!window.confirm('Khôi phục dữ liệu sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại.\n\nTiếp tục?')) return
        if (data.posts) storage.savePosts(data.posts)
        if (data.campaigns) storage.saveCampaigns(data.campaigns)
        if (data.keywords) storage.saveKeywords(data.keywords)
        if (data.competitors) storage.saveCompetitors(data.competitors)
        window.location.reload()
      } catch {
        alert('File backup không hợp lệ')
      }
    }
    reader.readAsText(file)
  }

  useEffect(() => {
    setPosts(storage.getPosts())
    setCampaigns(storage.getCampaigns())
  }, [])

  const recentPosts = posts.slice(-4).reverse()
  const topCampaigns = [...campaigns].sort((a, b) => b.revenue - a.revenue).slice(0, 3)

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const kpiCards = [
    {
      title: 'Total Reach',
      value: '555,000',
      change: '+12.5%',
      positive: true,
      icon: Users,
      gradient: 'from-purple-600/20 to-pink-600/20',
      border: 'border-purple-500/30',
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/20',
    },
    {
      title: 'Total Revenue',
      value: '46,800,000 ₫',
      change: '+8.3%',
      positive: true,
      icon: DollarSign,
      gradient: 'from-emerald-600/20 to-teal-600/20',
      border: 'border-emerald-500/30',
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/20',
    },
    {
      title: 'Conversions',
      value: '657',
      change: '+5.1%',
      positive: true,
      icon: Target,
      gradient: 'from-blue-600/20 to-cyan-600/20',
      border: 'border-blue-500/30',
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/20',
    },
    {
      title: 'Avg ROAS',
      value: '5.2x',
      change: '-0.3x',
      positive: false,
      icon: TrendingUp,
      gradient: 'from-orange-600/20 to-yellow-600/20',
      border: 'border-orange-500/30',
      iconColor: 'text-orange-400',
      iconBg: 'bg-orange-500/20',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 text-xs hover:text-gray-200 hover:border-white/20 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Backup
          </button>
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 text-xs hover:text-gray-200 hover:border-white/20 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            Restore
            <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
          </label>
          <button
            onClick={() => exportDashboardPDF(campaigns, posts)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 text-red-400 text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            Export PDF
          </button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-gray-300">Live</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              className={`rounded-2xl border p-5 bg-gradient-to-br ${card.gradient} ${card.border} backdrop-blur-sm`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <span
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                    card.positive
                      ? 'bg-emerald-400/10 text-emerald-400'
                      : 'bg-red-400/10 text-red-400'
                  }`}
                >
                  {card.positive ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {card.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-white leading-tight">{card.value}</p>
              <p className="text-gray-400 text-sm mt-1">{card.title}</p>
            </div>
          )
        })}
      </div>

      {/* Performance Chart */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Performance Overview</h2>
            <p className="text-gray-400 text-sm">Last 8 weeks</p>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" />
              <XAxis dataKey="week" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                }}
              />
              <Legend
                wrapperStyle={{ color: '#9ca3af', fontSize: '12px', paddingTop: '16px' }}
              />
              <Area
                type="monotone"
                dataKey="reach"
                stroke="#a855f7"
                strokeWidth={2}
                fill="url(#reachGrad)"
                name="Reach"
              />
              <Area
                type="monotone"
                dataKey="clicks"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#clicksGrad)"
                name="Clicks"
              />
              <Area
                type="monotone"
                dataKey="conversions"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#convGrad)"
                name="Conversions"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Posts */}
        <div className="rounded-2xl border border-white/10 bg-[#12121a] p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Recent Posts</h2>
            </div>
            <a href="/calendar" className="text-purple-400 text-sm hover:text-purple-300 transition-colors">
              View all
            </a>
          </div>
          <div className="space-y-3">
            {recentPosts.map((post) => (
              <div key={post.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{post.title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${postStatusColors[post.status]}`}>
                      {post.status}
                    </span>
                    <div className="flex gap-1">
                      {post.platform.map((p) => (
                        <span key={p} className={`w-2 h-2 rounded-full ${platformColors[p]}`} title={p} />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-gray-500 text-xs flex-shrink-0">
                  {post.scheduledDate || post.publishedDate || post.createdAt}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Campaigns */}
        <div className="rounded-2xl border border-white/10 bg-[#12121a] p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-pink-400" />
              <h2 className="text-lg font-semibold text-white">Top Campaigns</h2>
            </div>
            <a href="/campaigns" className="text-pink-400 text-sm hover:text-pink-300 transition-colors">
              View all
            </a>
          </div>
          <div className="space-y-3">
            {topCampaigns.map((campaign, i) => {
              const roas = campaign.spent > 0 ? (campaign.revenue / campaign.spent).toFixed(1) : '0.0'
              return (
                <div key={campaign.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
                    <span className="text-white text-xs font-bold">#{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{campaign.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[campaign.status]}`}>
                        {campaign.status}
                      </span>
                      <span className="text-gray-500 text-xs">{campaign.platform}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white text-sm font-semibold">
                      {campaign.revenue.toLocaleString()} ₫
                    </p>
                    <p className="text-orange-400 text-xs">{roas}x ROAS</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
