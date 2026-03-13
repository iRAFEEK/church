/**
 * Ekklesia Analytics Event Catalog
 *
 * Naming: {module}_{action}_{object}
 * - module: feature area (auth, member, group, finance, etc.)
 * - action: past tense verb (created, updated, deleted, viewed, clicked)
 * - object: what was acted on (singular noun)
 *
 * Properties:
 * - Always include: church_id, role, locale
 * - Never include: names, emails, phone numbers, personal identifiers
 * - IDs are OK (opaque UUIDs)
 * - Amounts are OK for finance events
 */

import { posthog } from './posthog-client'

interface BaseProperties {
  church_id: string
  role: string
  locale: string
}

export const analytics = {

  // ── Auth ───────────────────────────────────────────────────

  auth: {
    loggedIn: (props: BaseProperties & { method: 'email' | 'magic_link' }) => {
      posthog.capture('auth_logged_in', props)
    },

    loggedOut: (props: BaseProperties) => {
      posthog.capture('auth_logged_out', props)
    },

    churchSwitched: (props: BaseProperties & { to_church_id: string }) => {
      posthog.capture('auth_church_switched', props)
    },

    churchRegistered: (props: { locale: string }) => {
      posthog.capture('auth_church_registered', props)
    },
  },

  // ── Navigation ─────────────────────────────────────────────

  nav: {
    pageViewed: (props: BaseProperties & {
      path: string
      page_name: string
    }) => {
      posthog.capture('$pageview', { ...props, $current_url: props.path })
    },

    tabTapped: (props: BaseProperties & { tab: string }) => {
      posthog.capture('nav_tab_tapped', props)
    },
  },

  // ── Members ────────────────────────────────────────────────

  member: {
    listViewed: (props: BaseProperties & { count: number }) => {
      posthog.capture('member_list_viewed', props)
    },

    profileViewed: (props: BaseProperties & { member_id: string }) => {
      posthog.capture('member_profile_viewed', props)
    },

    created: (props: BaseProperties & { method: 'manual' | 'qr_join' | 'invite' }) => {
      posthog.capture('member_created', props)
    },

    roleChanged: (props: BaseProperties & {
      member_id: string
      from_role: string
      to_role: string
    }) => {
      posthog.capture('member_role_changed', props)
    },

    flaggedAtRisk: (props: BaseProperties & { member_id: string }) => {
      posthog.capture('member_flagged_at_risk', props)
    },

    milestoneAdded: (props: BaseProperties & {
      member_id: string
      milestone_type: string
    }) => {
      posthog.capture('member_milestone_added', props)
    },
  },

  // ── Visitors ───────────────────────────────────────────────

  visitor: {
    submittedQR: (props: { church_id: string; locale: string }) => {
      posthog.capture('visitor_submitted_qr', props)
    },

    assigned: (props: BaseProperties & { visitor_id: string }) => {
      posthog.capture('visitor_assigned', props)
    },

    statusUpdated: (props: BaseProperties & {
      visitor_id: string
      from_status: string
      to_status: string
    }) => {
      posthog.capture('visitor_status_updated', props)
    },

    converted: (props: BaseProperties & { visitor_id: string }) => {
      posthog.capture('visitor_converted', props)
    },
  },

  // ── Groups ─────────────────────────────────────────────────

  group: {
    listViewed: (props: BaseProperties & { count: number }) => {
      posthog.capture('group_list_viewed', props)
    },

    viewed: (props: BaseProperties & { group_id: string; group_type: string }) => {
      posthog.capture('group_viewed', props)
    },

    gatheringCreated: (props: BaseProperties & {
      group_id: string
      attendance_count: number
    }) => {
      posthog.capture('group_gathering_created', props)
    },

    attendanceMarked: (props: BaseProperties & {
      group_id: string
      gathering_id: string
      present_count: number
      absent_count: number
      attendance_rate: number
    }) => {
      posthog.capture('group_attendance_marked', props)
    },

    prayerAdded: (props: BaseProperties & { group_id: string }) => {
      posthog.capture('group_prayer_added', props)
    },
  },

  // ── Events ─────────────────────────────────────────────────

  event: {
    listViewed: (props: BaseProperties & { count: number }) => {
      posthog.capture('event_list_viewed', props)
    },

    viewed: (props: BaseProperties & {
      event_id: string
      event_type: string
    }) => {
      posthog.capture('event_viewed', props)
    },

    created: (props: BaseProperties & {
      event_type: string
      from_template: boolean
    }) => {
      posthog.capture('event_created', props)
    },

    registered: (props: BaseProperties & {
      event_id: string
      event_type: string
    }) => {
      posthog.capture('event_registered', props)
    },

    serviceAssigned: (props: BaseProperties & {
      event_id: string
      ministry_id: string
    }) => {
      posthog.capture('event_service_assigned', props)
    },
  },

  // ── Finance ────────────────────────────────────────────────

  finance: {
    dashboardViewed: (props: BaseProperties) => {
      posthog.capture('finance_dashboard_viewed', props)
    },

    donationRecorded: (props: BaseProperties & {
      amount: number
      currency: string
      method: string
      fund_id: string
      has_campaign: boolean
    }) => {
      posthog.capture('finance_donation_recorded', props)
      posthog.capture('$revenue', {
        ...props,
        revenue: props.amount,
        revenue_type: 'donation',
      })
    },

    expenseSubmitted: (props: BaseProperties & {
      amount: number
      currency: string
      category: string
    }) => {
      posthog.capture('finance_expense_submitted', props)
    },

    budgetCreated: (props: BaseProperties & {
      fiscal_year: string
      total_amount: number
      currency: string
      line_item_count: number
    }) => {
      posthog.capture('finance_budget_created', props)
    },

    campaignCreated: (props: BaseProperties & {
      goal_amount: number
      currency: string
    }) => {
      posthog.capture('finance_campaign_created', props)
    },

    reportGenerated: (props: BaseProperties & {
      report_type: string
      date_range_days: number
    }) => {
      posthog.capture('finance_report_generated', props)
    },
  },

  // ── Notifications ──────────────────────────────────────────

  notification: {
    sent: (props: BaseProperties & {
      audience_size: number
      channels: string[]
      notification_type: string
    }) => {
      posthog.capture('notification_sent', props)
    },

    read: (props: BaseProperties & { notification_id: string }) => {
      posthog.capture('notification_read', props)
    },

    pushGranted: (props: BaseProperties) => {
      posthog.capture('notification_push_granted', props)
    },

    pushDenied: (props: BaseProperties) => {
      posthog.capture('notification_push_denied', props)
    },
  },

  // ── Announcements ──────────────────────────────────────────

  announcement: {
    published: (props: BaseProperties & { announcement_id: string }) => {
      posthog.capture('announcement_published', props)
    },

    viewed: (props: BaseProperties & { announcement_id: string }) => {
      posthog.capture('announcement_viewed', props)
    },
  },

  // ── Serving ────────────────────────────────────────────────

  serving: {
    slotCreated: (props: BaseProperties & { area_id: string }) => {
      posthog.capture('serving_slot_created', props)
    },

    signedUp: (props: BaseProperties & {
      slot_id: string
      area_id: string
    }) => {
      posthog.capture('serving_signed_up', props)
    },

    signupCancelled: (props: BaseProperties & { slot_id: string }) => {
      posthog.capture('serving_signup_cancelled', props)
    },
  },

  // ── Songs / Worship ────────────────────────────────────────

  song: {
    presenterOpened: (props: BaseProperties & { song_id: string }) => {
      posthog.capture('song_presenter_opened', props)
    },

    created: (props: BaseProperties & { has_arabic: boolean }) => {
      posthog.capture('song_created', props)
    },
  },

  // ── Bible ──────────────────────────────────────────────────

  bible: {
    chapterRead: (props: BaseProperties & {
      book: string
      chapter: number
      bible_version: string
    }) => {
      posthog.capture('bible_chapter_read', props)
    },

    bookmarked: (props: BaseProperties & { book: string; chapter: number }) => {
      posthog.capture('bible_bookmarked', props)
    },

    highlighted: (props: BaseProperties & { book: string; chapter: number }) => {
      posthog.capture('bible_highlighted', props)
    },

    searched: (props: BaseProperties & { has_results: boolean }) => {
      posthog.capture('bible_searched', props)
    },
  },

  // ── Prayer ─────────────────────────────────────────────────

  prayer: {
    requestSubmitted: (props: BaseProperties & { is_private: boolean }) => {
      posthog.capture('prayer_request_submitted', props)
    },

    requestAssigned: (props: BaseProperties) => {
      posthog.capture('prayer_request_assigned', props)
    },
  },

  // ── Outreach ───────────────────────────────────────────────

  outreach: {
    visitLogged: (props: BaseProperties & { visit_type: string }) => {
      posthog.capture('outreach_visit_logged', props)
    },
  },

  // ── Community / Church Needs ───────────────────────────────

  community: {
    needCreated: (props: BaseProperties & { category: string }) => {
      posthog.capture('community_need_created', props)
    },

    needViewed: (props: BaseProperties & { need_id: string }) => {
      posthog.capture('community_need_viewed', props)
    },

    responseSubmitted: (props: BaseProperties & { need_id: string }) => {
      posthog.capture('community_response_submitted', props)
    },

    messageSent: (props: BaseProperties & { response_id: string }) => {
      posthog.capture('community_message_sent', props)
    },
  },

  // ── Settings / Permissions ─────────────────────────────────

  settings: {
    permissionUpdated: (props: BaseProperties & {
      permission_key: string
      for_role: string
    }) => {
      posthog.capture('settings_permission_updated', props)
    },

    featureToggled: (props: BaseProperties & {
      feature: string
      enabled: boolean
    }) => {
      posthog.capture('settings_feature_toggled', props)
    },
  },

  // ── Errors ─────────────────────────────────────────────────

  error: {
    apiError: (props: BaseProperties & {
      endpoint: string
      status_code: number
      error_code?: string
    }) => {
      posthog.capture('error_api', props)
    },

    boundaryTriggered: (props: {
      page: string
      error_message: string
    }) => {
      posthog.capture('error_boundary_triggered', {
        ...props,
        error_message: props.error_message.slice(0, 200),
      })
    },
  },

  // ── User identification ────────────────────────────────────

  identify: (props: {
    user_id: string
    church_id: string
    role: string
    locale: string
  }) => {
    posthog.identify(props.user_id, {
      church_id: props.church_id,
      role: props.role,
      locale: props.locale,
    })
  },

  reset: () => {
    posthog.reset()
  },
}
