#!/usr/bin/env node

/**
 * Re-densify under-sampled trails from OSM.
 *
 * The original match-osm-trails.js kept only the single longest OSM way per
 * trail. OSM trails are usually split into several contiguous ways, so trails
 * lost most of their geometry and rendered as straight segments. This script
 * gathers ALL OSM ways for a trail's name, chains them into one ordered
 * polyline (greedy nearest-endpoint), and updates trails.json only when the
 * join genuinely improves the trail and stays geometrically sane.
 *
 * Coordinates are written WITHOUT elevation; run enrich-updated-trails.cjs for
 * the updated ids afterwards.
 *
 * Usage:
 *   node scripts/fetch-osm-trails.js        # refresh /tmp/osm_trails_broad.json
 *   node scripts/redensify-trails.js [--write]
 *
 * Without --write it is a dry run (reports what it would change).
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TRAILS = path.join(__dirname, '../src/data/trails.json')
const OSM = '/tmp/osm_trails_broad.json'

// Acceptance thresholds.
const MAX_GAP_M = 200 // a good join has no large jumps between consecutive points
const MIN_LEN_RATIO = 0.5 // joined length vs the trail's stated distance
const MAX_LEN_RATIO = 2.5
// Only chain segments that actually connect. Contiguous OSM ways share a node
// (~0 m apart); anything farther is a spur or a different trail with the same
// name, so we drop it rather than draw a long straight jump to it.
const JOIN_THRESHOLD_M = 80

const write = process.argv.includes('--write')

function haversine(a, b) {
  const R = 6371000
  const toR = (x) => (x * Math.PI) / 180
  const dLat = toR(b.lat - a.lat)
  const dLng = toR(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

function lineLengthMeters(pts) {
  let d = 0
  for (let i = 1; i < pts.length; i++) d += haversine(pts[i - 1], pts[i])
  return d
}

function maxGapMeters(pts) {
  let m = 0
  for (let i = 1; i < pts.length; i++) m = Math.max(m, haversine(pts[i - 1], pts[i]))
  return m
}

/**
 * Reconstruct a path from points that are present but out of order (e.g. several
 * GPX recordings concatenated). Greedy nearest-neighbour from the given start.
 */
function nearestNeighbourOrder(coords, startIdx) {
  const used = new Array(coords.length).fill(false)
  const order = [startIdx]
  used[startIdx] = true
  let cur = startIdx
  for (let k = 1; k < coords.length; k++) {
    let bi = -1
    let bd = Infinity
    for (let j = 0; j < coords.length; j++) {
      if (used[j]) continue
      const d = haversine(coords[cur], coords[j])
      if (d < bd) {
        bd = d
        bi = j
      }
    }
    order.push(bi)
    used[bi] = true
    cur = bi
  }
  return order.map((i) => coords[i])
}

const M_PER_FT = 0.3048
/** Recompute summary elevation stats (feet) from per-point elevations. */
function elevationStats(coords) {
  const elev = coords.map((c) => c.elevation).filter((e) => e != null)
  if (elev.length < 2) return null
  let gain = 0
  let loss = 0
  for (let i = 1; i < elev.length; i++) {
    const d = elev[i] - elev[i - 1]
    if (d > 0) gain += d
    else loss -= d
  }
  return {
    elevationGain: Math.round(gain),
    elevationLoss: Math.round(loss),
    elevationMin: Math.round(Math.min(...elev)),
    elevationMax: Math.round(Math.max(...elev)),
  }
}

/** Greedy nearest-endpoint chain of segments (each an array of {lat,lng}). */
function chainSegments(segments) {
  const segs = segments.map((s) => s.slice()).sort((a, b) => b.length - a.length)
  let chain = segs.shift()
  const remaining = segs
  let progress = true
  while (remaining.length && progress) {
    progress = false
    let best = null
    for (let i = 0; i < remaining.length; i++) {
      const s = remaining[i]
      const head = chain[0]
      const tail = chain[chain.length - 1]
      const opts = [
        { d: haversine(tail, s[0]), where: 'tail', rev: false },
        { d: haversine(tail, s[s.length - 1]), where: 'tail', rev: true },
        { d: haversine(head, s[s.length - 1]), where: 'head', rev: false },
        { d: haversine(head, s[0]), where: 'head', rev: true },
      ]
      const o = opts.reduce((a, b) => (a.d < b.d ? a : b))
      if (!best || o.d < best.d) best = { i, ...o }
    }
    // Stop once nothing remaining actually connects (drops spurs / same-name
    // but disconnected trails instead of jumping to them).
    if (best && best.d <= JOIN_THRESHOLD_M) {
      const [s] = remaining.splice(best.i, 1)
      const seg = best.rev ? s.slice().reverse() : s.slice()
      const joinGap =
        best.where === 'tail'
          ? haversine(chain[chain.length - 1], seg[0])
          : haversine(chain[0], seg[seg.length - 1])
      // Drop the shared joint node when the segments meet (OSM ways share nodes).
      if (best.where === 'tail') {
        chain = chain.concat(joinGap < 5 ? seg.slice(1) : seg)
      } else {
        chain = (joinGap < 5 ? seg.slice(0, -1) : seg).concat(chain)
      }
      progress = true
    }
  }
  return chain
}

// Reuse the canonical name mappings from the existing matcher (don't duplicate).
const matcherSrc = fs.readFileSync(path.join(__dirname, 'match-osm-trails.js'), 'utf8')
const mapMatch = matcherSrc.match(/const manualMappings = (\{[\s\S]*?\n\});/)
const manualMappings = eval('(' + mapMatch[1] + ')')

