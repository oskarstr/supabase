import { setTimeout as sleep } from 'node:timers/promises'

export interface ProvisionContext {
  ref: string
  name: string
  organizationSlug: string
  cloudProvider: string
  region: string
  databasePassword: string
}

export interface DestroyContext {
  ref: string
  name: string
  organizationSlug: string
}

const parseDelay = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

const PROVISION_DELAY_MS = parseDelay(process.env.PROVISIONING_DELAY_MS, 1_000)
const DESTRUCTION_DELAY_MS = parseDelay(process.env.DESTRUCTION_DELAY_MS, 1_000)

export async function provisionProjectStack(context: ProvisionContext) {
  if (process.env.PLATFORM_API_LOG_PROVISIONING === 'true') {
    console.log('[provisioning] start', context)
  }

  await sleep(PROVISION_DELAY_MS)

  if (process.env.FAIL_PROVISIONING === 'true') {
    throw new Error('Provisioning failed due to FAIL_PROVISIONING flag')
  }

  if (process.env.PLATFORM_API_LOG_PROVISIONING === 'true') {
    console.log('[provisioning] complete', context.ref)
  }
}

export async function destroyProjectStack(context: DestroyContext) {
  if (process.env.PLATFORM_API_LOG_PROVISIONING === 'true') {
    console.log('[provisioning] destroy start', context)
  }

  await sleep(DESTRUCTION_DELAY_MS)

  if (process.env.FAIL_DESTRUCTION === 'true') {
    throw new Error('Destruction failed due to FAIL_DESTRUCTION flag')
  }

  if (process.env.PLATFORM_API_LOG_PROVISIONING === 'true') {
    console.log('[provisioning] destroy complete', context.ref)
  }
}
