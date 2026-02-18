// ============================================================
// Gathering generation logic
// ============================================================

const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
}

/**
 * Given a group's meeting_day and meeting_time, compute the next
 * occurrence of that weekday/time at or after `from` (defaults to now).
 */
export function getNextGatheringDate(
  meetingDay: string,
  meetingTime: string | null,
  from: Date = new Date()
): Date {
  const targetDay = DAY_MAP[meetingDay.toLowerCase()] ?? 0
  const result = new Date(from)

  // Parse time (HH:MM)
  const [hours, minutes] = (meetingTime || '18:00').split(':').map(Number)

  // Find next occurrence of targetDay
  const currentDay = result.getDay()
  let daysUntil = (targetDay - currentDay + 7) % 7
  // If today is the day but time has already passed, jump to next week
  if (daysUntil === 0) {
    const nowMins = result.getHours() * 60 + result.getMinutes()
    const targetMins = hours * 60 + minutes
    if (nowMins >= targetMins) daysUntil = 7
  }

  result.setDate(result.getDate() + daysUntil)
  result.setHours(hours, minutes, 0, 0)
  return result
}

/**
 * Format a date in Arabic-friendly way
 */
export function formatGatheringDate(dateStr: string, lang: 'ar' | 'en' = 'ar'): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(lang === 'ar' ? 'ar-LB' : 'en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatGatheringTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('ar-LB', { hour: '2-digit', minute: '2-digit' })
}
