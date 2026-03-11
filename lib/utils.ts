import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDistanceToNow(dateStr: string, locale: string = 'ar'): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (locale.startsWith('ar')) {
    if (months > 0) return `منذ ${months} ${months === 1 ? 'شهر' : 'أشهر'}`
    if (weeks > 0) return `منذ ${weeks} ${weeks === 1 ? 'أسبوع' : 'أسابيع'}`
    if (days > 0) return `منذ ${days} ${days === 1 ? 'يوم' : 'أيام'}`
    if (hours > 0) return `منذ ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`
    if (minutes > 0) return `منذ ${minutes} دقيقة`
    return 'الآن'
  }

  if (months > 0) return `${months} ${months === 1 ? 'month' : 'months'} ago`
  if (weeks > 0) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
  if (days > 0) return `${days} ${days === 1 ? 'day' : 'days'} ago`
  if (hours > 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  if (minutes > 0) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
  return 'just now'
}
