'use client'

import { useState, useEffect } from 'react'
import {
  Globe2, MapPin, DollarSign, TrendingUp, Plus, Trash2, BarChart3,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { PROVINCES, REGIONS, type Province, type GeoTarget } from '@/lib/vietnam-geo'

const GEO_STORAGE_KEY = 'mh_geo_targets'

function loadTargets(): GeoTarget[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(GEO_STORAGE_KEY) || '[]') } catch { return [] }
}
function saveTargets(targets: GeoTarget[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(GEO_STORAGE_KEY, JSON.stringify(targets))
}

function calcBudgetAllocation(
  totalBudget: number,
  targetRegion: string,
  audience: string,
  provinces: Province[],
) {
  const filtered = targetRegion === 'all' ? provinces : provinces.filter(p => p.region === targetRegion)

  const weights = filtered.map(p => {
    switch (audience) {
      case 'mass': return p.internetUsers
      case 'tier1': return p.tier === 1 ? p.internetUsers * 2 : p.tier === 2 ? p.internetUsers * 0.5 : 0
      case 'ecommerce': return p.ecommerceUsers
      case 'highincome': return p.avgIncome * p.population / 100
      default: return p.internetUsers
    }
  })

  const total = weights.reduce((s, w) => s + w, 0)
  return filtered
    .map((p, i) => ({
      province: p,
      pct: total > 0 ? Math.round((weights[i] / total) * 100) : 0,
      budget: total > 0 ? Math.round((weights[i] / total) * totalBudget) : 0,
    }))
    .filter(x => x.pct > 0)
    .sort((a, b) => b.pct - a.pct)
}

const REGION_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'north', label: 'Miền Bắc' },
  { value: 'central', label: 'Miền Trung' },
  { value: 'south', label: 'Miền Nam' },
]

const TIER_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả Tier' },
  { value: '1', label: 'Tier 1' },
  { value: '2', label: 'Tier 2' },
  { value: '3', label: 'Tier 3' },
]

const CHANNELS = ['Facebook', 'Google', 'TikTok', 'Email']

const REGION_TARGET_OPTIONS = [
  { value: 'all', label: 'Toàn quốc' },
  { value: 'north', label: 'Miền Bắc' },
  { value: 'south', label: 'Miền Nam' },
  { value: 'central', label: 'Miền Trung' },
]

const AUDIENCE_OPTIONS = [
  { value: 'mass', label: 'Mass Market' },
  { value: 'tier1', label: 'Tier 1 Cities' },
  { value: 'ecommerce', label: 'E-commerce Buyers' },
  { value: 'highincome', label: 'High Income' },
]

function regionBadge(region: 'north' | 'central' | 'south') {
  const map = {
    north: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    central: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    south: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  }
  return map[region]
}

function tierBadge(tier: 1 | 2 | 3) {
  const map = {
    1: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    2: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    3: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  }
  return map[tier]
}

// ─── Summary Cards ──────────────────────────────────────────────────────────

