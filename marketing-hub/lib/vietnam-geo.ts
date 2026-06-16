export interface Province {
  code: string
  name: string
  region: 'north' | 'central' | 'south'
  population: number        // thousands
  internetUsers: number     // thousands
  internetPct: number       // penetration %
  avgIncome: number         // million VND/month
  ecommerceUsers: number    // thousands
  facebookUsers: number     // thousands
  tiktokIndex: number       // 0-100 relative engagement
  tier: 1 | 2 | 3          // market tier
}

export const PROVINCES: Province[] = [
  { code: 'HN', name: 'Hà Nội', region: 'north', population: 8246, internetUsers: 6100, internetPct: 74, avgIncome: 12.5, ecommerceUsers: 4200, facebookUsers: 5800, tiktokIndex: 85, tier: 1 },
  { code: 'HCM', name: 'TP. HCM', region: 'south', population: 9210, internetUsers: 7200, internetPct: 78, avgIncome: 14.2, ecommerceUsers: 5500, facebookUsers: 6900, tiktokIndex: 95, tier: 1 },
  { code: 'DN', name: 'Đà Nẵng', region: 'central', population: 1188, internetUsers: 920, internetPct: 77, avgIncome: 9.8, ecommerceUsers: 680, facebookUsers: 850, tiktokIndex: 72, tier: 1 },
  { code: 'HP', name: 'Hải Phòng', region: 'north', population: 2028, internetUsers: 1400, internetPct: 69, avgIncome: 8.5, ecommerceUsers: 950, facebookUsers: 1200, tiktokIndex: 65, tier: 2 },
  { code: 'CT', name: 'Cần Thơ', region: 'south', population: 1253, internetUsers: 820, internetPct: 65, avgIncome: 7.2, ecommerceUsers: 550, facebookUsers: 750, tiktokIndex: 70, tier: 2 },
  { code: 'BD', name: 'Bình Dương', region: 'south', population: 2580, internetUsers: 1900, internetPct: 74, avgIncome: 9.1, ecommerceUsers: 1400, facebookUsers: 1750, tiktokIndex: 78, tier: 2 },
  { code: 'DNA', name: 'Đồng Nai', region: 'south', population: 3235, internetUsers: 2100, internetPct: 65, avgIncome: 8.4, ecommerceUsers: 1500, facebookUsers: 1900, tiktokIndex: 72, tier: 2 },
  { code: 'NT', name: 'Nha Trang (Khánh Hòa)', region: 'central', population: 1260, internetUsers: 850, internetPct: 67, avgIncome: 7.5, ecommerceUsers: 590, facebookUsers: 780, tiktokIndex: 68, tier: 2 },
  { code: 'HUE', name: 'Huế (TT-Huế)', region: 'central', population: 1165, internetUsers: 720, internetPct: 62, avgIncome: 6.8, ecommerceUsers: 480, facebookUsers: 650, tiktokIndex: 60, tier: 2 },
  { code: 'VT', name: 'Vũng Tàu (BR-VT)', region: 'south', population: 1148, internetUsers: 820, internetPct: 71, avgIncome: 10.2, ecommerceUsers: 620, facebookUsers: 770, tiktokIndex: 75, tier: 2 },
  { code: 'LCA', name: 'Long An', region: 'south', population: 1720, internetUsers: 980, internetPct: 57, avgIncome: 6.5, ecommerceUsers: 620, facebookUsers: 850, tiktokIndex: 62, tier: 3 },
  { code: 'TH', name: 'Thanh Hóa', region: 'central', population: 3727, internetUsers: 1900, internetPct: 51, avgIncome: 5.8, ecommerceUsers: 1100, facebookUsers: 1600, tiktokIndex: 55, tier: 3 },
  { code: 'NA', name: 'Nghệ An', region: 'central', population: 3327, internetUsers: 1650, internetPct: 50, avgIncome: 5.5, ecommerceUsers: 950, facebookUsers: 1400, tiktokIndex: 52, tier: 3 },
  { code: 'AG', name: 'An Giang', region: 'south', population: 1908, internetUsers: 1050, internetPct: 55, avgIncome: 5.9, ecommerceUsers: 680, facebookUsers: 920, tiktokIndex: 60, tier: 3 },
  { code: 'KG', name: 'Kiên Giang', region: 'south', population: 1836, internetUsers: 980, internetPct: 53, avgIncome: 6.0, ecommerceUsers: 620, facebookUsers: 870, tiktokIndex: 58, tier: 3 },
]

export const REGIONS = {
  north: { name: 'Miền Bắc', color: '#3b82f6' },
  central: { name: 'Miền Trung', color: '#f97316' },
  south: { name: 'Miền Nam', color: '#10b981' },
}

export interface GeoTarget {
  id: string
  provinceCode: string
  channel: string
  budget: number
  reach: number
  conversions: number
  cpa: number
  notes: string
  createdAt: string
}
