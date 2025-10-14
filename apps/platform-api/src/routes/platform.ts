import type { FastifyPluginAsync } from 'fastify'

import {
  createProject,
  createOrganization,
  deleteProject,
  getProfile,
  getProject,
  getSubscriptionForOrg,
  getOrganizationDetail,
  getAvailableRegions,
  listAvailableVersionsForOrganization,
  listOAuthApps,
  listOrganizationProjects,
  listOrganizations,
  listProjectDetails,
} from '../store.js'
import { CLOUD_PROVIDERS } from '../store.js'
import type {
  Organization,
  CreateOrganizationBody,
  CloudProvider,
  OAuthAppType,
} from '../store.js'

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const readEnv = (key: string) => {
  const raw = process.env[key]
  if (!raw) return undefined
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const SUPABASE_INTERNAL_URL =
  readEnv('SUPABASE_URL') ?? readEnv('SUPABASE_PUBLIC_URL') ?? 'http://kong:8000'

const PLATFORM_AUTH_BASE =
  readEnv('PLATFORM_AUTH_URL') ??
  readEnv('SUPABASE_GOTRUE_URL') ??
  `${stripTrailingSlash(SUPABASE_INTERNAL_URL)}/auth/v1`

const SUPABASE_SERVICE_KEY =
  readEnv('SERVICE_ROLE_KEY') ?? readEnv('SUPABASE_SERVICE_KEY') ?? readEnv('SERVICE_KEY')

type SignUpBody = {
  email: string
  password: string
  redirectTo?: string
  hcaptchaToken?: string | null
}

const platformRoutes: FastifyPluginAsync = async (app) => {
  app.get('/profile', async (_request, reply) => {
    return reply.send(getProfile())
  })

  app.get('/organizations', async (_request, reply) => {
    return reply.send(listOrganizations())
  })

  app.get('/projects', async (_request, reply) => {
    const projects = listProjectDetails()
    return reply.send({
      pagination: {
        count: projects.length,
        limit: projects.length,
        offset: 0,
      },
      projects,
    })
  })

  app.get<{
    Querystring: { cloud_provider?: CloudProvider; organization_slug?: string }
  }>('/projects/available-regions', async (request, reply) => {
    const { cloud_provider, organization_slug } = request.query
    if (!cloud_provider || !organization_slug) {
      return reply.code(400).send({ message: 'cloud_provider and organization_slug are required' })
    }
    if (!CLOUD_PROVIDERS.includes(cloud_provider)) {
      return reply.code(400).send({ message: `Unsupported cloud provider: ${cloud_provider}` })
    }
    return reply.send(getAvailableRegions(cloud_provider, organization_slug))
  })

  app.get<{
    Params: { slug: string }
    Querystring: { type?: OAuthAppType }
  }>('/organizations/:slug/oauth/apps', async (request, reply) => {
    const { slug } = request.params
    const type = request.query.type ?? 'authorized'
    if (!['authorized', 'published'].includes(type)) {
      return reply.code(400).send({ message: `Unsupported oauth app type: ${type}` })
    }
    const apps = listOAuthApps(slug, type)
    if (!apps) {
      return reply.code(404).send({ message: 'Organization not found' })
    }
    return reply.send(apps)
  })

  app.get<{ Params: { slug: string } }>(
    '/organizations/:slug',
    async (request, reply) => {
      const org = getOrganizationDetail(request.params.slug)
      if (!org) {
        return reply.code(404).send({ message: 'Organization not found' })
      }
      return reply.send(org)
    }
  )

  app.get<{ Params: { slug: string } }>(
    '/organizations/:slug/projects',
    async (request, reply) => {
      const result = listOrganizationProjects(request.params.slug)
      if (!result) {
        return reply.code(404).send({ message: 'Organization not found' })
      }
      return reply.send(result)
    }
  )

  app.get<{ Params: { slug: string } }>(
    '/organizations/:slug/billing/subscription',
    async (request, reply) => {
      const org = listOrganizations().find(
        (organization: Organization) => organization.slug === request.params.slug
      )
      if (!org) {
        return reply.code(404).send({ message: 'Organization not found' })
      }
      return reply.send(getSubscriptionForOrg(org))
    }
  )

  app.get<{ Params: { ref: string } }>('/projects/:ref', async (request, reply) => {
    const project = getProject(request.params.ref)
    if (!project) {
      return reply.code(404).send({ message: 'Project not found' })
    }
    return reply.send(project)
  })

  app.post<{ Body: Parameters<typeof createProject>[0] }>(
    '/projects',
    async (request, reply) => {
      try {
        const response = createProject(request.body)
        return reply.code(201).send(response)
      } catch (error) {
        request.log.error({ err: error }, 'Failed to create project')
        return reply.code(400).send({ message: (error as Error).message })
      }
    }
  )

  app.post<{ Body: CreateOrganizationBody }>(
    '/organizations',
    async (request, reply) => {
      try {
        const org = createOrganization(request.body)
        return reply.code(201).send(org)
      } catch (error) {
        request.log.error({ err: error }, 'Failed to create organization')
        return reply.code(400).send({ message: (error as Error).message })
      }
    }
  )

  app.post<{
    Params: { slug: string }
    Body: { provider: CloudProvider; region: string }
  }>(
    '/organizations/:slug/available-versions',
    async (request, reply) => {
      try {
        if (!CLOUD_PROVIDERS.includes(request.body.provider)) {
          return reply.code(400).send({ message: `Unsupported cloud provider: ${request.body.provider}` })
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
    }
  )

  app.post<{ Body: SignUpBody }>('/signup', async (request, reply) => {
    const { email, password, redirectTo, hcaptchaToken } = request.body

    if (!email || !password) {
      return reply.code(400).send({ message: 'Email and password are required' })
    }

    try {
      const signupUrl = new URL('signup', `${stripTrailingSlash(PLATFORM_AUTH_BASE)}/`).toString()

      const payload: Record<string, unknown> = {
        email,
        password,
      }

      if (redirectTo) {
        payload.redirect_to = redirectTo
      }

      if (hcaptchaToken) {
        payload.gotrue_meta_security = { captcha_token: hcaptchaToken }
      }

      const headers: Record<string, string> = {
        accept: 'application/json',
        'content-type': 'application/json',
      }

      if (SUPABASE_SERVICE_KEY) {
        headers.apikey = SUPABASE_SERVICE_KEY
        headers.authorization = `Bearer ${SUPABASE_SERVICE_KEY}`
      }

      request.log.info(
        {
          signupUrl,
          hasServiceKey: Boolean(SUPABASE_SERVICE_KEY),
        },
        'Forwarding sign-up request to GoTrue'
      )

      const response = await fetch(signupUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      const rawText = await response.text()
      let parsed: any
      if (rawText.length > 0) {
        try {
          parsed = JSON.parse(rawText)
        } catch {
          parsed = undefined
        }
      }

      if (!response.ok) {
        const message =
          parsed?.error_description ??
          parsed?.msg ??
          parsed?.message ??
          'Failed to sign up. Please try again.'

        request.log.error(
          { status: response.status, body: parsed ?? rawText },
          'Sign-up request to GoTrue failed'
        )

        return reply.code(response.status).send({ message })
      }

      return reply.code(201).send(parsed ?? {})
    } catch (error) {
      request.log.error({ err: error }, 'Unexpected error during sign-up')
      return reply.code(500).send({ message: 'Unexpected error while signing up' })
    }
  })

  app.delete<{ Params: { ref: string } }>(
    '/projects/:ref',
    async (request, reply) => {
      const removed = deleteProject(request.params.ref)
      if (!removed) {
        return reply.code(404).send({ message: 'Project not found' })
      }
      return reply.send(removed)
    }
  )
}

export default platformRoutes
