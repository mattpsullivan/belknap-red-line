import type { Coordinate } from '@/types'

interface ElevationProfileProps {
  coordinates: Coordinate[]
  height?: number
}

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  // Haversine formula for distance in miles
  const R = 3959 // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function formatNumber(num: number): string {
  return num.toLocaleString()
}

export function ElevationProfile({
  coordinates,
  height = 120,
}: ElevationProfileProps) {
  // Filter coordinates with elevation data
  const elevationPoints = coordinates.filter(
    (c): c is Coordinate & { elevation: number } => c.elevation !== undefined
  )

  // Handle empty or insufficient data
  if (elevationPoints.length === 0) {
    return (
      <div className="bg-surface rounded-xl p-4 text-center text-secondary">
        No elevation data available
      </div>
    )
  }

  // Calculate cumulative distances and elevation stats
  const points: { distance: number; elevation: number }[] = []
  let cumulativeDistance = 0
  let elevationGain = 0
  let elevationLoss = 0

  for (let i = 0; i < elevationPoints.length; i++) {
    if (i > 0) {
      const prev = elevationPoints[i - 1]
      const curr = elevationPoints[i]
      cumulativeDistance += calculateDistance(
        prev.lat,
        prev.lng,
        curr.lat,
        curr.lng
      )

      const elevDiff = curr.elevation - prev.elevation
      if (elevDiff > 0) {
        elevationGain += elevDiff
      } else {
        elevationLoss += Math.abs(elevDiff)
      }
    }

    points.push({
      distance: cumulativeDistance,
      elevation: elevationPoints[i].elevation,
    })
  }

  // Calculate min/max for scaling
  const elevations = points.map((p) => p.elevation)
  const minElev = Math.min(...elevations)
  const maxElev = Math.max(...elevations)
  const elevRange = maxElev - minElev || 1 // Avoid division by zero
  const totalDistance = cumulativeDistance || 1

  // SVG dimensions with padding
  const width = 100 // percentage
  const padding = { top: 10, right: 10, bottom: 20, left: 10 }
  const chartWidth = 300 // base width for path calculations
  const chartHeight = height - padding.top - padding.bottom

  // Scale functions
  const scaleX = (d: number): number =>
    padding.left + (d / totalDistance) * (chartWidth - padding.left - padding.right)
  const scaleY = (e: number): number =>
    padding.top +
    chartHeight -
    ((e - minElev) / elevRange) * chartHeight

  // Generate SVG path
  const pathData = points
    .map((p, i) => {
      const x = scaleX(p.distance)
      const y = scaleY(p.elevation)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  // Area path (for gradient fill)
  const areaData =
    pathData +
    ` L ${scaleX(totalDistance)} ${padding.top + chartHeight}` +
    ` L ${scaleX(0)} ${padding.top + chartHeight} Z`

  return (
    <div className="bg-surface rounded-xl p-4">
      {/* Stats row */}
      <div className="flex justify-between text-sm mb-3">
        <div className="text-secondary">
          <span className="text-primary font-medium">
            {formatNumber(minElev)} ft
          </span>{' '}
          min
        </div>
        <div className="flex gap-3">
          <span className="text-green-600">+{formatNumber(Math.round(elevationGain))} ft</span>
          <span className="text-red-500">-{formatNumber(Math.round(elevationLoss))} ft</span>
        </div>
        <div className="text-secondary">
          <span className="text-primary font-medium">
            {formatNumber(maxElev)} ft
          </span>{' '}
          max
        </div>
      </div>

      {/* SVG Chart */}
      <svg
        width={`${width}%`}
        height={height}
        viewBox={`0 0 ${chartWidth} ${height}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id="elevationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path d={areaData} fill="url(#elevationGradient)" />

        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke="#22C55E"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Min/Max markers */}
        {points.length > 1 && (
          <>
            {/* Min point */}
            <circle
              cx={scaleX(points.find((p) => p.elevation === minElev)!.distance)}
              cy={scaleY(minElev)}
              r="4"
              fill="#EF4444"
              stroke="white"
              strokeWidth="2"
            />
            {/* Max point */}
            <circle
              cx={scaleX(points.find((p) => p.elevation === maxElev)!.distance)}
              cy={scaleY(maxElev)}
              r="4"
              fill="#22C55E"
              stroke="white"
              strokeWidth="2"
            />
          </>
        )}
      </svg>

      {/* Distance axis */}
      <div className="flex justify-between text-xs text-secondary mt-1">
        <span>0 mi</span>
        <span>{cumulativeDistance.toFixed(1)} mi</span>
      </div>
    </div>
  )
}
