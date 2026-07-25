/** Great-circle helpers for the build-time scripts. Metres throughout. */

const R = 6371000

/** Haversine distance in metres between two {lat,lng} points. */
export function distance(a, b) {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lng - a.lng) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Total polyline length in metres. */
export function pathLength(points) {
  let total = 0
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i])
  return total
}

export const METERS_PER_MILE = 1609.34
