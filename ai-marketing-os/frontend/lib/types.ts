// ============================================================
// ENUMS
// ============================================================

export enum ContentType {
  SOCIAL_POST = "social_post",
  SEO_ARTICLE = "seo_article",
  AD_COPY = "ad_copy",
  REEL_SCRIPT = "reel_script",
  HASHTAGS = "hashtags",
  EMAIL = "email",
  BLOG_POST = "blog_post",
  PRODUCT_DESCRIPTION = "product_description",
}

export enum Platform {
  INSTAGRAM = "instagram",
  FACEBOOK = "facebook",
  TWITTER = "twitter",
  LINKEDIN = "linkedin",
  TIKTOK = "tiktok",
  YOUTUBE = "youtube",
  GOOGLE = "google",
  PINTEREST = "pinterest",
  EMAIL = "email",
  WEBSITE = "website",
}

export enum AdPlatform {
  META = "meta",
  GOOGLE = "google",
  TIKTOK = "tiktok",
  LINKEDIN = "linkedin",
  TWITTER = "twitter",
}

export enum UserRole {
  OWNER = "owner",
  ADMIN = "admin",
  EDITOR = "editor",
  VIEWER = "viewer",
}

export enum PostStatus {
  DRAFT = "draft",
  SCHEDULED = "scheduled",
  PUBLISHED = "published",
  FAILED = "failed",
}

export enum AlertType {
  BUDGET_EXCEEDED = "budget_exceeded",
  LOW_CTR = "low_ctr",
  HIGH_CPA = "high_cpa",
  LOW_ROAS = "low_roas",
  CAMPAIGN_PAUSED = "campaign_paused",
  AD_REJECTED = "ad_rejected",
  PUBLISH_FAILED = "publish_failed",
  CONTENT_GENERATED = "content_generated",
  INTEGRATION_ERROR = "integration_error",
}

export enum AlertSeverity {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  INFO = "info",
}

export enum AIProvider {
  AUTO = "auto",
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  GOOGLE = "google",
  GROK = "grok",
}

export enum BrandTone {
  PROFESSIONAL = "professional",
  CASUAL = "casual",
  PLAYFUL = "playful",
  AUTHORITATIVE = "authoritative",
  EMPATHETIC = "empathetic",
  BOLD = "bold",
}

export enum WritingStyle {
  CONCISE = "concise",
  DETAILED = "detailed",
  STORYTELLING = "storytelling",
  DATA_DRIVEN = "data-driven",
  CONVERSATIONAL = "conversational",
}

// ============================================================
// CORE ENTITIES
// ============================================================

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  is_active: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  logo_url?: string
  plan: "free" | "starter" | "pro" | "enterprise"
  owner_id: string
  created_at: string
  updated_at: string
  member_count?: number
}

export interface WorkspaceMembership {
  id: string
  user_id: string
  workspace_id: string
  role: UserRole
  user: User
  created_at: string
}

