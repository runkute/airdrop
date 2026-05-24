import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { pageId, pageToken, message, scheduledTime } = await req.json()

  if (!pageId || !pageToken || !message) {
    return NextResponse.json({ error: 'pageId, pageToken, message required' }, { status: 400 })
  }

  const params: Record<string, string> = {
    message,
    access_token: pageToken,
  }

  if (scheduledTime) {
    params.scheduled_publish_time = String(Math.floor(new Date(scheduledTime).getTime() / 1000))
    params.published = 'false'
  }

  const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  const data = await res.json()
  if (data.error) {
    return NextResponse.json({ error: data.error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, postId: data.id })
}
