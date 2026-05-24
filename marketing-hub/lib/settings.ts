interface AppSettings {
  anthropicApiKey: string
  currency: 'VND' | 'USD'
}

const SETTINGS_KEY = 'mh_settings'
const DEFAULT: AppSettings = { anthropicApiKey: '', currency: 'VND' }

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT
  } catch {
    return DEFAULT
  }
}

export function saveSettings(s: AppSettings): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

// Format a number as currency. No unit conversion — just formats with the right symbol.
// VND: "5.000 ₫"  USD: "$5,000"
export function formatCurrency(amount: number): string {
  const { currency } = getSettings()
  if (currency === 'VND') {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}
