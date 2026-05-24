export type Platform = 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'linkedin'
export type ContentStatus = 'idea' | 'draft' | 'scheduled' | 'published'
export type CampaignStatus = 'active' | 'paused' | 'completed' | 'draft'

export interface ContentPost {
  id: string
  title: string
  content: string
  platform: Platform[]
  status: ContentStatus
  scheduledDate?: string
  publishedDate?: string
  tags: string[]
  notes?: string
  createdAt: string
}

export interface Campaign {
  id: string
  name: string
  platform: Platform
  status: CampaignStatus
  budget: number
  spent: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
  startDate: string
  endDate?: string
  createdAt: string
}

export interface Keyword {
  id: string
  keyword: string
  currentRank: number
  previousRank: number
  searchVolume: number
  difficulty: number
  url?: string
  createdAt: string
}

export interface Competitor {
  id: string
  name: string
  website: string
  domainAuthority: number
  estimatedTraffic: number
  keywords: number
  notes?: string
  createdAt: string
}

export interface KPIData {
  totalReach: number
  totalClicks: number
  totalConversions: number
  totalRevenue: number
  totalAdSpend: number
  avgCTR: number
  avgROAS: number
  weeklyGrowth: number
}
