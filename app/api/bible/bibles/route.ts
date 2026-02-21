import { NextRequest, NextResponse } from 'next/server'

// GET /api/bible/bibles — single Arabic SVD version
export async function GET(_req: NextRequest) {
  return NextResponse.json({
    data: [{ id: 'ar-svd', name: 'الكتاب المقدس - سميث وفاندايك', language: { id: 'ara' } }],
  })
}
