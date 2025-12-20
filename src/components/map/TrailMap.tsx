import { useMemo } from 'react'
import Map, { Source, Layer } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useTrails, useCompletions } from '@/hooks'
import type { Trail } from '@/types'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

// Center of Belknap Range
const INITIAL_VIEW = {
  latitude: 43.52,
  longitude: -71.43,
  zoom: 11,
}

export function TrailMap() {
  const { trails } = useTrails()
  const { isTrailCompleted } = useCompletions()

  // Convert trails to GeoJSON for MapLibre
  const trailsGeoJSON = useMemo(() => {
    const features = trails.map((trail) => ({
      type: 'Feature' as const,
      properties: {
        id: trail.id,
        name: trail.name,
        completed: isTrailCompleted(trail.id),
        distance: trail.distance,
        difficulty: trail.difficulty,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: trail.coordinates.map((c) => [c.lng, c.lat]),
      },
    }))

    return {
      type: 'FeatureCollection' as const,
      features,
    }
  }, [trails, isTrailCompleted])

  // Separate completed and incomplete trails for styling
  const completedTrails = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: trailsGeoJSON.features.filter((f) => f.properties.completed),
    }),
    [trailsGeoJSON]
  )

  const incompleteTrails = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: trailsGeoJSON.features.filter((f) => !f.properties.completed),
    }),
    [trailsGeoJSON]
  )

  return (
    <Map
      initialViewState={INITIAL_VIEW}
      style={{ width: '100%', height: '100%' }}
      mapStyle={MAP_STYLE}
    >
      {/* Incomplete trails (red) */}
      <Source id="incomplete-trails" type="geojson" data={incompleteTrails}>
        <Layer
          id="incomplete-trails-layer"
          type="line"
          paint={{
            'line-color': '#EF4444',
            'line-width': 4,
            'line-opacity': 0.8,
          }}
        />
      </Source>

      {/* Completed trails (green) */}
      <Source id="completed-trails" type="geojson" data={completedTrails}>
        <Layer
          id="completed-trails-layer"
          type="line"
          paint={{
            'line-color': '#22C55E',
            'line-width': 4,
            'line-opacity': 0.8,
          }}
        />
      </Source>
    </Map>
  )
}

// Trailhead markers component (for later use)
export function TrailheadMarkers({ trails }: { trails: Trail[] }) {
  const markersGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: trails.map((trail) => ({
        type: 'Feature' as const,
        properties: {
          id: trail.id,
          name: trail.name,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [trail.trailhead.lng, trail.trailhead.lat],
        },
      })),
    }),
    [trails]
  )

  return (
    <Source id="trailheads" type="geojson" data={markersGeoJSON}>
      <Layer
        id="trailheads-layer"
        type="circle"
        paint={{
          'circle-radius': 6,
          'circle-color': '#3B82F6',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        }}
      />
    </Source>
  )
}
