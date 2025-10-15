import { describe, expect, it } from 'vitest'

import { normalizeExcludedServices } from '../../src/provisioning/services.js'

describe('normalizeExcludedServices', () => {
  it('returns defaults when services are omitted', () => {
    expect(normalizeExcludedServices(undefined)).toEqual(['logflare', 'vector'])
    expect(normalizeExcludedServices([])).toEqual(['logflare', 'vector'])
  })

  it('keeps only valid entries and respects caller-provided exclusions', () => {
    expect(normalizeExcludedServices(['mailpit', 'MAILPIT', 'unknown'])).toEqual(['mailpit'])
  })

  it('lets the caller opt-in to services we exclude by default', () => {
    expect(normalizeExcludedServices(['logflare'])).toEqual(['logflare'])
    expect(normalizeExcludedServices(['vector'])).toEqual(['vector'])
  })

  it('falls back to defaults when user input normalizes to nothing', () => {
    expect(normalizeExcludedServices(['unknown'])).toEqual(['logflare', 'vector'])
  })
})
