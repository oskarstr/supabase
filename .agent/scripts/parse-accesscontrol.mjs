#!/usr/bin/env node

/**
 * Parses `.agent/docs/supabase/accesscontrol.md` into a structured JSON
 * representation so we can compare it against the backend permission matrix.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DOC_PATH = path.resolve(
  process.cwd(),
  '.agent/docs/supabase/accesscontrol.md'
)

const content = fs.readFileSync(DOC_PATH, 'utf8')
const lines = content.split('\n')

const SECTION_CONFIG = [
  {
    heading: '## Organization Permissions Across Roles',
    scope: 'organization',
    roleHeaders: ['Owner', 'Administrator', 'Developer', 'Read-Only'],
  },
  {
    heading: '## Project Permissions Across Roles',
    scope: 'project',
    roleHeaders: ['Owner', 'Admin', 'Developer', 'Read-Only'],
  },
]

const sanitizeText = (value) =>
  value
    .replace(/\*\*/g, '') // strip markdown bold markers
    .replace(/\s+/g, ' ')
    .trim()

const isTruthyCell = (value) => value.includes('✅')

const extractTableLines = (heading) => {
  const startIndex = lines.findIndex((line) => line.trim() === heading)
  if (startIndex === -1) {
    throw new Error(`Failed to locate section heading "${heading}"`)
  }

  let tableStart = startIndex + 1
  while (tableStart < lines.length && !lines[tableStart].startsWith('|')) {
    tableStart += 1
  }

  const tableLines = []
  let index = tableStart
  while (index < lines.length && lines[index].startsWith('|')) {
    tableLines.push(lines[index])
    index += 1
  }

  if (tableLines.length === 0) {
    throw new Error(`No table rows found for heading "${heading}"`)
  }

  return tableLines
}

const parseTable = ({ heading, scope, roleHeaders }) => {
  const tableLines = extractTableLines(heading)
  const [headerLine, separatorLine, ...rowLines] = tableLines
  if (!separatorLine || !separatorLine.startsWith('|-')) {
    throw new Error(`Malformed table detected under "${heading}"`)
  }

  const headers = headerLine
    .split('|')
    .map((cell) => sanitizeText(cell))
    .filter(Boolean)

  const resourceHeader = headers[0]
  const actionHeader = headers[1]
  const roleHeaderSet = new Set(roleHeaders)

  const roleIndices = {}
  headers.forEach((header, index) => {
    if (roleHeaderSet.has(header)) {
      roleIndices[header] = index
    }
  })

  const rows = []
  let currentResource = ''

  for (const line of rowLines) {
    const rawCells = line.split('|').slice(1, -1)
    if (rawCells.length === 0) continue

    const cells = rawCells.map((cell) => sanitizeText(cell))

    const resourceCell =
      cells[0]?.length > 0 ? cells[0] : currentResource || resourceHeader
    const actionCell = cells[1] ?? ''

    if (!resourceCell) continue
    currentResource = resourceCell

    const normalizeRoleKey = (header) =>
      header.toLowerCase().replace(/\s+/g, '_').replace('-', '_')

    const roles = {}
    for (const header of roleHeaders) {
      const index = headers.indexOf(header)
      if (index === -1) continue
      const roleKey = normalizeRoleKey(header)
      roles[roleKey] = isTruthyCell(cells[index] ?? '')
    }

    rows.push({
      scope,
      resource: resourceCell,
      action: actionCell,
      roles,
    })
  }

  return rows
}

export const accessControlDataset = SECTION_CONFIG.flatMap((config) => parseTable(config))

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(accessControlDataset, null, 2))
}
