import { TrailMap } from '@/components/map'

export function MapPage() {
  // Height: 100vh - header (56px) - nav (64px) = calc(100vh - 120px)
  return (
    <div className="w-full" style={{ height: 'calc(100vh - 120px)' }}>
      <TrailMap />
    </div>
  )
}
