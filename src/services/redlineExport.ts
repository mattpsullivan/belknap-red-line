import type { Trail, Completion } from '@/types'

/**
 * Sanitize a string for safe CSV export.
 * Prevents CSV injection by escaping formula-triggering characters
 * and handling special characters.
 */
function sanitizeCSVValue(value: string): string {
  // First, escape double quotes by doubling them
  let sanitized = value.replace(/"/g, '""')

  // Replace newlines and carriage returns with spaces
  sanitized = sanitized.replace(/[\r\n]+/g, ' ')

  // If the value starts with formula-triggering characters, prefix with single quote
  // This prevents spreadsheet applications from interpreting the value as a formula
  if (/^[=+\-@\t\r]/.test(sanitized)) {
    sanitized = "'" + sanitized
  }

  return sanitized
}

// Map our area names to BRATTS workbook section names
const AREA_TO_SECTION: Record<string, string> = {
  'Lockes Hill': 'Lockes',
  'Mt. Rowe & Gunstock Mountain': 'Rowe-Gunstock',
  'Belknap Mountain': 'Belknap',
  'Piper, Whiteface & Swett Mountains': 'Piper-Whiteface-Swett',
  'Mt. Klem, Mt. Mack & Mt. Anna': 'Klem-Mack-Anna',
  'Rand, Quarry & Straightback Mountains': 'Rand-Quarry-Straightback',
  'Mt. Major': 'Major',
  'Mt. Shannon, Goat Pasture Hill & Pine Mountain': 'Shannon-Goat',
}

// Section display names for the summary
const SECTION_DISPLAY_NAMES: Record<string, string> = {
  'Lockes': "Locke's Hill",
  'Rowe-Gunstock': 'Mt. Rowe and Gunstock Mountain',
  'Belknap': 'Belknap Mountain',
  'Piper-Whiteface-Swett': 'Piper Mountain, Whiteface Mountain, Swett Mountain',
  'Klem-Mack-Anna': 'Mt. Klem, Mt. Mack, Mt. Anna',
  'Rand-Quarry-Straightback': 'Rand Mountain, Quarry Mountain, Straightback Mountain',
  'Major': 'Mt. Major',
  'Shannon-Goat': 'Mt. Shannon, Goat Pasture Hill, Pine Mountain',
}

export interface RedlineExportData {
  sections: {
    name: string
    displayName: string
    trails: {
      name: string
      distance: number
      completedAt: Date | null
      notes: string
    }[]
    totalTrails: number
    completedTrails: number
    totalMiles: number
    completedMiles: number
  }[]
  totals: {
    totalTrails: number
    completedTrails: number
    totalMiles: number
    completedMiles: number
    percentComplete: number
  }
}

export function generateRedlineExportData(
  trails: Trail[],
  completions: Completion[]
): RedlineExportData {
  // Create a map of trail completions
  const completionMap = new Map<string, Completion>()
  completions.forEach((c) => {
    // Keep the most recent completion for each trail
    const existing = completionMap.get(c.trailId)
    if (!existing || new Date(c.completedAt) > new Date(existing.completedAt)) {
      completionMap.set(c.trailId, c)
    }
  })

  // Group trails by section
  const sectionMap = new Map<string, Trail[]>()
  trails.forEach((trail) => {
    const section = AREA_TO_SECTION[trail.area || ''] || 'Unknown'
    if (!sectionMap.has(section)) {
      sectionMap.set(section, [])
    }
    sectionMap.get(section)!.push(trail)
  })

  // Build sections in workbook order
  const sectionOrder = [
    'Lockes',
    'Rowe-Gunstock',
    'Belknap',
    'Piper-Whiteface-Swett',
    'Klem-Mack-Anna',
    'Rand-Quarry-Straightback',
    'Major',
    'Shannon-Goat',
  ]

  const sections = sectionOrder
    .filter((name) => sectionMap.has(name))
    .map((name) => {
      const sectionTrails = sectionMap.get(name) || []
      const trailData = sectionTrails.map((trail) => {
        const completion = completionMap.get(trail.id)
        return {
          name: trail.name,
          distance: trail.distance,
          completedAt: completion ? new Date(completion.completedAt) : null,
          notes: completion?.notes || '',
        }
      })

      const completedTrails = trailData.filter((t) => t.completedAt).length
      const completedMiles = trailData
        .filter((t) => t.completedAt)
        .reduce((sum, t) => sum + t.distance, 0)
      const totalMiles = trailData.reduce((sum, t) => sum + t.distance, 0)

      return {
        name,
        displayName: SECTION_DISPLAY_NAMES[name] || name,
        trails: trailData,
        totalTrails: trailData.length,
        completedTrails,
        totalMiles: Math.round(totalMiles * 100) / 100,
        completedMiles: Math.round(completedMiles * 100) / 100,
      }
    })

  // Calculate totals
  const totals = {
    totalTrails: sections.reduce((sum, s) => sum + s.totalTrails, 0),
    completedTrails: sections.reduce((sum, s) => sum + s.completedTrails, 0),
    totalMiles: Math.round(sections.reduce((sum, s) => sum + s.totalMiles, 0) * 100) / 100,
    completedMiles: Math.round(sections.reduce((sum, s) => sum + s.completedMiles, 0) * 100) / 100,
    percentComplete: 0,
  }
  totals.percentComplete = totals.totalTrails > 0
    ? Math.round((totals.completedTrails / totals.totalTrails) * 100)
    : 0

  return { sections, totals }
}

export function generateCSVExport(data: RedlineExportData): string {
  const lines: string[] = []

  // Header
  lines.push('Belknap Mountains Redlining Workbook Export')
  lines.push(`Generated: ${new Date().toLocaleDateString()}`)
  lines.push('')

  // Summary
  lines.push('SUMMARY')
  lines.push('Section,Total Trails,Completed,% Complete,Total Miles,Completed Miles')
  data.sections.forEach((section) => {
    const pct = section.totalTrails > 0
      ? Math.round((section.completedTrails / section.totalTrails) * 100)
      : 0
    lines.push(
      `"${section.displayName}",${section.totalTrails},${section.completedTrails},${pct}%,${section.totalMiles},${section.completedMiles}`
    )
  })
  lines.push(
    `"TOTAL",${data.totals.totalTrails},${data.totals.completedTrails},${data.totals.percentComplete}%,${data.totals.totalMiles},${data.totals.completedMiles}`
  )
  lines.push('')

  // Trail details by section
  lines.push('TRAIL DETAILS')
  lines.push('')
  data.sections.forEach((section) => {
    lines.push(`"${section.displayName}"`)
    lines.push('Trail Name,Distance (mi),Date Completed,Notes')
    section.trails.forEach((trail) => {
      const dateStr = trail.completedAt
        ? trail.completedAt.toLocaleDateString()
        : ''
      const name = sanitizeCSVValue(trail.name)
      const notes = sanitizeCSVValue(trail.notes)
      lines.push(`"${name}",${trail.distance},${dateStr},"${notes}"`)
    })
    lines.push('')
  })

  return lines.join('\n')
}

export function downloadRedlineCSV(data: RedlineExportData, filename = 'belknap-redline-export.csv'): void {
  const csv = generateCSVExport(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
