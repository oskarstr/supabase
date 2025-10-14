import { state } from './state.js'
import type { OverdueInvoiceCount } from './types.js'

export const listOverdueInvoices = (): OverdueInvoiceCount[] =>
  state.organizations
    .filter((organization) => organization.subscription_id !== null)
    .map((organization) => ({
      organization_id: organization.id,
      overdue_invoice_count: 0,
    }))