function MarketSummaryCards() {
  const topInternet = [...PROVINCES].sort((a, b) => b.internetUsers - a.internetUsers)[0]
  const topIncome = [...PROVINCES].sort((a, b) => b.avgIncome - a.avgIncome)[0]
  const topTiktok = [...PROVINCES].sort((a, b) => b.tiktokIndex - a.tiktokIndex)[0]

  const cards = [
    {
      label: 'Top Internet Users',
      value: topInternet.name,
      sub: `${topInternet.internetUsers.toLocaleString()}K users · ${topInternet.internetPct}% penetration`,
      icon: Globe2,
      gradient: 'from-teal-600/20 to-cyan-500/20',
      border: 'border-teal-500/30',
      iconBg: 'bg-teal-500/20',
      iconColor: 'text-teal-400',
    },
    {
      label: 'Highest Avg Income',
      value: topIncome.name,
      sub: `${topIncome.avgIncome}M VND/tháng · ${REGIONS[topIncome.region].name}`,
      icon: DollarSign,
      gradient: 'from-emerald-600/20 to-green-500/20',
      border: 'border-emerald-500/30',
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-400',
    },
    {
      label: 'Best TikTok Engagement',
      value: topTiktok.name,
      sub: `TikTok Index: ${topTiktok.tiktokIndex}/100`,
      icon: TrendingUp,
      gradient: 'from-pink-600/20 to-rose-500/20',
      border: 'border-pink-500/30',
      iconBg: 'bg-pink-500/20',
      iconColor: 'text-pink-400',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className={`rounded-2xl border p-5 bg-gradient-to-br ${card.gradient} ${card.border}`}
          >
            <div className={`inline-flex p-2.5 rounded-xl ${card.iconBg} mb-3`}>
              <Icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">{card.label}</p>
            <p className="text-white font-bold text-lg leading-tight">{card.value}</p>
            <p className="text-gray-400 text-xs mt-1">{card.sub}</p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Tab 1: Market Overview ──────────────────────────────────────────────────

function MarketTab() {
  const [regionFilter, setRegionFilter] = useState('all')
  const [tierFilter, setTierFilter] = useState('all')

  const top8 = [...PROVINCES]
    .sort((a, b) => b.internetUsers - a.internetUsers)
    .slice(0, 8)
    .map(p => ({
      name: p.name.replace('TP. ', '').replace(' (Khánh Hòa)', '').replace(' (TT-Huế)', '').replace(' (BR-VT)', ''),
      internetUsers: p.internetUsers,
      facebookUsers: p.facebookUsers,
    }))

  const filtered = PROVINCES.filter(p => {
    const regionOk = regionFilter === 'all' || p.region === regionFilter
    const tierOk = tierFilter === 'all' || p.tier === Number(tierFilter)
    return regionOk && tierOk
  })

  return (
    <div className="space-y-6">
      <MarketSummaryCards />

      {/* Bar Chart */}
      <div className="rounded-2xl bg-[#12121a] border border-white/10 p-6">
        <h3 className="text-base font-semibold text-white mb-1">Top 8 Tỉnh/Thành theo Người Dùng Internet</h3>
        <p className="text-gray-500 text-xs mb-5">Đơn vị: nghìn người</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top8} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: 12,
                }}
                formatter={(v) => [`${Number(v).toLocaleString()}K`, '']}
              />
              <Legend wrapperStyle={{ color: '#9ca3af', fontSize: '12px', paddingTop: '12px' }} />
              <Bar dataKey="internetUsers" name="Internet Users" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="facebookUsers" name="Facebook Users" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Khu vực:</span>
          <div className="flex gap-1.5">
            {REGION_FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setRegionFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  regionFilter === opt.value
                    ? 'bg-teal-600/40 text-teal-300 border border-teal-500/40'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Tier:</span>
          <div className="flex gap-1.5">
            {TIER_FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setTierFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  tierFilter === opt.value
                    ? 'bg-emerald-600/40 text-emerald-300 border border-emerald-500/40'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <span className="text-xs text-gray-600 ml-auto">{filtered.length} tỉnh/thành</span>
      </div>

      {/* Province Table */}
      <div className="rounded-2xl bg-[#12121a] border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wider">Tỉnh/Thành</th>
                <th className="text-left px-4 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wider">Khu vực</th>
                <th className="text-right px-4 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wider">Dân số (K)</th>
                <th className="text-right px-4 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wider">Internet%</th>
                <th className="text-right px-4 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wider">Thu nhập TB</th>
                <th className="text-right px-4 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wider">E-comm (K)</th>
                <th className="text-center px-4 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wider">Tier</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr
                  key={p.code}
                  className={`border-b border-white/5 transition-colors hover:bg-white/5 ${
                    i % 2 === 0 ? 'bg-white/[0.02]' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${regionBadge(p.region)}`}>
                      {REGIONS[p.region].name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">{p.population.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${p.internetPct >= 70 ? 'text-teal-400' : p.internetPct >= 60 ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {p.internetPct}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">{p.avgIncome}M ₫</td>
                  <td className="px-4 py-3 text-right text-gray-300">{p.ecommerceUsers.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tierBadge(p.tier)}`}>
                      Tier {p.tier}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Tab 2: Budget Allocation ────────────────────────────────────────────────

const REGION_PIE_COLORS: Record<string, string> = {
  north: '#3b82f6',
  central: '#f97316',
  south: '#10b981',
}

function BudgetTab() {
  const [totalBudget, setTotalBudget] = useState(100000000)
  const [targetRegion, setTargetRegion] = useState('all')
  const [audience, setAudience] = useState('mass')
  const [allocation, setAllocation] = useState<ReturnType<typeof calcBudgetAllocation>>([])
  const [calculated, setCalculated] = useState(false)

  const handleCalc = () => {
    const result = calcBudgetAllocation(totalBudget, targetRegion, audience, PROVINCES)
    setAllocation(result)
    setCalculated(true)
  }

  // Pie chart: aggregate by region
  const regionAgg = allocation.reduce<Record<string, number>>((acc, row) => {
    acc[row.province.region] = (acc[row.province.region] || 0) + row.budget
    return acc
  }, {})
  const pieData = Object.entries(regionAgg).map(([region, budget]) => ({
    name: REGIONS[region as keyof typeof REGIONS]?.name || region,
    value: budget,
    color: REGION_PIE_COLORS[region] || '#6b7280',
  }))

  return (
    <div className="space-y-6">
      {/* Config panel */}
      <div className="rounded-2xl bg-[#12121a] border border-white/10 p-6">
        <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-teal-400" />
          Gợi ý phân bổ ngân sách
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {/* Budget Input */}
          <div>
            <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
              Tổng ngân sách (VND)
            </label>
            <input
              type="number"
              value={totalBudget}
              onChange={e => setTotalBudget(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500/60 transition-all"
              min={0}
              step={1000000}
            />
            <p className="text-xs text-gray-600 mt-1">{(totalBudget / 1000000).toFixed(0)}M VND</p>
          </div>

          {/* Region Select */}
          <div>
            <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
              Khu vực mục tiêu
            </label>
            <select
              value={targetRegion}
              onChange={e => setTargetRegion(e.target.value)}
              className="w-full bg-[#0d0d1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500/60 transition-all"
            >
              {REGION_TARGET_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Audience Select */}
          <div>
            <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
              Đối tượng mục tiêu
            </label>
            <select
              value={audience}
              onChange={e => setAudience(e.target.value)}
              className="w-full bg-[#0d0d1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500/60 transition-all"
            >
              {AUDIENCE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleCalc}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-teal-500/20"
        >
          <BarChart3 className="w-4 h-4" />
          Tính phân bổ tối ưu
        </button>
      </div>

      {/* Results */}
      {calculated && allocation.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Allocation Table */}
          <div className="lg:col-span-2 rounded-2xl bg-[#12121a] border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h4 className="text-sm font-semibold text-white">Phân bổ ngân sách theo tỉnh/thành</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-4 py-2.5 text-gray-500 text-xs font-semibold">Tỉnh/Thành</th>
                    <th className="text-left px-4 py-2.5 text-gray-500 text-xs font-semibold">Khu vực</th>
                    <th className="text-right px-4 py-2.5 text-gray-500 text-xs font-semibold">Tỷ lệ %</th>
                    <th className="text-right px-4 py-2.5 text-gray-500 text-xs font-semibold">Ngân sách (VND)</th>
                  </tr>
                </thead>
                <tbody>
                  {allocation.map((row, i) => (
                    <tr key={row.province.code} className={`border-b border-white/5 hover:bg-white/5 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
                      <td className="px-4 py-2.5 text-white font-medium">{row.province.name}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${regionBadge(row.province.region)}`}>
                          {REGIONS[row.province.region].name}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full"
                              style={{ width: `${row.pct}%` }}
                            />
                          </div>
                          <span className="text-teal-400 font-semibold w-8 text-right">{row.pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-300 font-mono text-xs">
                        {row.budget.toLocaleString()}₫
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="rounded-2xl bg-[#12121a] border border-white/10 p-5">
            <h4 className="text-sm font-semibold text-white mb-4">Phân bổ theo khu vực</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a2e',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: 12,
                    }}
                    formatter={(value) => [`${Number(value).toLocaleString()}₫`, undefined]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-gray-400">{d.name}</span>
                  </div>
                  <span className="text-gray-300 font-mono">{(d.value / 1000000).toFixed(1)}M</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {calculated && allocation.length === 0 && (
        <div className="rounded-2xl bg-[#12121a] border border-white/10 p-10 text-center">
          <p className="text-gray-400">Không có dữ liệu cho bộ lọc này.</p>
        </div>
      )}
    </div>
  )
}

// ─── Tab 3: GEO Campaign Tracking ────────────────────────────────────────────

const CPA_GOOD = 50000
const CPA_MED = 150000

function cpaBadge(cpa: number) {
  if (cpa <= CPA_GOOD) return 'text-emerald-400'
  if (cpa <= CPA_MED) return 'text-yellow-400'
  return 'text-red-400'
}

function CampaignTab() {
  const [targets, setTargets] = useState<GeoTarget[]>([])
  const [form, setForm] = useState({
    provinceCode: PROVINCES[0].code,
    channel: 'Facebook',
    budget: 5000000,
    reach: 10000,
    conversions: 50,
    notes: '',
  })

  useEffect(() => {
    setTargets(loadTargets())
  }, [])

  const persistTargets = (updated: GeoTarget[]) => {
    setTargets(updated)
    saveTargets(updated)
  }

  const handleAdd = () => {
    const cpa = form.conversions > 0 ? Math.round(form.budget / form.conversions) : 0
    const newTarget: GeoTarget = {
      id: Date.now().toString(),
      provinceCode: form.provinceCode,
      channel: form.channel,
      budget: form.budget,
      reach: form.reach,
      conversions: form.conversions,
      cpa,
      notes: form.notes,
      createdAt: new Date().toISOString().split('T')[0],
    }
    persistTargets([...targets, newTarget])
    setForm(f => ({ ...f, notes: '' }))
  }

  const handleDelete = (id: string) => {
    persistTargets(targets.filter(t => t.id !== id))
  }

  const totalBudget = targets.reduce((s, t) => s + t.budget, 0)
  const totalReach = targets.reduce((s, t) => s + t.reach, 0)
  const totalConversions = targets.reduce((s, t) => s + t.conversions, 0)
  const avgCpa = totalConversions > 0 ? Math.round(totalBudget / totalConversions) : 0

  const getProvince = (code: string) => PROVINCES.find(p => p.code === code)

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      {targets.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Tổng ngân sách', value: `${(totalBudget / 1000000).toFixed(1)}M ₫`, color: 'text-teal-400' },
            { label: 'Tổng Reach', value: totalReach.toLocaleString(), color: 'text-blue-400' },
            { label: 'Avg CPA', value: `${avgCpa.toLocaleString()} ₫`, color: cpaBadge(avgCpa) },
          ].map(s => (
            <div key={s.label} className="rounded-2xl bg-[#12121a] border border-white/10 p-4 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add Form */}
      <div className="rounded-2xl bg-[#12121a] border border-white/10 p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-teal-400" />
          Thêm GEO Target
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {/* Province */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Tỉnh/Thành</label>
            <select
              value={form.provinceCode}
              onChange={e => setForm(f => ({ ...f, provinceCode: e.target.value }))}
              className="w-full bg-[#0d0d1a] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500/60 transition-all"
            >
              {PROVINCES.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Channel */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Kênh</label>
            <select
              value={form.channel}
              onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
              className="w-full bg-[#0d0d1a] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500/60 transition-all"
            >
              {CHANNELS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Ngân sách (VND)</label>
            <input
              type="number"
              value={form.budget}
              onChange={e => setForm(f => ({ ...f, budget: Number(e.target.value) }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500/60 transition-all"
              min={0}
              step={500000}
            />
          </div>

          {/* Reach */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Reach</label>
            <input
              type="number"
              value={form.reach}
              onChange={e => setForm(f => ({ ...f, reach: Number(e.target.value) }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500/60 transition-all"
              min={0}
            />
          </div>

          {/* Conversions */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Conversions</label>
            <input
              type="number"
              value={form.conversions}
              onChange={e => setForm(f => ({ ...f, conversions: Number(e.target.value) }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500/60 transition-all"
              min={0}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Ghi chú</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="(tùy chọn)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-teal-500/60 transition-all"
            />
          </div>
        </div>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-teal-500/20"
        >
          <Plus className="w-4 h-4" />
          Thêm mục tiêu
        </button>
      </div>

      {/* Targets Table */}
      {targets.length > 0 ? (
        <div className="rounded-2xl bg-[#12121a] border border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h4 className="text-sm font-semibold text-white">{targets.length} GEO Target đang theo dõi</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-gray-500 text-xs font-semibold">Tỉnh/Thành</th>
                  <th className="text-left px-4 py-3 text-gray-500 text-xs font-semibold">Kênh</th>
                  <th className="text-right px-4 py-3 text-gray-500 text-xs font-semibold">Ngân sách</th>
                  <th className="text-right px-4 py-3 text-gray-500 text-xs font-semibold">Reach</th>
                  <th className="text-right px-4 py-3 text-gray-500 text-xs font-semibold">Conv.</th>
                  <th className="text-right px-4 py-3 text-gray-500 text-xs font-semibold">CPA</th>
                  <th className="text-left px-4 py-3 text-gray-500 text-xs font-semibold">Ghi chú</th>
                  <th className="text-left px-4 py-3 text-gray-500 text-xs font-semibold">Ngày</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {targets.map((t, i) => {
                  const prov = getProvince(t.provinceCode)
                  return (
                    <tr
                      key={t.id}
                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                          <span className="text-white font-medium text-xs">{prov?.name || t.provinceCode}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-lg bg-white/10 text-gray-300 text-xs">{t.channel}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300 text-xs font-mono">
                        {(t.budget / 1000000).toFixed(1)}M
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300 text-xs">{t.reach.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-gray-300 text-xs">{t.conversions}</td>
                      <td className={`px-4 py-3 text-right text-xs font-semibold ${cpaBadge(t.cpa)}`}>
                        {t.cpa.toLocaleString()}₫
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[120px] truncate">{t.notes || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{t.createdAt}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-white/5 flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> CPA tốt: &lt;{CPA_GOOD.toLocaleString()}₫</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Trung bình: &lt;{CPA_MED.toLocaleString()}₫</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Cao</span>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#12121a] border border-white/10 p-16 text-center">
          <div className="inline-flex p-5 rounded-2xl bg-teal-600/10 border border-teal-500/20 mb-4">
            <Globe2 className="w-10 h-10 text-teal-500" />
          </div>
          <p className="text-gray-400 font-medium">Chưa có GEO target nào</p>
          <p className="text-gray-600 text-sm mt-1">Thêm mục tiêu ở trên để bắt đầu theo dõi</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'market', label: 'Thị trường' },
  { id: 'budget', label: 'Phân bổ ngân sách GEO' },
  { id: 'campaign', label: 'Theo dõi GEO Campaign' },
]

export default function GeoPage() {
  const [activeTab, setActiveTab] = useState('market')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-teal-600/30 to-emerald-500/20 border border-teal-500/30">
              <Globe2 className="w-5 h-5 text-teal-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">GEO Targeting</h1>
          </div>
          <p className="text-gray-400 text-sm mt-1 ml-11">
            Phân tích thị trường địa lý Việt Nam · Tối ưu ngân sách theo tỉnh/vùng
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-600/10 border border-teal-500/20 text-teal-400 text-sm">
          <MapPin className="w-4 h-4" />
          {PROVINCES.length} tỉnh/thành
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-teal-600/40 to-emerald-500/40 text-white border border-teal-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'market' && <MarketTab />}
      {activeTab === 'budget' && <BudgetTab />}
      {activeTab === 'campaign' && <CampaignTab />}
    </div>
  )
}
