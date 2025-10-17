import { describe, expect, it, beforeAll } from 'vitest'
import { resolve } from 'node:path'

import { constants } from '@supabase/shared-types'

import { PERMISSION_MATRIX } from '../src/config/permission-matrix.js'

type DocRow = {
  scope: string
  resource: string
  action: string
  roles: Record<string, boolean>
}

const { PermissionAction } = constants

const DOC_MATRIX_MAPPING: Record<
  string,
  { resource: string; actions: PermissionAction[] }
> = {
  'organization:Organization Management:Update': {
    resource: 'organizations',
    actions: [PermissionAction.UPDATE],
  },
  'organization:Organization Management:Delete': {
    resource: 'organizations',
    actions: [PermissionAction.DELETE],
  },
  'organization:Organization Management:OpenAI Telemetry Configuration': {
    resource: 'openai_telemetry',
    actions: [PermissionAction.READ, PermissionAction.UPDATE],
  },
  'organization:Members:Organization Members - List': {
    resource: 'organization_members',
    actions: [PermissionAction.READ],
  },
  'organization:Members:Owner - Add/Remove': {
    resource: 'organization_members.owner',
    actions: [PermissionAction.CREATE, PermissionAction.DELETE],
  },
  'organization:Members:Administrator - Add/Remove': {
    resource: 'organization_members.admin',
    actions: [PermissionAction.CREATE, PermissionAction.DELETE],
  },
  'organization:Members:Developer - Add/Remove': {
    resource: 'organization_members.developer',
    actions: [PermissionAction.CREATE, PermissionAction.DELETE],
  },
  'organization:Members:Invite / Revoke / Resend': {
    resource: 'user_invites',
    actions: [PermissionAction.CREATE, PermissionAction.DELETE],
  },
  'organization:Billing:Billing Email - View/Update': {
    resource: 'stripe.customer',
    actions: [PermissionAction.BILLING_WRITE],
  },
  'organization:Billing:Subscription - View/Update': {
    resource: 'stripe.subscriptions',
    actions: [PermissionAction.BILLING_WRITE],
  },
  'organization:Billing:Billing Address - View/Update': {
    resource: 'stripe.customer',
    actions: [PermissionAction.BILLING_WRITE],
  },
  'organization:Billing:Tax Codes - View/Update': {
    resource: 'stripe.tax_ids',
    actions: [PermissionAction.BILLING_WRITE],
  },
  'organization:Billing:Payment Methods - View/Update': {
    resource: 'stripe.payment_methods',
    actions: [PermissionAction.BILLING_WRITE],
  },
  'organization:Billing:Invoices - List': {
    resource: 'stripe.customer',
    actions: [PermissionAction.BILLING_READ],
  },
  'organization:Billing:Usage - View': {
    resource: 'stripe.customer',
    actions: [PermissionAction.BILLING_READ],
  },
  'organization:Integrations (Org Settings):GitHub Connections (Create/Update/Delete/View)': {
    resource: 'integrations.github_connections',
    actions: [
      PermissionAction.CREATE,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
      PermissionAction.READ,
    ],
  },
  'organization:Integrations (Org Settings):Vercel Connections (Create/Update/Delete/View)': {
    resource: 'integrations.vercel_connections',
    actions: [
      PermissionAction.CREATE,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
      PermissionAction.READ,
    ],
  },
  'organization:OAuth Apps:Create/Update/Delete/List': {
    resource: 'approved_oauth_apps',
    actions: [
      PermissionAction.CREATE,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
      PermissionAction.READ,
    ],
  },
  'organization:Audit Logs:View Audit logs': {
    resource: 'audit_logs',
    actions: [PermissionAction.READ],
  },
  'organization:Legal Documents:SOC2 Type 2 Report - Download': {
    resource: 'legal_documents',
    actions: [PermissionAction.READ],
  },
  'organization:Legal Documents:Security Questionnaire - Download': {
    resource: 'legal_documents',
    actions: [PermissionAction.READ],
  },
}

const DOC_ROLE_TO_MATRIX: Record<string, 'owner' | 'admin' | 'developer' | 'read_only'> = {
  owner: 'owner',
  administrator: 'admin',
  admin: 'admin',
  developer: 'developer',
  read_only: 'read_only',
}

const docKey = (row: DocRow) => `${row.scope}:${row.resource}:${row.action}`

const toAllowedRoles = (roles: DocRow['roles']) => {
  const allowed = new Set<'owner' | 'admin' | 'developer' | 'read_only'>()
  const denied = new Set<'owner' | 'admin' | 'developer' | 'read_only'>()
  for (const [role, permitted] of Object.entries(roles)) {
    const mapped = DOC_ROLE_TO_MATRIX[role]
    if (!mapped) continue
    if (permitted) {
      allowed.add(mapped)
    } else {
      denied.add(mapped)
    }
  }
  return { allowed, denied }
}

describe('permission matrix matches documentation highlights', () => {
  let dataset: DocRow[] = []

  beforeAll(async () => {
    const cwd = process.cwd()
    const repoRoot = resolve(cwd, '../..')
    process.chdir(repoRoot)
    try {
      const module = await import('../../../.agent/scripts/parse-accesscontrol.mjs')
      dataset = module.accessControlDataset as DocRow[]
    } finally {
      process.chdir(cwd)
    }
  })

  it('covers key organization-level entries from the public docs', () => {
    for (const [key, mapping] of Object.entries(DOC_MATRIX_MAPPING)) {
      const row = dataset.find((entry) => docKey(entry) === key)
      expect(row, `expected documentation row for ${key}`).toBeDefined()
      if (!row) continue

      const { allowed, denied } = toAllowedRoles(row.roles)
      for (const action of mapping.actions) {
        const matrixEntry = PERMISSION_MATRIX.find(
          (entry) =>
            entry.scope === row.scope &&
            entry.resource === mapping.resource &&
            entry.action === action
        )

        expect(matrixEntry, `missing matrix entry for ${mapping.resource}/${action}`).toBeDefined()
        if (!matrixEntry) continue

        for (const role of allowed) {
          expect(matrixEntry.roles).toContain(role)
        }

        const forbidden = matrixEntry.roles.filter((role) => denied.has(role))
        expect(forbidden, `roles not permitted by docs for ${mapping.resource}/${action}`).toEqual([])
      }
    }
  })
})
