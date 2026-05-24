'use client'

import { useState, useEffect } from 'react'
import { Plus, X, TrendingUp, DollarSign, Target, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { storage } from '@/lib/storage'
import { Campaign, Platform, CampaignStatus } from '@/lib/types'

const PLATFORMS: Platform[] = ['facebook', 'instagram', 'tiktok', 'youtube', 'twitter', 'linkedin']
const STATUSES: CampaignStatus[] = ['active', 'paused', 'completed', 'draft']

const platformColors: Record<Platform, string> = {
  facebook: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  instagram: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  tiktok: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
  twitter: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  linkedin: 'bg-blue-700/20 text-blue-300 border-blue-700/30',
}

const statusConfig: Record<CampaignStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  paused: { label: 'Paused', color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' },
  completed: { label: 'Completed', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' },
  draft: { label: 'Draft', color: 'text-gray-400', bg: 'bg-gray-500/15 border-gray-500/30' },
}

const emptyForm = {
  name: '', platform: 'facebook' as Platform, status: 'draft' as CampaignStatus,
  budget: '', spent: '', impressions: '', clicks: '', conversions: '', revenue: '',
  startDate: '', endDate: '',
}

function fmt(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return n.toString()
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [roiSpend, setRoiSpend] = useState('')
  const [roiRevenue, setRoiRevenue] = useState('')
  const [roiConversions, setRoiConversions] = useState('')

  useEffect(() => { setCampaigns(storage.getCampaigns()) }, [])

  const save = (updated: Campaign[]) => { setCampaigns(updated); storage.saveCampaigns(updated) }

  const openNew = () => { setForm({ ...emptyForm }); setEditingId(null); setShowModal(true) }
  const openEdit = (c: Campaign) => {
    setEditingId(c.id)
    setForm({
      name: c.name, platform: c.platform, status: c.status,
      budget: c.budget.toString(), spent: c.spent.toString(),
      impressions: c.impressions.toString(), clicks: c.clicks.toString(),
      conversions: c.conversions.toString(), revenue: c.revenue.toString(),
      startDate: c.startDate, endDate: c.endDate || '',
    })
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const num = (v: string) => parseFloat(v) || 0
    if (editingId) {
      save(campaigns.map(c => c.id === editingId ? {
        ...c, name: form.name, platform: form.platform, status: form.status,
        budget: num(form.budget), spent: num(form.spent), impressions: num(form.impressions),
        clicks: num(form.clicks), conversions: num(form.conversions), revenue: num(form.revenue),
        startDate: form.startDate, endDate: form.endDate || undefined,
      } : c))
    } else {
      const nc: Campaign = {
        id: Date.now().toString(), name: form.name, platform: form.platform, status: form.status,
        budget: num(form.budget), spent: num(form.spent), impressions: num(form.impressions),
        clicks: num(form.clicks), conversions: num(form.conversions), revenue: num(form.revenue),
        startDate: form.startDate, endDate: form.endDate || undefined,
        createdAt: new Date().toISOString().split('T')[0],
      }
      save([...campaigns, nc])
    }
    setShowModal(false)
  }

  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0)
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0)
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0)
  const overallROAS = totalSpent > 0 ? (totalRevenue / totalSpent).toFixed(2) : '0'

  const roiCalc = () => {
    const spend = parseFloat(roiSpend) || 0
    const rev = parseFloat(roiRevenue) || 0
    const conv = parseFloat(roiConversions) || 0
    if (spend <= 0) return null
    return {
      roi: (((rev - spend) / spend) * 100).toFixed(1),
      roas: (rev / spend).toFixed(2),
      profit: (rev - spend).toFixed(0),
      cpa: conv > 0 ? (spend / conv).toFixed(2) : null,
    }
  }
  const calc = roiCalc()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaign Manager</h1>
          <p className="text-gray-400 text-sm mt-0.5">{campaigns.filter(c => c.status === 'active').length} chiến dịch đang chạy</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-orange-500/25"
        >
          <Plus className="w-4 h-4" />
          Thêm Campaign
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Budget', value: `$${fmt(totalBudget)}`, icon: DollarSign, gradient: 'from-purple-600/20 to-pink-600/20', border: 'border-purple-500/30', iconColor: 'text-purple-400' },
          { label: 'Total Spent', value: `$${fmt(totalSpent)}`, icon: TrendingUp, gradient: 'from-orange-600/20 to-red-600/20', border: 'border-orange-500/30', iconColor: 'text-orange-400' },
          { label: 'Total Revenue', value: `$${fmt(totalRevenue)}`, icon: Zap, gradient: 'from-emerald-600/20 to-teal-600/20', border: 'border-emerald-500/30', iconColor: 'text-emerald-400' },
          { label: 'Avg ROAS', value: `${overallROAS}x`, icon: Target, gradient: 'from-blue-600/20 to-cyan-600/20', border: 'border-blue-500/30', iconColor: 'text-blue-400' },
        ].map((card) => (
          <div key={card.label} className={`rounded-2xl border p-5 bg-gradient-to-br ${card.gradient} ${card.border}`}>
            <div className={`p-2.5 rounded-xl bg-white/10 w-fit mb-4`}>
              <card.icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-gray-400 text-sm mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Campaign Table */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Danh sách chiến dịch</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Campaign', 'Platform', 'Status', 'Budget', 'Spent', 'Impressions', 'Clicks', 'CTR', 'Conv.', 'Revenue', 'ROAS', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0'
                const roas = c.spent > 0 ? (c.revenue / c.spent).toFixed(2) : '0'
                const spentPct = c.budget > 0 ? Math.min(100, Math.round((c.spent / c.budget) * 100)) : 0
                return (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(c)} className="text-sm font-medium text-white hover:text-orange-400 transition-colors text-left">
                        {c.name}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-lg font-medium border ${platformColors[c.platform]}`}>
                        {c.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium border ${statusConfig[c.status].bg} ${statusConfig[c.status].color}`}>
                        {statusConfig[c.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">${fmt(c.budget)}</td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm text-gray-300">${fmt(c.spent)}</div>
                        <div className="mt-1 w-16 bg-white/10 rounded-full h-1">
                          <div className="h-1 rounded-full bg-gradient-to-r from-orange-500 to-yellow-400" style={{ width: `${spentPct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{fmt(c.impressions)}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{fmt(c.clicks)}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{ctr}%</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{c.conversions}</td>
                    <td className="px-4 py-3 text-sm font-medium text-emerald-400">${fmt(c.revenue)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${parseFloat(roas) >= 3 ? 'text-emerald-400' : parseFloat(roas) >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {roas}x
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => save(campaigns.filter(x => x.id !== c.id))} className="text-red-400/40 hover:text-red-400 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ROI Calculator */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">ROI Calculator</h2>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: 'Ad Spend ($)', value: roiSpend, setter: setRoiSpend, placeholder: '0.00' },
            { label: 'Revenue Generated ($)', value: roiRevenue, setter: setRoiRevenue, placeholder: '0.00' },
            { label: 'Conversions', value: roiConversions, setter: setRoiConversions, placeholder: '0' },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label className="block text-sm text-gray-400 mb-1.5">{label}</label>
              <input
                type="number"
                min="0"
                value={value}
                onChange={e => setter(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
          ))}
        </div>
        {calc && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'ROI', value: `${calc.roi}%`, color: parseFloat(calc.roi) > 0 ? 'text-emerald-400' : 'text-red-400', bg: 'from-emerald-600/10 to-teal-600/10 border-emerald-500/20' },
              { label: 'ROAS', value: `${calc.roas}x`, color: 'text-blue-400', bg: 'from-blue-600/10 to-cyan-600/10 border-blue-500/20' },
              { label: 'Profit', value: `$${parseInt(calc.profit).toLocaleString()}`, color: parseFloat(calc.profit) > 0 ? 'text-emerald-400' : 'text-red-400', bg: 'from-purple-600/10 to-pink-600/10 border-purple-500/20' },
              { label: 'Cost per Conv.', value: calc.cpa ? `$${calc.cpa}` : 'N/A', color: 'text-orange-400', bg: 'from-orange-600/10 to-yellow-600/10 border-orange-500/20' },
            ].map(r => (
              <div key={r.label} className={`p-4 rounded-xl bg-gradient-to-br ${r.bg} border`}>
                <p className="text-xs text-gray-400 mb-1">{r.label}</p>
                <p className={`text-xl font-bold ${r.color}`}>{r.value}</p>
              </div>
            ))}
          </div>
        )}
        {!calc && (
          <div className="text-center py-6 text-gray-500 text-sm">
            Nhập Ad Spend và Revenue để tính toán ROI
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#12121a] shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">{editingId ? 'Chỉnh sửa Campaign' : 'Campaign mới'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Tên Campaign *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
                  placeholder="Campaign name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Platform</label>
                  <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value as Platform }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50">
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as CampaignStatus }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50">
                    {STATUSES.map(s => <option key={s} value={s}>{statusConfig[s].label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Budget ($)', key: 'budget' }, { label: 'Spent ($)', key: 'spent' },
                  { label: 'Impressions', key: 'impressions' }, { label: 'Clicks', key: 'clicks' },
                  { label: 'Conversions', key: 'conversions' }, { label: 'Revenue ($)', key: 'revenue' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
                    <input type="number" min="0" value={form[key as keyof typeof form] as string}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
                      placeholder="0" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50 [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">End Date</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50 [color-scheme:dark]" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/5 transition-colors">
                  Hủy
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-orange-500/25">
                  {editingId ? 'Lưu' : 'Tạo Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
