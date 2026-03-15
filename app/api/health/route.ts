import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('churches').select('id').limit(1)

    if (error) {
      return NextResponse.json(
        { status: 'unhealthy', timestamp: new Date().toISOString() },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { status: 'healthy', timestamp: new Date().toISOString() },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { status: 'unhealthy', timestamp: new Date().toISOString() },
      { status: 503 }
    )
  }
}
