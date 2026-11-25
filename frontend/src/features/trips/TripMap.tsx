import L from 'leaflet'
import { memo, useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { Coord } from './routes'

export interface TripMapPoint extends Coord {
  label: string
  kind: 'start' | 'stop' | 'end'
  order?: number
  detail?: string[]
}

const BOLT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>'

function pointIcon(p: TripMapPoint) {
  const inner = p.kind === 'stop' ? `${BOLT}<b style="margin-left:2px;font-size:12px">${p.order}</b>` : p.kind === 'start' ? 'A' : 'B'
  return L.divIcon({ className: '', html: `<div style="width:32px;height:32px" class="amp-pin ${p.kind === 'stop' ? '' : 'is-directory'}">${inner}</div>`, iconSize: [32, 32], iconAnchor: [16, 16] })
}

function FitRoute({ points }: { points: Coord[] }) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), { padding: [26, 26], maxZoom: 12, animate: false })
  }, [map, points])
  return null
}

/** Road geometry from the public OSRM demo server; falls back to straight legs when it is unreachable. */
function useRoadLine(points: Coord[]) {
  const key = points.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(';')
  const [line, setLine] = useState<{ key: string; coords: [number, number][] } | null>(null)
  useEffect(() => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    fetch(`https://router.project-osrm.org/route/v1/driving/${key}?overview=full&geometries=geojson`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j: { code: string; routes?: { geometry: { coordinates: [number, number][] } }[] }) => {
        if (!ctrl.signal.aborted && j.code === 'Ok' && j.routes?.[0]) {
          setLine({ key, coords: j.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]) })
        }
      })
      .catch(() => undefined)
      .finally(() => clearTimeout(timer))
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [key])
  return line?.key === key ? line.coords : null
}

export const TripMap = memo(function TripMap({
  points,
  geometry,
  reliable,
  className,
}: {
  points: TripMapPoint[]
  geometry: Coord[]
  reliable: boolean
  className?: string
}) {
  const road = useRoadLine(geometry)
  const straight = useMemo(() => geometry.map((p) => [p.lat, p.lng] as [number, number]), [geometry])
  return (
    <div className={className}>
      <MapContainer center={[points[0].lat, points[0].lng]} zoom={9} zoomSnap={0.25} zoomControl={false} className="h-full w-full" style={{ background: '#eef2f7' }}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' maxZoom={19} />
        <FitRoute points={geometry} />
        <Polyline positions={road ?? straight} pathOptions={{ color: reliable ? '#087e61' : '#3560cf', weight: 5, opacity: 0.85, dashArray: road ? undefined : '8 10' }} />
        {points.map((p) => (
          <Marker key={`${p.kind}-${p.label}`} position={[p.lat, p.lng]} icon={pointIcon(p)} title={p.label} alt={p.label} zIndexOffset={p.kind === 'stop' ? 100 : 0}>
            <Tooltip className="amp-tip" direction="top" offset={[0, -14]}>
              {p.label}
            </Tooltip>
            {p.detail ? (
              <Popup minWidth={200}>
                <div className="space-y-1 text-[13px]">
                  <div className="text-sm font-semibold text-[#102455]">{p.label}</div>
                  {p.detail.map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>
              </Popup>
            ) : null}
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
})
