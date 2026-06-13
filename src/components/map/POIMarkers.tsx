import { useState } from 'react'
import { Marker, Popup } from 'react-map-gl/maplibre'
import { getPlacedPois } from '@/data/pois'
import type { PointOfInterest } from '@/types/poi'

/**
 * Renders historical points of interest from the Belknap Range Trails map as
 * tappable markers. Only POIs with a real coordinate are drawn; grid-cell-only
 * features are intentionally omitted until georeferenced (see types/poi.ts).
 */
export function POIMarkers() {
  const [selected, setSelected] = useState<PointOfInterest | null>(null)
  const placed = getPlacedPois()

  return (
    <>
      {placed.map((poi) => (
        <Marker
          key={poi.id}
          latitude={poi.coordinates!.lat}
          longitude={poi.coordinates!.lng}
          anchor="center"
          onClick={(e) => {
            // Keep the map's own click handlers from firing underneath.
            e.originalEvent.stopPropagation()
            setSelected(poi)
          }}
        >
          <div
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-amber-700 text-[10px] font-bold text-white shadow-lg"
            title={poi.name}
            aria-label={`Historical site: ${poi.name}`}
          >
            {poi.code}
          </div>
        </Marker>
      ))}

      {selected && (
        <Popup
          latitude={selected.coordinates!.lat}
          longitude={selected.coordinates!.lng}
          anchor="bottom"
          onClose={() => setSelected(null)}
          closeOnClick={false}
        >
          <div className="min-w-[180px] p-1">
            <h3 className="text-sm font-semibold text-primary">
              {selected.name}
            </h3>
            <p className="mt-1 text-xs text-secondary">{selected.description}</p>
            <p className="mt-2 text-[10px] uppercase tracking-wide text-secondary">
              Map grid {selected.gridCell}
            </p>
          </div>
        </Popup>
      )}
    </>
  )
}
