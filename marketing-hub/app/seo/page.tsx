'use client'

import { useState, useEffect } from 'react'
import { Plus, X, TrendingUp, TrendingDown, Minus, Search, Globe, BarChart2, FileDown } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { storage } from '@/lib/storage'
import { Keyword, Competitor } from '@/lib/types'
import { exportSEOPDF } from '@/lib/pdf'

const MY_SITE = { name: 'Your Site', da: 35, traffic: 95000, keywords: 4200 }

const emptyKeyword = { keyword: '', currentRank: '', previousRank: '', searchVolume: '', difficulty: '', url: '' }
const emptyCompetitor = { name: '', website: '', domainAuthority: '', estimatedTraffic: '', keywords: '', notes: '' }

function fmt(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return n.toString()
}

export default function SEOPage() {
  const [tab, setTab] = useState<'keywords' | 'competitors'>('keywords')
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [showKwModal, setShowKwModal] = useState(false)
  const [showCompModal, setShowCompModal] = useState(false)
  const [kwForm, setKwForm] = useState({ ...emptyKeyword })
  const [compForm, setCompForm] = useState({ ...emptyCompetitor })

  useEffect(() => {
    setKeywords(storage.getKeywords())
    setCompetitors(storage.getCompetitors())
  }, [])

  const saveKw = (data: Keyword[]) => { setKeywords(data); storage.saveKeywords(data) }
  const saveComp = (data: Competitor[]) => { setCompetitors(data); storage.saveCompetitors(data) }

  const addKeyword = (e: React.FormEvent) => {
    e.preventDefault()
    const num = (v: string) => parseInt(v) || 0
    const kw: Keyword = {
      id: Date.now().toString(),
      keyword: kwForm.keyword,
      currentRank: num(kwForm.currentRank),
      previousRank: num(kwForm.previousRank),
      searchVolume: num(kwForm.searchVolume),
      difficulty: Math.min(100, Math.max(0, num(kwForm.difficulty))),
      url: kwForm.url || undefined,
      createdAt: new Date().toISOString().split('T')[0],
    }
    saveKw([...keywords, kw])
    setKwForm({ ...emptyKeyword })
    setShowKwModal(false)
  }

  const addCompetitor = (e: React.FormEvent) => {
    e.preventDefault()
    const num = (v: string) => parseInt(v) || 0
    const comp: Competitor = {
      id: Date.now().toString(),
      name: compForm.name,
      website: compForm.website,
      domainAuthority: num(compForm.domainAuthority),
      estimatedTraffic: num(compForm.estimatedTraffic),
      keywords: num(compForm.keywords),
      notes: compForm.notes || undefined,
      createdAt: new Date().toISOString().split('T')[0],
    }
    saveComp([...competitors, comp])
    setCompForm({ ...emptyCompetitor })
    setShowCompModal(false)
  }

  const avgRank = keywords.length > 0
    ? (keywords.reduce((s, k) => s + k.currentRank, 0) / keywords.length).toFixed(1)
    : '—'
  const top10 = keywords.filter(k => k.currentRank <= 10).length
  const improved = keywords.filter(k => k.currentRank < k.previousRank).length

  const chartData = [
    { name: MY_SITE.name, traffic: MY_SITE.traffic, da: MY_SITE.da, keywords: MY_SITE.keywords },
    ...competitors.map(c => ({ name: c.name, traffic: c.estimatedTraffic, da: c.domainAuthority, keywords: c.keywords })),
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">SEO Toolkit</h1>
          <p className="text-gray-400 text-sm mt-0.5">Theo dõi ranking và phân tích đối thủ</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportSEOPDF(keywords, competitors)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={() => tab === 'keywords' ? setShowKwModal(true) : setShowCompModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/25"
          >
            <Plus className="w-4 h-4" />
            {tab === 'keywords' ? 'Thêm Keyword' : 'Thêm Đối thủ'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 w-fit">
        {[
          { id: 'keywords', label: 'Keyword Tracker', icon: Search },
          { id: 'competitors', label: 'Competitor Analysis', icon: BarChart2 },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as typeof tab)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id
                ? 'bg-gradient-to-r from-blue-600/40 to-cyan-500/40 text-white border border-blue-500/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Keyword Tracker */}
      {tab === 'keywords' && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Keywords', value: keywords.length.toString(), color: 'text-purple-400', bg: 'from-purple-600/20 to-pink-600/20 border-purple-500/30' },
              { label: 'Avg Position', value: avgRank, color: 'text-blue-400', bg: 'from-blue-600/20 to-cyan-600/20 border-blue-500/30' },
              { label: 'Top 10', value: top10.toString(), color: 'text-emerald-400', bg: 'from-emerald-600/20 to-teal-600/20 border-emerald-500/30' },
              { label: 'Improved', value: improved.toString(), color: 'text-orange-400', bg: 'from-orange-600/20 to-yellow-600/20 border-orange-500/30' },
            ].map((stat) => (
              <div key={stat.label} className={`rounded-2xl border bg-gradient-to-br ${stat.bg} p-4`}>
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Keywords Table */}
          <div className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Keyword', 'Current Rank', 'Change', 'Search Vol', 'Difficulty', 'URL', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keywords.map((kw) => {
                  const diff = kw.previousRank - kw.currentRank
                  const isUp = diff > 0
                  const isDown = diff < 0
                  return (
                    <tr key={kw.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Search className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-sm text-white font-medium">{kw.keyword}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-lg font-bold ${kw.currentRank <= 3 ? 'text-emerald-400' : kw.currentRank <= 10 ? 'text-blue-400' : kw.currentRank <= 20 ? 'text-yellow-400' : 'text-gray-400'}`}>
                          #{kw.currentRank}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1 text-sm font-semibold ${isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-gray-500'}`}>
                          {isUp ? <TrendingUp className="w-4 h-4" /> : isDown ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                          {diff !== 0 ? (isUp ? `+${diff}` : diff) : '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{fmt(kw.searchVolume)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-white/10 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${kw.difficulty >= 70 ? 'bg-red-500' : kw.difficulty >= 40 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                              style={{ width: `${kw.difficulty}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">{kw.difficulty}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{kw.url || '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => saveKw(keywords.filter(k => k.id !== kw.id))} className="text-red-400/40 hover:text-red-400 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Competitor Analysis */}
      {tab === 'competitors' && (
        <>
          {/* Competitor Cards */}
          <div className="grid grid-cols-3 gap-4">
            {/* Your Site */}
            <div className="rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{MY_SITE.name}</p>
                  <p className="text-gray-400 text-xs">Your website</p>
                </div>
                <div className="ml-auto px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300 text-xs font-medium">You</div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-lg font-bold text-white">{MY_SITE.da}</p><p className="text-xs text-gray-400">DA</p></div>
                <div><p className="text-lg font-bold text-white">{fmt(MY_SITE.traffic)}</p><p className="text-xs text-gray-400">Traffic</p></div>
                <div><p className="text-lg font-bold text-white">{fmt(MY_SITE.keywords)}</p><p className="text-xs text-gray-400">Keywords</p></div>
              </div>
            </div>
            {competitors.map(comp => (
              <div key={comp.id} className="rounded-2xl bg-[#12121a] border border-white/10 p-5 hover:border-white/20 transition-colors group">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{comp.name}</p>
                    <p className="text-gray-400 text-xs truncate">{comp.website}</p>
                  </div>
                  <button
                    onClick={() => saveComp(competitors.filter(c => c.id !== comp.id))}
                    className="opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-400 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className={`text-lg font-bold ${comp.domainAuthority > MY_SITE.da ? 'text-red-400' : 'text-emerald-400'}`}>{comp.domainAuthority}</p>
                    <p className="text-xs text-gray-400">DA</p>
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${comp.estimatedTraffic > MY_SITE.traffic ? 'text-red-400' : 'text-emerald-400'}`}>{fmt(comp.estimatedTraffic)}</p>
                    <p className="text-xs text-gray-400">Traffic</p>
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${comp.keywords > MY_SITE.keywords ? 'text-red-400' : 'text-emerald-400'}`}>{fmt(comp.keywords)}</p>
                    <p className="text-xs text-gray-400">Keywords</p>
                  </div>
                </div>
                {comp.notes && (
                  <p className="mt-3 text-xs text-gray-500 bg-white/5 rounded-lg px-3 py-2">{comp.notes}</p>
                )}
              </div>
            ))}
          </div>

          {/* Comparison Chart */}
          <div className="rounded-2xl border border-white/10 bg-[#12121a] p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Comparison: Traffic vs Domain Authority</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-3">Estimated Monthly Traffic</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" />
                    <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} formatter={(v) => [fmt(Number(v)), 'Traffic']} />
                    <Bar dataKey="traffic" fill="url(#trafficGrad)" radius={[4, 4, 0, 0]} />
                    <defs>
                      <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-3">Domain Authority</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" />
                    <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} formatter={(v) => [v, 'DA']} />
                    <Bar dataKey="da" fill="url(#daGrad)" radius={[4, 4, 0, 0]} />
                    <defs>
                      <linearGradient id="daGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Keyword Modal */}
      {showKwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12121a] shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Thêm Keyword</h2>
              <button onClick={() => setShowKwModal(false)} className="text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={addKeyword} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Keyword *</label>
                <input required value={kwForm.keyword} onChange={e => setKwForm(f => ({ ...f, keyword: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                  placeholder="e.g. digital marketing vietnam" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Current Rank', key: 'currentRank', placeholder: '1-100' },
                  { label: 'Previous Rank', key: 'previousRank', placeholder: '1-100' },
                  { label: 'Search Volume', key: 'searchVolume', placeholder: '1000' },
                  { label: 'Difficulty (0-100)', key: 'difficulty', placeholder: '50' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
                    <input type="number" min="0" value={kwForm[key as keyof typeof kwForm]}
                      onChange={e => setKwForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                      placeholder={placeholder} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">URL (optional)</label>
                <input value={kwForm.url} onChange={e => setKwForm(f => ({ ...f, url: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                  placeholder="/page-url" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowKwModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/5 transition-colors">Hủy</button>
                <button type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity">
                  Thêm Keyword
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Competitor Modal */}
      {showCompModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12121a] shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Thêm Đối thủ</h2>
              <button onClick={() => setShowCompModal(false)} className="text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={addCompetitor} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Tên *</label>
                  <input required value={compForm.name} onChange={e => setCompForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                    placeholder="Company name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Website *</label>
                  <input required value={compForm.website} onChange={e => setCompForm(f => ({ ...f, website: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                    placeholder="example.com" />
                </div>
              </div>
              {[
                { label: 'Domain Authority', key: 'domainAuthority', placeholder: '0-100' },
                { label: 'Est. Traffic/month', key: 'estimatedTraffic', placeholder: '10000' },
                { label: 'Keywords', key: 'keywords', placeholder: '1000' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
                  <input type="number" min="0" value={compForm[key as keyof typeof compForm]}
                    onChange={e => setCompForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                    placeholder={placeholder} />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Ghi chú</label>
                <textarea value={compForm.notes} onChange={e => setCompForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50 resize-none"
                  placeholder="Strengths, weaknesses..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCompModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/5 transition-colors">Hủy</button>
                <button type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity">
                  Thêm Đối thủ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