export interface BrandVoice {
  id: string
  workspace_id: string
  name: string
  tone: BrandTone
  writing_style: WritingStyle
  cta_style?: string
  forbidden_words: string[]
  emotional_positioning?: string
  keyword_preferences: string[]
  example_content?: string
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ContentPost {
  id: string
  workspace_id: string
  title?: string
  content: string
  content_type: ContentType
  platform: Platform
  status: PostStatus
  ai_provider?: string
  ai_model?: string
  tokens_used?: number
  cost_usd?: number
  brand_voice_id?: string
  brand_voice?: BrandVoice
  scheduled_at?: string
  published_at?: string
  error_message?: string
  metadata?: Record<string, unknown>
  created_by: string
  created_at: string
  updated_at: string
}

export interface PublishingLog {
  id: string
  post_id: string
  platform: Platform
  status: "success" | "failed"
  external_post_id?: string
  error_message?: string
  created_at: string
}

export interface AdAccount {
  id: string
  workspace_id: string
  platform: AdPlatform
  account_id: string
  account_name: string
  currency: string
  is_active: boolean
  last_synced_at?: string
  created_at: string
}

export interface Campaign {
  id: string
  workspace_id: string
  ad_account_id: string
  external_campaign_id: string
  name: string
  platform: AdPlatform
  status: "active" | "paused" | "completed" | "draft"
  objective?: string
  budget?: number
  budget_type?: "daily" | "lifetime"
  start_date?: string
  end_date?: string
  created_at: string
  updated_at: string
  latest_metrics?: CampaignMetrics
}

export interface CampaignMetrics {
  id: string
  campaign_id: string
  date: string
  impressions: number
  clicks: number
  spend: number
  conversions: number
  revenue: number
  ctr: number
  cpc: number
  cpm: number
  roas: number
  cpa: number
  reach?: number
  frequency?: number
}

export interface AIAlert {
  id: string
  workspace_id: string
  alert_type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  campaign_id?: string
  campaign_name?: string
  is_read: boolean
  metadata?: Record<string, unknown>
  created_at: string
}

export interface AIUsageLog {
  id: string
  workspace_id: string
  user_id: string
  content_post_id?: string
  provider: string
  model: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost_usd: number
  content_type?: ContentType
  created_at: string
}

export interface Integration {
  id: string
  workspace_id: string
  platform: string
  is_connected: boolean
  account_name?: string
  account_id?: string
  expires_at?: string
  created_at: string
}

// ============================================================
// REQUEST / RESPONSE TYPES
// ============================================================

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  full_name: string
  email: string
  password: string
  workspace_name: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
  workspace: Workspace
}

export interface UpdateProfileRequest {
  full_name?: string
  avatar_url?: string
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

export interface GenerateContentRequest {
  content_type: ContentType
  platform: Platform
  topic: string
  target_audience?: string
  keywords?: string[]
  ai_provider?: AIProvider
  word_count?: number
  cta?: string
  brand_voice_id?: string
  additional_instructions?: string
}

export interface GenerateContentResponse {
  content: string
  provider: string
  model: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost_usd: number
  post_id: string
}

export interface CreateBrandVoiceRequest {
  name: string
  tone: BrandTone
  writing_style: WritingStyle
  cta_style?: string
  forbidden_words?: string[]
  emotional_positioning?: string
  keyword_preferences?: string[]
  example_content?: string
  is_default?: boolean
}

export interface UpdateBrandVoiceRequest extends Partial<CreateBrandVoiceRequest> {}

export interface ConnectAdAccountRequest {
  platform: AdPlatform
  account_id: string
  access_token: string
  account_name?: string
}

export interface DashboardData {
  kpis: {
    total_content_generated: number
    total_ad_spend: number
    avg_ctr: number
    avg_roas: number
    content_change: number
    spend_change: number
    ctr_change: number
    roas_change: number
  }
  spend_over_time: SpendDataPoint[]
  content_by_type: ContentTypeCount[]
  recent_alerts: AIAlert[]
  content_queue: ContentPost[]
  recent_activity: ActivityItem[]
}

export interface SpendDataPoint {
  date: string
  spend: number
  clicks: number
  impressions: number
}

export interface ContentTypeCount {
  content_type: string
  count: number
}

export interface ActivityItem {
  id: string
  type: "content_generated" | "post_published" | "ads_synced" | "alert_triggered" | "member_joined"
  title: string
  description: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface AdsDashboardData {
  summary: {
    total_spend: number
    total_impressions: number
    total_clicks: number
    avg_ctr: number
    avg_roas: number
    avg_cpa: number
  }
  performance_over_time: SpendDataPoint[]
  campaigns: Campaign[]
  alerts: AIAlert[]
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

export interface InviteMemberRequest {
  email: string
  role: UserRole
}

export interface UpdateMemberRoleRequest {
  role: UserRole
}

export interface AIProviderConfig {
  provider: string
  api_key: string
  is_configured: boolean
  model_preference?: string
}
