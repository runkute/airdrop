'use client'

import { useState, useEffect, useRef } from 'react'
import { Sparkles, Settings, Database, Eye, EyeOff, Check, X, AlertCircle, Download, Upload, HardDrive } from 'lucide-react'
import { getSettings, saveSettings } from '@/lib/settings'
import { storage } from '@/lib/storage'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
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

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [currency, setCurrency] = useState<'VND' | 'USD'>('VND')
  const [testing, setTesting] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [storageUsage, setStorageUsage] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const settings = getSettings()
    setApiKey(settings.anthropicApiKey)
    setCurrency(settings.currency)
    updateStorageUsage()
  }, [])

  function updateStorageUsage() {
    if (typeof window === 'undefined') return
    try {
      const total = JSON.stringify(localStorage).length
      setStorageUsage(total / 1024)
    } catch {
      setStorageUsage(0)
    }
  }

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now().toString()
    setToasts(t => [...t, { id, message, type }])
  }
  const removeToast = (id: string) => setToasts(t => t.filter(x => x.id !== id))

  const handleSave = () => {
    saveSettings({ anthropicApiKey: apiKey, currency })
    addToast('Đã lưu cài đặt', 'success')
  }

  const handleCurrencyChange = (c: 'VND' | 'USD') => {
    setCurrency(c)
    saveSettings({ anthropicApiKey: apiKey, currency: c })
  }

  const handleTestConnection = async () => {
    setTesting(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (apiKey) headers['x-api-key'] = apiKey
      const res = await fetch('/api/fanpage/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ topic: 'test', tone: 'professional', count: 1 }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      addToast('Kết nối thành công', 'success')
    } catch (e) {
      addToast(`Lỗi kết nối: ${e instanceof Error ? e.message : 'Không thể kết nối'}`, 'error')
    } finally {
      setTesting(false)
    }
  }

  const handleClearData = () => {
    if (!window.confirm('Xóa tất cả dữ liệu? Hành động này không thể hoàn tác!')) return
    const keysToDelete = ['mh_posts', 'mh_campaigns', 'mh_keywords', 'mh_competitors', 'mh_geo_targets', 'mh_fanpages']
    keysToDelete.forEach(k => localStorage.removeItem(k))
    updateStorageUsage()
    addToast('Đã xóa dữ liệu thành công', 'success')
  }

  const handleBackup = () => {
    const allData: Record<string, unknown> = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        try {
          allData[key] = JSON.parse(localStorage.getItem(key) || 'null')
        } catch {
          allData[key] = localStorage.getItem(key)
        }
      }
    }
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `marketing-hub-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    addToast('Đã xuất backup thành công', 'success')
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
        Object.entries(data).forEach(([key, value]) => {
          if (key === 'version' || key === 'exportedAt') return
          localStorage.setItem(key, JSON.stringify(value))
        })
        updateStorageUsage()
        addToast('Đã khôi phục dữ liệu thành công', 'success')
        setTimeout(() => window.location.reload(), 1500)
      } catch {
        addToast('File backup không hợp lệ', 'error')
      }
    }
    reader.readAsText(file)
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const maxKB = 5120
  const usagePct = Math.min((storageUsage / maxKB) * 100, 100)
  const barColor = usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-yellow-500' : 'bg-emerald-500'

  return (
    <div className="p-6 space-y-6 pb-24">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />)}
      </div>

      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600/30 to-pink-400/20 border border-purple-500/30">
          <Settings className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Cài đặt</h1>
          <p className="text-gray-400 text-sm mt-0.5">Cấu hình ứng dụng và quản lý dữ liệu</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-5">
        {/* AI Configuration */}
        <div className="bg-[#12121a] border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-600/10 to-pink-600/10">
            <div className="p-1.5 rounded-lg bg-purple-500/20">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="text-base font-semibold text-white">AI Configuration</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Anthropic API Key</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-ant-api..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/60 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                Key được lưu cục bộ trên máy của bạn, không gửi lên server nào.
              </p>
            </div>
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {testing ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <Sparkles className="w-4 h-4 text-purple-400" />
              )}
              {testing ? 'Đang kiểm tra...' : 'Test kết nối'}
            </button>
          </div>
        </div>

        {/* Display Settings */}
        <div className="bg-[#12121a] border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
            <div className="p-1.5 rounded-lg bg-blue-500/20">
              <Settings className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="text-base font-semibold text-white">Hiển thị</h2>
          </div>
          <div className="p-6">
            <label className="block text-sm text-gray-400 mb-3">Đơn vị tiền tệ</label>
            <div className="flex gap-3">
              {([
                { value: 'VND', label: 'VND ₫' },
                { value: 'USD', label: 'USD $' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleCurrencyChange(opt.value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    currency === opt.value
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 border-purple-500/60 text-white shadow-lg shadow-purple-500/20'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data & Storage */}
        <div className="bg-[#12121a] border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
            <div className="p-1.5 rounded-lg bg-teal-500/20">
              <Database className="w-4 h-4 text-teal-400" />
            </div>
            <h2 className="text-base font-semibold text-white">Dữ liệu &amp; Bộ nhớ</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">Bộ nhớ cục bộ</span>
                </div>
                <span className="text-sm text-gray-300 font-mono">
                  {storageUsage.toFixed(1)} KB / {maxKB} KB
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            </div>
            <button
              onClick={handleClearData}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 hover:border-red-500/50 transition-all"
            >
              <X className="w-4 h-4" />
              Xóa tất cả dữ liệu
            </button>
          </div>
        </div>

        {/* Backup & Restore */}
        <div className="bg-[#12121a] border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
            <div className="p-1.5 rounded-lg bg-orange-500/20">
              <Download className="w-4 h-4 text-orange-400" />
            </div>
            <h2 className="text-base font-semibold text-white">Backup &amp; Khôi phục</h2>
          </div>
          <div className="p-6 flex gap-3">
            <button
              onClick={handleBackup}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/10 hover:border-white/20 transition-all"
            >
              <Download className="w-4 h-4 text-orange-400" />
              Xuất backup JSON
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/10 hover:border-white/20 transition-all"
            >
              <Upload className="w-4 h-4 text-blue-400" />
              Nhập backup JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleRestore}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Fixed save button */}
      <div className="fixed bottom-0 left-60 right-0 p-4 bg-[#0a0a0f]/90 backdrop-blur-sm border-t border-white/10 z-40">
        <div className="max-w-2xl">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
          >
            <Check className="w-4 h-4" />
            Lưu cài đặt
          </button>
        </div>
      </div>
    </div>
  )
}
