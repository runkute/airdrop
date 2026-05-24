import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const { topic, tone, count = 1, context: ctx = '' } = await req.json()

  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 })

  const apiKey = process.env.ANTHROPIC_API_KEY
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

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
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
}
