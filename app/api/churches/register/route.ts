import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { rateLimitSensitive } from '@/lib/api/rate-limit'

interface LeaderEntry {
  name: string
  nameAr: string
  title: string
  titleAr: string
}

export async function POST(request: NextRequest) {
  const limited = rateLimitSensitive(request)
  if (limited) return limited

  try {
    const body = await request.json()
    const {
      email,
      password,
      churchNameAr,
      churchNameEn,
      country,
      timezone,
      primaryLanguage,
      denomination,
      defaultBibleId,
      welcomeMessage,
      leaders,
    } = body as {
      email: string
      password: string
      churchNameAr: string
      churchNameEn?: string
      country: string
      timezone: string
      primaryLanguage?: string
      denomination?: string
      defaultBibleId?: string
      welcomeMessage?: string
      leaders?: LeaderEntry[]
    }

    // Validate required fields
    if (!email || !password || !churchNameAr || !country || !timezone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // 1. Create church (core fields first)
    const churchData: Record<string, unknown> = {
      name: churchNameEn || churchNameAr,
      name_ar: churchNameAr,
      country,
      timezone,
      primary_language: primaryLanguage || 'ar',
      welcome_message: primaryLanguage === 'en' ? welcomeMessage : null,
      welcome_message_ar: welcomeMessage || null,
    }

    // Optional columns (may not exist if migrations haven't been applied)
    if (denomination) churchData.denomination = denomination
    if (defaultBibleId) churchData.default_bible_id = defaultBibleId

    let church: { id: string } | null = null

    // Try with all columns first, fall back to core-only if column doesn't exist
    const { data: churchResult, error: churchError } = await supabase
      .from('churches')
      .insert(churchData)
      .select('id')
      .single()

    if (churchError) {
      // If error is about unknown column, retry with core fields only
      if (churchError.message?.includes('column') || churchError.code === '42703') {
        console.warn('[church-register] Retrying church insert without optional columns', churchError.message)
        delete churchData.denomination
        delete churchData.default_bible_id
        const { data: retryResult, error: retryError } = await supabase
          .from('churches')
          .insert(churchData)
          .select('id')
          .single()

        if (retryError || !retryResult) {
          console.error('[church-register] Church creation failed after retry', retryError)
          return NextResponse.json(
            { error: 'Failed to create church' },
            { status: 500 }
          )
        }
        church = retryResult
      } else {
        console.error('[church-register] Church creation failed', churchError)
        return NextResponse.json(
          { error: 'Failed to create church' },
          { status: 500 }
        )
      }
    } else {
      church = churchResult
    }

    if (!church) {
      return NextResponse.json(
        { error: 'Failed to create church — no data returned' },
        { status: 500 }
      )
    }

    // 2. Create user with church_id in metadata
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { church_id: church.id },
    })

    if (authError || !authData.user) {
      // Rollback church creation
      await supabase.from('churches').delete().eq('id', church.id)

      if (authError?.message?.includes('already been registered')) {
        return NextResponse.json(
          { error: 'This email is already registered' },
          { status: 409 }
        )
      }

      console.error('[church-register] User creation failed during registration', authError)
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      )
    }

    // 3. Wait for trigger to create profile, then upgrade to super_admin
    const userId = authData.user.id
    let profileUpdated = false

    for (let attempt = 0; attempt < 5; attempt++) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'super_admin',
          onboarding_completed: true,
          first_name_ar: null,
          joined_church_at: new Date().toISOString().split('T')[0],
        })
        .eq('id', userId)

      if (!updateError) {
        profileUpdated = true
        break
      }

      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    if (!profileUpdated) {
      console.error('[church-register] Profile upgrade to super_admin failed after retries', userId)
    }

    // 3b. Insert into user_churches with super_admin role
    // This is the authoritative per-church role used for privilege checks
    const { error: ucError } = await supabase
      .from('user_churches')
      .insert({ user_id: userId, church_id: church.id, role: 'super_admin' })

    if (ucError && !ucError.message?.includes('duplicate')) {
      console.error('user_churches insert failed (non-fatal):', ucError)
    }

    // 4. Insert church leaders if provided
    if (leaders && leaders.length > 0) {
      const leaderRows = leaders.map((leader, i) => ({
        church_id: church.id,
        name: leader.name || leader.nameAr,
        name_ar: leader.nameAr || null,
        title: leader.title || leader.titleAr,
        title_ar: leader.titleAr || null,
        display_order: i,
        is_active: true,
      }))

      const { error: leadersError } = await supabase
        .from('church_leaders')
        .insert(leaderRows)

      if (leadersError) {
        console.warn('[church-register] Leaders creation failed (non-fatal)', leadersError)
      }
    }

    return NextResponse.json(
      { success: true, churchId: church.id },
      { status: 201 }
    )
  } catch (err) {
    console.error('[church-register] Church registration error', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
