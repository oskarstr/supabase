import type {
  CustomerProfileSummary,
  InvoiceSummary,
  PaymentMethodSummary,
  TaxIdSummary,
  UpcomingInvoiceSummary,
} from './types.js'

const nowIso = () => new Date().toISOString()

export const getOrganizationCustomer = (_slug: string): CustomerProfileSummary => ({
  billing_email: 'billing@example.com',
  billing_address: '123 Supabase Ave, Internet City',
  card_brand: 'visa',
})

export const listOrganizationPayments = (_slug: string): PaymentMethodSummary[] => [
  {
    id: 'pm_default',
    type: 'card',
    created: Math.floor(Date.now() / 1000) - 86_400,
    has_address: true,
    is_default: true,
    card: {
      brand: 'visa',
      exp_month: 1,
      exp_year: new Date().getFullYear() + 2,
      last4: '4242',
    },
  },
]

export const listOrganizationTaxIds = (_slug: string): TaxIdSummary => ({
  tax_id: {
    country: 'US',
    type: 'eu_vat',
    value: 'US123456789',
  },
})

export const listOrganizationInvoices = (_slug: string): InvoiceSummary[] => [
  {
    id: 'inv_1',
    status: 'paid',
    amount_due: 0,
    hosted_invoice_url: 'https://example.com/invoice/inv_1',
    created_at: nowIso(),
  },
  {
    id: 'inv_2',
    status: 'open',
    amount_due: 1999,
    hosted_invoice_url: 'https://example.com/invoice/inv_2',
    created_at: nowIso(),
  },
]

export const getUpcomingInvoice = (_slug: string): UpcomingInvoiceSummary => ({
  amount_due: 1999,
  period_start: nowIso(),
  period_end: nowIso(),
})

export const listAvailablePlans = (_slug: string) => ({
  plans: [
    { id: 'free', name: 'Free', price: 0, change_type: 'none', effective_at: 'none', is_current: true },
    { id: 'pro', name: 'Pro', price: 2500, change_type: 'upgrade', effective_at: 'now', is_current: false },
  ],
})
