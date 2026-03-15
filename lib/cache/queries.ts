// ARCH: Centralized cached query functions using unstable_cache.
// These wrap frequently-read, rarely-changing reference data queries
// so they don't hit the database on every page load.
//
// IMPORTANT: Uses createAdminClient (service role, no cookies) because
// unstable_cache forbids accessing cookies() inside cached functions.
// All queries are scoped by churchId passed as parameter.
//
// Invalidation: Each entity has a corresponding revalidateTag call that
// must be added to its mutation API routes (POST/PATCH/DELETE).
// Tag naming: `{entity}-{churchId}` — always church-scoped.

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'

// ─── Ministries (reference data — 3600s TTL) ─────────────────────

/**
 * Cached list of ministries for a church. Used in dropdowns across
 * groups, events, serving, and expense forms.
 */
export const getCachedMinistries = (churchId: string) =>
  unstable_cache(
    async () => {
      const supabase = await createAdminClient()
      const { data } = await supabase
        .from('ministries')
        .select('id, name, name_ar, is_active, is_default')
        .eq('church_id', churchId)
        .eq('is_active', true)
        .order('name')
      return data ?? []
    },
    [`ministries-${churchId}`],
    { tags: [`ministries-${churchId}`], revalidate: 3600 }
  )()

// ─── Groups (reference data — 3600s TTL) ─────────────────────────

/**
 * Cached list of groups for dropdown use. Lightweight — no joins.
 */
export const getCachedGroups = (churchId: string) =>
  unstable_cache(
    async () => {
      const supabase = await createAdminClient()
      const { data } = await supabase
        .from('groups')
        .select('id, name, name_ar, type, ministry_id, is_active')
        .eq('church_id', churchId)
        .eq('is_active', true)
        .order('name')
      return data ?? []
    },
    [`groups-${churchId}`],
    { tags: [`groups-${churchId}`], revalidate: 3600 }
  )()

// ─── Funds (reference data — 3600s TTL) ──────────────────────────

/**
 * Cached list of active funds for a church. Used in donation forms,
 * finance dashboard, and reporting dropdowns.
 */
export const getCachedFunds = (churchId: string) =>
  unstable_cache(
    async () => {
      const supabase = await createAdminClient()
      const { data } = await supabase
        .from('funds')
        .select('id, name, name_ar, code, current_balance, target_amount, is_restricted, is_default, display_order')
        .eq('church_id', churchId)
        .eq('is_active', true)
        .order('display_order')
        .order('name')
      return data ?? []
    },
    [`funds-${churchId}`],
    { tags: [`funds-${churchId}`], revalidate: 3600 }
  )()

// ─── Accounts (reference data — 3600s TTL) ───────────────────────

/**
 * Cached chart of accounts for a church. Used in transaction forms
 * and reporting.
 */
export const getCachedAccounts = (churchId: string) =>
  unstable_cache(
    async () => {
      const supabase = await createAdminClient()
      const { data } = await supabase
        .from('accounts')
        .select('id, code, name, name_ar, account_type, account_sub_type, is_header, is_active, parent_id, display_order')
        .eq('church_id', churchId)
        .eq('is_active', true)
        .order('display_order')
        .order('code')
      return data ?? []
    },
    [`accounts-${churchId}`],
    { tags: [`accounts-${churchId}`], revalidate: 3600 }
  )()

// ─── Serving Areas (reference data — 3600s TTL) ──────────────────

/**
 * Cached list of active serving areas for a church.
 */
export const getCachedServingAreas = (churchId: string) =>
  unstable_cache(
    async () => {
      const supabase = await createAdminClient()
      const { data } = await supabase
        .from('serving_areas')
        .select('id, name, name_ar, ministry_id, is_active')
        .eq('church_id', churchId)
        .eq('is_active', true)
        .order('name')
      return data ?? []
    },
    [`serving-areas-${churchId}`],
    { tags: [`serving-areas-${churchId}`], revalidate: 3600 }
  )()

// ─── Feature Flags (reference data — 3600s TTL) ──────────────────

/**
 * Cached feature flags for a church. Called on many pages
 * for conditional rendering.
 */
export const getCachedFeatureFlags = (churchId: string) =>
  unstable_cache(
    async () => {
      const supabase = await createAdminClient()
      const { data } = await supabase
        .from('church_features')
        .select('feature, enabled')
        .eq('church_id', churchId)
      return data ?? []
    },
    [`features-${churchId}`],
    { tags: [`features-${churchId}`], revalidate: 3600 }
  )()

// ─── Landing Page Data (reference data — 3600s TTL) ──────────────

/**
 * Cached church leaders for landing/welcome pages.
 */
export const getCachedChurchLeaders = (churchId: string) =>
  unstable_cache(
    async () => {
      const supabase = await createAdminClient()
      const { data } = await supabase
        .from('church_leaders')
        .select('id, name, name_ar, title, title_ar, photo_url, bio, bio_ar, display_order')
        .eq('church_id', churchId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      return data ?? []
    },
    [`church-leaders-${churchId}`],
    { tags: [`church-leaders-${churchId}`], revalidate: 3600 }
  )()

// ─── Dashboard Summary Counts (300s TTL) ─────────────────────────

/**
 * Cached aggregate counts for the admin dashboard stat cards.
 * These are expensive count queries that don't need real-time accuracy.
 */
export const getCachedDashboardCounts = (churchId: string) =>
  unstable_cache(
    async () => {
      const supabase = await createAdminClient()
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [
        activeMembersRes,
        newThisMonthRes,
        activeGroupsRes,
        activeMinistriesRes,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('church_id', churchId)
          .eq('status', 'active')
          .eq('onboarding_completed', true),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('church_id', churchId)
          .eq('onboarding_completed', true)
          .gte('created_at', startOfMonth),
        supabase
          .from('groups')
          .select('id', { count: 'exact', head: true })
          .eq('church_id', churchId)
          .eq('is_active', true),
        supabase
          .from('ministries')
          .select('id', { count: 'exact', head: true })
          .eq('church_id', churchId)
          .eq('is_active', true),
      ])

      return {
        activeMembers: activeMembersRes.count ?? 0,
        newThisMonth: newThisMonthRes.count ?? 0,
        activeGroups: activeGroupsRes.count ?? 0,
        activeMinistries: activeMinistriesRes.count ?? 0,
      }
    },
    [`dashboard-counts-${churchId}`],
    { tags: [`dashboard-${churchId}`], revalidate: 300 }
  )()
