import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const { topic, tone, count = 1, context: ctx = '' } = await req.json()

  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 })

  const apiKey = req.headers.get('x-api-key') || process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

  const client = new Anthropic({ apiKey })

  const toneMap: Record<string, string> = {
    professional: 'chuyên nghiệp, uy tín',
    friendly: 'thân thiện, gần gũi',
    exciting: 'sôi nổi, hứng khởi',
    informative: 'thông tin, giáo dục',
    promotional: 'quảng bá, kêu gọi hành động mạnh',
  }

  const toneDesc = toneMap[tone] || 'chuyên nghiệp'

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Viết ${count} bài đăng Facebook về chủ đề: "${topic}"
Giọng điệu: ${toneDesc}
${ctx ? `Context thêm: ${ctx}` : ''}

Yêu cầu:
- Viết bằng tiếng Việt, tự nhiên, phù hợp Facebook
- Có emoji phù hợp
- Kết thúc bằng call-to-action
- Mỗi bài cách nhau bằng dòng ---
- Không đánh số bài viết

Chỉ trả về nội dung bài viết, không giải thích thêm.`,
      }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    const posts = rawText.split('---').map(p => p.trim()).filter(Boolean)

    return NextResponse.json({ posts })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to generate posts', details: message }, { status: 500 })
  }
}
