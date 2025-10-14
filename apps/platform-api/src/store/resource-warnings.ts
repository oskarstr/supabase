import { state } from './state.js'
import type { ProjectResourceWarningsResponse } from './types.js'

export const listProjectResourceWarnings = (): ProjectResourceWarningsResponse[] =>
  state.projects.map((project) => ({
    auth_email_offender: null,
    auth_rate_limit_exhaustion: null,
    auth_restricted_email_sending: null,
    cpu_exhaustion: null,
    disk_io_exhaustion: null,
    disk_space_exhaustion: null,
    is_readonly_mode_enabled: false,
    memory_and_swap_exhaustion: null,
    need_pitr: null,
    project: project.ref,
  }))
