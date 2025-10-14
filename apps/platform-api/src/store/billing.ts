import { getPlatformDb } from '../db/client.js'
import type { OverdueInvoiceCount } from './types.js'

const db = getPlatformDb()

export const listOverdueInvoices = async (): Promise<OverdueInvoiceCount[]> => {
  const organizations = await db
    .selectFrom('organizations')
    .select(['id', 'subscription_id'])
    .execute()

  return organizations
    .filter((organization) => organization.subscription_id !== null)
    .map((organization) => ({
      organization_id: organization.id,
      overdue_invoice_count: 0,
    }))
}
