import type { NotificationsSummary } from './types.js'

export const getNotificationsSummary = (): NotificationsSummary => ({
  has_critical: false,
  has_warning: false,
  unread_count: 0,
})
