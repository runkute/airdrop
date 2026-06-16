import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { pageToken } = await req.json()
  if (!pageToken) return NextResponse.json({ error: 'pageToken required' }, { status: 400 })

  const res = await fetch(
    `https://graph.facebook.com/v19.0/me?fields=id,name,picture,fan_count,category&access_token=${pageToken}`
  )
  const data = await res.json()

  if (data.error) {
    return NextResponse.json({ error: data.error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}
