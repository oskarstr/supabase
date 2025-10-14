import type { NotificationV2, NotificationsSummary } from './types.js'

export const getNotificationsSummary = (): NotificationsSummary => ({
  has_critical: false,
  has_warning: false,
  unread_count: 0,
})

// TODO(platform-api): Provide real notification feed once backend events are wired in.
export const listNotifications = (): NotificationV2[] => [
  {
    id: 'platform-notification-1',
    inserted_at: new Date().toISOString(),
    name: 'welcome-message',
    priority: 'Info',
    status: 'seen',
    data: {
      title: 'Welcome to Supabase Platform mode',
      message:
        'This is a placeholder notification. Provisioning hooks and health checks are still being wired up.',
    },
    meta: {
      project_ref: null,
      org_slug: null,
    },
  },
]
