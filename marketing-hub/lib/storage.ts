import { ContentPost, Campaign, Keyword, Competitor } from './types'

const KEYS = {
  posts: 'mh_posts',
  campaigns: 'mh_campaigns',
  keywords: 'mh_keywords',
  competitors: 'mh_competitors',
}

function load<T>(key: string, defaults: T[]): T[] {
  if (typeof window === 'undefined') return defaults
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : defaults
  } catch { return defaults }
}

function save<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.error('localStorage quota exceeded')
      if (typeof window !== 'undefined') {
        setTimeout(() => alert('⚠️ Bộ nhớ cục bộ đầy! Hãy vào Cài đặt → Dữ liệu để xóa bớt hoặc xuất backup.'), 0)
      }
    }
  }
}

// Default seed data
const defaultPosts: ContentPost[] = [
  { id: '1', title: 'Ra mắt sản phẩm hè 2026', content: 'Mùa hè này, chúng tôi tự hào giới thiệu...', platform: ['facebook', 'instagram'], status: 'published', publishedDate: '2026-05-20', tags: ['product', 'summer'], createdAt: '2026-05-18' },
  { id: '2', title: 'Tips Marketing Digital hiệu quả', content: '5 chiến lược giúp tăng conversion rate...', platform: ['linkedin', 'facebook'], status: 'scheduled', scheduledDate: '2026-05-26', tags: ['tips', 'digital'], createdAt: '2026-05-22' },
  { id: '3', title: 'Case Study: ROI x3 trong 30 ngày', content: 'Khám phá cách chúng tôi tăng gấp 3 lần...', platform: ['youtube', 'linkedin'], status: 'draft', tags: ['case-study', 'roi'], createdAt: '2026-05-23' },
  { id: '4', title: 'Flash Sale Cuối Tháng', content: 'Giảm 50% toàn bộ khóa học trong 48h...', platform: ['facebook', 'instagram', 'tiktok'], status: 'idea', tags: ['sale', 'promo'], createdAt: '2026-05-24' },
]

const defaultCampaigns: Campaign[] = [
  { id: '1', name: 'Summer Product Launch', platform: 'facebook', status: 'active', budget: 5000, spent: 3200, impressions: 128000, clicks: 4800, conversions: 240, revenue: 18000, startDate: '2026-05-01', createdAt: '2026-04-28' },
  { id: '2', name: 'Google Search - Brand', platform: 'youtube', status: 'active', budget: 3000, spent: 1800, impressions: 45000, clicks: 2700, conversions: 135, revenue: 9800, startDate: '2026-05-10', createdAt: '2026-05-08' },
  { id: '3', name: 'TikTok Viral Campaign', platform: 'tiktok', status: 'paused', budget: 2000, spent: 1200, impressions: 320000, clicks: 9600, conversions: 96, revenue: 4800, startDate: '2026-04-15', endDate: '2026-05-15', createdAt: '2026-04-12' },
  { id: '4', name: 'Instagram Stories Retarget', platform: 'instagram', status: 'completed', budget: 1500, spent: 1500, impressions: 62000, clicks: 3100, conversions: 186, revenue: 14200, startDate: '2026-04-01', endDate: '2026-04-30', createdAt: '2026-03-28' },
]

const defaultKeywords: Keyword[] = [
  { id: '1', keyword: 'digital marketing agency vietnam', currentRank: 3, previousRank: 7, searchVolume: 8900, difficulty: 45, url: '/services', createdAt: '2026-05-01' },
  { id: '2', keyword: 'facebook ads course', currentRank: 12, previousRank: 18, searchVolume: 12400, difficulty: 58, url: '/courses', createdAt: '2026-05-01' },
  { id: '3', keyword: 'content marketing tips', currentRank: 8, previousRank: 6, searchVolume: 22000, difficulty: 62, url: '/blog', createdAt: '2026-05-01' },
  { id: '4', keyword: 'seo tools free', currentRank: 25, previousRank: 31, searchVolume: 45000, difficulty: 75, url: '/tools', createdAt: '2026-05-01' },
  { id: '5', keyword: 'marketing automation', currentRank: 15, previousRank: 15, searchVolume: 33000, difficulty: 68, createdAt: '2026-05-01' },
]

const defaultCompetitors: Competitor[] = [
  { id: '1', name: 'Novaon Digital', website: 'novaon.net', domainAuthority: 42, estimatedTraffic: 85000, keywords: 3200, notes: 'Strong SEO, weak social', createdAt: '2026-05-01' },
  { id: '2', name: 'Dentsu Vietnam', website: 'dentsu.com/vn', domainAuthority: 58, estimatedTraffic: 210000, keywords: 8900, notes: 'Big budget, enterprise focus', createdAt: '2026-05-01' },
  { id: '3', name: 'Admicro', website: 'admicro.vn', domainAuthority: 48, estimatedTraffic: 155000, keywords: 5600, notes: 'Display ads specialist', createdAt: '2026-05-01' },
]

export const storage = {
  getPosts: () => load<ContentPost>(KEYS.posts, defaultPosts),
  savePosts: (data: ContentPost[]) => save(KEYS.posts, data),
  getCampaigns: () => load<Campaign>(KEYS.campaigns, defaultCampaigns),
  saveCampaigns: (data: Campaign[]) => save(KEYS.campaigns, data),
  getKeywords: () => load<Keyword>(KEYS.keywords, defaultKeywords),
  saveKeywords: (data: Keyword[]) => save(KEYS.keywords, data),
  getCompetitors: () => load<Competitor>(KEYS.competitors, defaultCompetitors),
  saveCompetitors: (data: Competitor[]) => save(KEYS.competitors, data),
}
