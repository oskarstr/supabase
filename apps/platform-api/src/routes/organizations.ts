import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'

import {
  CLOUD_PROVIDERS,
  createOrganization,
  getOrganizationCustomer,
  getOrganizationDetail,
  getOrganizationUsage,
  getOrganizationMembership,
  getSubscriptionForOrg,
  listAvailablePlans,
  listAvailableVersionsForOrganization,
  listMembersReachedFreeProjectLimit,
  listOAuthApps,
  listOrganizationDailyUsage,
  listOrganizationInvitations,
  listOrganizationMembers,
  listOrganizationRoles,
  listOrganizationInvoices,
  listOrganizationPayments,
  listOrganizationProjects,
  listOrganizationTaxIds,
  listOrganizations,
  getUpcomingInvoice,
  ensureProfile,
} from '../store/index.js'
import type {
  CloudProvider,
  CustomerProfileSummary,
  OrgDailyUsageResponse,
  InvoiceSummary,
  MemberWithFreeProjectLimit,
  OrganizationInvitationsResponse,
  OrganizationMember,
  OrganizationRolesResponse,
  OrgUsageResponse,
  Organization,
  PaymentMethodSummary,
  TaxIdSummary,
  UpcomingInvoiceSummary,
  OAuthAppType,
} from '../store/index.js'
import type { Profile } from '../store/types.js'

const unauthorizedResponse = { message: 'Unauthorized' }
const organizationNotFoundResponse = { message: 'Organization not found' }

const requireProfile = async (request: FastifyRequest, reply: FastifyReply): Promise<Profile | null> => {
  const cached = (request as any).profile as Profile | undefined
  if (cached) {
    return cached
  }

  const auth = request.auth
  if (!auth) {
    await reply.code(401).send(unauthorizedResponse)
    return null
  }

  return ensureProfile(auth.userId, auth.email)
}

const requireOrganizationMembership = async (
  profile: Profile,
  slug: string,
  reply: FastifyReply,
  request?: FastifyRequest
) => {
  const cached = (request as any)?.organizationMembership
  if (cached && cached.organization_slug === slug) {
    return cached
  }

  const membership = await getOrganizationMembership(profile.id, slug)
  if (!membership) {
    await reply.code(404).send(organizationNotFoundResponse)
    return null
  }
  return membership
}

const organizationsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (request, reply) => {
    const profile = await requireProfile(request, reply)
    if (!profile) return reply

    ;(request as any).profile = profile

    const params = request.params as { slug?: string } | undefined
    if (params?.slug) {
      const membership = await getOrganizationMembership(profile.id, params.slug)
      if (!membership) {
        await reply.code(404).send(organizationNotFoundResponse)
        return reply
      }
      ;(request as any).organizationMembership = membership
    }
    return
  })

  app.get('/', async (request, reply) => {
    const profile = await requireProfile(request, reply)
    if (!profile) return

    const organizations = await listOrganizations(profile.id)
    return reply.send(organizations)
  })

  app.post<{ Body: Parameters<typeof createOrganization>[1] }>('/', async (request, reply) => {
    const profile = await requireProfile(request, reply)
    if (!profile) return

    try {
      const org = await createOrganization(profile, request.body)
      return reply.code(201).send(org)
    } catch (error) {
      request.log.error({ err: error }, 'Failed to create organization')
      return reply.code(400).send({ message: (error as Error).message })
    }
  })

  app.get<{ Params: { slug: string } }>('/:slug', async (request, reply) => {
    const profile = await requireProfile(request, reply)
    if (!profile) return

    const membership = await requireOrganizationMembership(profile, request.params.slug, reply, request)
    if (!membership) return

    const org = await getOrganizationDetail(request.params.slug)
    if (!org) {
      return reply.code(404).send(organizationNotFoundResponse)
    }
    return reply.send(org)
  })

  app.get<{ Params: { slug: string } }>('/:slug/projects', async (request, reply) => {
    const profile = await requireProfile(request, reply)
    if (!profile) return

    const membership = await requireOrganizationMembership(profile, request.params.slug, reply, request)
    if (!membership) return

    const result = await listOrganizationProjects(request.params.slug)
    if (!result) {
      return reply.code(404).send(organizationNotFoundResponse)
    }
    return reply.send(result)
  })

  app.get<{ Params: { slug: string }; Reply: OrganizationMember[] | { message: string } }>(
    '/:slug/members',
    async (request, reply) => {
      const profile = await requireProfile(request, reply)
      if (!profile) return

      const membership = await requireOrganizationMembership(profile, request.params.slug, reply, request)
      if (!membership) return

      const members = await listOrganizationMembers(request.params.slug)
      return reply.send(members)
    }
  )

  app.get<{ Params: { slug: string }; Reply: OrganizationRolesResponse | { message: string } }>(
    '/:slug/roles',
    async (request, reply) => {
      const profile = await requireProfile(request, reply)
      if (!profile) return

      const membership = await requireOrganizationMembership(profile, request.params.slug, reply, request)
      if (!membership) return

      const roles = await listOrganizationRoles(request.params.slug)
      return reply.send(roles)
    }
  )

  app.get<{
    Params: { slug: string }
    Reply: OrganizationInvitationsResponse | { message: string }
  }>('/:slug/members/invitations', async (request, reply) => {
    const profile = await requireProfile(request, reply)
    if (!profile) return

    const membership = await requireOrganizationMembership(profile, request.params.slug, reply, request)
    if (!membership) return

    const invitations = await listOrganizationInvitations(request.params.slug)
    return reply.send(invitations)
  })

  app.get<{
    Params: { slug: string }
    Querystring: { type?: OAuthAppType }
  }>('/:slug/oauth/apps', async (request, reply) => {
    const profile = await requireProfile(request, reply)
    if (!profile) return

    const membership = await requireOrganizationMembership(profile, request.params.slug, reply, request)
    if (!membership) return

    const { slug } = request.params
    const type = request.query.type ?? 'authorized'
    if (!['authorized', 'published'].includes(type)) {
      return reply.code(400).send({ message: `Unsupported oauth app type: ${type}` })
    }
    const apps = await listOAuthApps(slug, type)
    if (!apps) {
      return reply.code(404).send({ message: 'Organization not found' })
    }
    return reply.send(apps)
  })

  app.post<{
    Params: { slug: string }
    Body: { provider: CloudProvider; region: string }
  }>('/:slug/available-versions', async (request, reply) => {
    const profile = await requireProfile(request, reply)
    if (!profile) return

    const membership = await requireOrganizationMembership(profile, request.params.slug, reply, request)
    if (!membership) return

    try {
      if (!CLOUD_PROVIDERS.includes(request.body.provider)) {
        return reply.code(400).send({
          message: `Unsupported cloud provider: ${request.body.provider}`,
        })
      }
      const response = listAvailableVersionsForOrganization(
        request.params.slug,
        request.body.provider,
        request.body.region
      )
      return reply.send(response)
    } catch (error) {
      request.log.error({ err: error }, 'Failed to fetch available versions')
      return reply.code(400).send({ message: (error as Error).message })
    }
  })

  app.get<{ Params: { slug: string }; Reply: OrgUsageResponse | { message: string } }>(
    '/:slug/usage',
    async (request, reply) => {
      const profile = await requireProfile(request, reply)
      if (!profile) return

      const membership = await requireOrganizationMembership(profile, request.params.slug, reply, request)
      if (!membership) return

      const usage = await getOrganizationUsage(request.params.slug)
      if (!usage) {
        return reply.code(404).send({ message: 'Organization not found' })
      }
      return reply.send(usage)
    }
  )

  app.get<{
    Params: { slug: string }
    Querystring: { start?: string; end?: string }
    Reply: OrgDailyUsageResponse | { message: string }
  }>('/:slug/usage/daily', async (request, reply) => {
    const profile = await requireProfile(request, reply)
    if (!profile) return

    const membership = await requireOrganizationMembership(profile, request.params.slug, reply, request)
    if (!membership) return

    const usage = await listOrganizationDailyUsage(
      request.params.slug,
      request.query.start,
      request.query.end
    )
    if (!usage) {
      return reply.code(404).send({ message: 'Organization not found' })
    }
    return reply.send(usage)
  })

  app.get<{
    Params: { slug: string }
    Reply: MemberWithFreeProjectLimit[] | { message: string }
  }>('/:slug/members/reached-free-project-limit', async (request, reply) => {
    const profile = await requireProfile(request, reply)
    if (!profile) return

    const membership = await requireOrganizationMembership(profile, request.params.slug, reply, request)
    if (!membership) return

    const members = await listMembersReachedFreeProjectLimit(request.params.slug)
    return reply.send(members ?? [])
  })

  app.get<{ Params: { slug: string }; Reply: CustomerProfileSummary | { message: string } }>(
    '/:slug/customer',
    async (request, reply) => {
      const profile = await requireProfile(request, reply)
      if (!profile) return

      const membership = await requireOrganizationMembership(profile, request.params.slug, reply, request)
      if (!membership) return

      const customer = getOrganizationCustomer(request.params.slug)
      return reply.send(customer)
    }
  )

  app.get<{ Params: { slug: string }; Reply: PaymentMethodSummary[] | { message: string } }>(
    '/:slug/payments',
    async (request, reply) => {
      const profile = await requireProfile(request, reply)
      if (!profile) return

      const membership = await requireOrganizationMembership(profile, request.params.slug, reply, request)
      if (!membership) return

      return reply.send(listOrganizationPayments(request.params.slug))
    }
  )

  app.get<{ Params: { slug: string }; Reply: TaxIdSummary | { message: string } }>(
    '/:slug/tax-ids',
    async (request, reply) => {
      const profile = await requireProfile(request, reply)
      if (!profile) return

      const membership = await requireOrganizationMembership(profile, request.params.slug, reply, request)
      if (!membership) return

      return reply.send(listOrganizationTaxIds(request.params.slug))
    }
  )

  app.get<{
    Params: { slug: string }
    Querystring: { limit?: number; offset?: number }
    Reply: InvoiceSummary[] | { message: string }
  }>('/:slug/billing/invoices', async (request, reply) => {
    const profile = await requireProfile(request, reply)
    if (!profile) return

    const membership = await requireOrganizationMembership(profile, request.params.slug, reply, request)
    if (!membership) return

    const invoices = listOrganizationInvoices(request.params.slug)
    const limitValue = request.query.limit
    const offsetValue = request.query.offset
    const limit =
      typeof limitValue === 'number' && Number.isFinite(limitValue) ? limitValue : invoices.length
    const offset = typeof offsetValue === 'number' && Number.isFinite(offsetValue) ? offsetValue : 0
    reply.header('X-Total-Count', invoices.length)
    return reply.send(invoices.slice(offset, offset + limit))
  })

  app.get<{ Params: { slug: string }; Reply: UpcomingInvoiceSummary | { message: string } }>(
    '/:slug/billing/invoices/upcoming',
    async (request, reply) => {
      const profile = await requireProfile(request, reply)
      if (!profile) return

      const membership = await requireOrganizationMembership(profile, request.params.slug, reply, request)
      if (!membership) return

      return reply.send(getUpcomingInvoice(request.params.slug))
    }
  )

  app.get<{
    Params: { slug: string }
    Reply: ReturnType<typeof listAvailablePlans> | { message: string }
  }>('/:slug/billing/plans', async (request, reply) => {
    const profile = await requireProfile(request, reply)
    if (!profile) return

    const membership = await requireOrganizationMembership(profile, request.params.slug, reply, request)
    if (!membership) return

    return reply.send(listAvailablePlans(request.params.slug))
  })

  app.get<{ Params: { slug: string } }>('/:slug/billing/subscription', async (request, reply) => {
    const profile = await requireProfile(request, reply)
    if (!profile) return

    const membership = await requireOrganizationMembership(profile, request.params.slug, reply, request)
    if (!membership) return

    const org = await getOrganizationDetail(request.params.slug)
    if (!org) {
      return reply.code(404).send(organizationNotFoundResponse)
    }
    return reply.send(getSubscriptionForOrg(org))
  })
}

export default organizationsRoutes