const osmData = JSON.parse(fs.readFileSync(OSM, 'utf8'))
const trails = JSON.parse(fs.readFileSync(TRAILS, 'utf8'))

const osmByName = {}
for (const el of osmData.elements) {
  if (el.tags?.name && el.geometry?.length > 1) {
    ;(osmByName[el.tags.name] ??= []).push(
      el.geometry.map((p) => ({ lat: p.lat, lng: p.lon }))
    )
  }
}

function matchedSegments(trail) {
  const mapping = manualMappings[trail.id]
  const names = Array.isArray(mapping) ? mapping : mapping ? [mapping] : []
  let segs = []
  for (const n of names) if (osmByName[n]) segs.push(...osmByName[n])
  if (segs.length === 0) {
    // normalized fallback, same as the original matcher
    const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
    const nt = norm(trail.name)
    for (const [osmName, data] of Object.entries(osmByName)) {
      const no = norm(osmName)
      if (no === nt || no.includes(nt) || nt.includes(no)) {
        segs.push(...data)
        break
      }
    }
  }
  return segs
}

const updates = []
const skipped = []

for (const trail of trails) {
  const segs = matchedSegments(trail)
  if (segs.length < 1) continue
  const joined = chainSegments(segs)
  const cur = trail.coordinates.length
  const gap = Math.round(maxGapMeters(joined))
  const lenMi = lineLengthMeters(joined) / 1609.34
  const ratio = trail.distance ? lenMi / trail.distance : 1

  const better = joined.length > cur
  const sane = gap <= MAX_GAP_M && ratio >= MIN_LEN_RATIO && ratio <= MAX_LEN_RATIO

  if (better && sane) {
    updates.push({ trail, joined, cur, gap, ratio })
  } else if (better && !sane) {
    skipped.push({ name: trail.name, reason: `gap ${gap}m, lenRatio ${ratio.toFixed(2)}`, cur, would: joined.length })
  }
}

// Second pass: repair trails whose points are present but out of order
// (large internal gaps), e.g. concatenated GPX recordings. Only trails not
// already replaced by OSM geometry this run.
const reorders = []
const osmUpdatedIds = new Set(updates.map((u) => u.trail.id))
for (const trail of trails) {
  if (osmUpdatedIds.has(trail.id)) continue
  const cur = trail.coordinates
  if (cur.length < 4) continue
  const curGap = Math.round(maxGapMeters(cur))
  if (curGap <= 300) continue
  let west = 0
  let east = 0
  cur.forEach((c, i) => {
    if (c.lng < cur[west].lng) west = i
    if (c.lng > cur[east].lng) east = i
  })
  const candidates = [
    nearestNeighbourOrder(cur, west),
    nearestNeighbourOrder(cur, east),
  ]
  const best = candidates.reduce((a, b) =>
    maxGapMeters(a) < maxGapMeters(b) ? a : b
  )
  const newGap = Math.round(maxGapMeters(best))
  if (newGap < 150 && newGap < curGap) {
    reorders.push({ trail, reordered: best, curGap, newGap })
  }
}

console.log(`\n${write ? 'WRITING' : 'DRY RUN'} - ${updates.length} trail(s) to re-densify:\n`)
for (const u of updates) {
  console.log(
    `  ↑ ${u.trail.name}: ${u.cur} → ${u.joined.length} pts  (maxGap ${u.gap}m, len ${(u.ratio * u.trail.distance).toFixed(2)}/${u.trail.distance}mi)`
  )
}
if (skipped.length) {
  console.log(`\n  Skipped (more OSM points but failed sanity):`)
  for (const s of skipped) console.log(`    - ${s.name}: ${s.cur} → ${s.would}? ${s.reason}`)
}

if (reorders.length) {
  console.log(`\n${reorders.length} trail(s) to reorder (scrambled points):`)
  for (const r of reorders) {
    console.log(`  ⤳ ${r.trail.name}: maxGap ${r.curGap}m → ${r.newGap}m (${r.reordered.length} pts)`)
  }
}

if (write && (updates.length || reorders.length)) {
  const reorderById = new Map(reorders.map((r) => [r.trail.id, r]))
  const out = trails.map((t) => {
    const u = updates.find((x) => x.trail.id === t.id)
    if (u) {
      // OSM geometry has no elevation; strip and re-enrich afterwards.
      return {
        ...t,
        coordinates: u.joined.map((p) => ({ lat: p.lat, lng: p.lng })),
        trailhead: { lat: u.joined[0].lat, lng: u.joined[0].lng },
      }
    }
    const r = reorderById.get(t.id)
    if (r) {
      // Reorder keeps per-point elevation; recompute summary stats in place.
      const stats = elevationStats(r.reordered)
      return {
        ...t,
        coordinates: r.reordered,
        trailhead: { lat: r.reordered[0].lat, lng: r.reordered[0].lng },
        ...(stats ?? {}),
      }
    }
    return t
  })
  fs.writeFileSync(TRAILS, JSON.stringify(out, null, 2))
  console.log(`\nWrote ${TRAILS}`)
  const enrichIds = updates.map((u) => u.trail.id)
  if (enrichIds.length) {
    console.log(`Re-enrich elevation (OSM-updated only):\n  node scripts/enrich-updated-trails.cjs ${enrichIds.join(' ')}`)
  }
}
