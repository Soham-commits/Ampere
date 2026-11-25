import { BatteryCharging, ChevronDown, Clock3, Flag, Navigation, TriangleAlert, Zap } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../../app/hooks'
import { useMyVehicle } from '../../app/useMyVehicle'
import { Page, PageHeader } from '../../components/Shell'
import { Card, Notice, Range } from '../../components/ui'
import { modelById, readDb } from '../../server/db'
import { useDemoState } from '../shared/useDemoState'
import { CHARGE_CAP, planTrip, STOP_RESERVE } from './planner'
import { POLICY } from '../../domain/policy'
import { AskAmpere } from './AskAmpere'
import { TripMap, type TripMapPoint } from './TripMap'
import { compareRoutes, googleMapsTripSections, tripWaypoints, TRIP_ROUTES } from './routes'

const HIGHWAY_PRESETS = {
  highway: { label: 'Conservative highway', multiplier: 1 },
  higher: { label: 'Higher consumption (+20%)', multiplier: 1.2 },
} as const
type HighwayPreset = keyof typeof HIGHWAY_PRESETS
type RouteKind = 'fastest' | 'reliable'
const routeLabels = { fastest: 'Fastest', reliable: 'EV-reliable' }

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return hours ? `${hours} h${remainder ? ` ${remainder} min` : ''}` : `${minutes} min`
}

export default function TripPlanner() {
  const user = useSession()!
  const currentVehicle = useMyVehicle()
  const vehicle = currentVehicle ?? readDb().vehicles.find((item) => item.owner_id === user.id)
  const model = vehicle ? modelById(vehicle.model_id) : undefined
  const [routeId, setRouteId] = useDemoState(user.id, 'trip-route', TRIP_ROUTES[0].id)
  const [saved, setSaved] = useDemoState<{ routeId: string; soc: number; kind?: RouteKind; arrival?: number; preset?: HighwayPreset } | null>(user.id, 'saved-trip', null)
  const [soc, setSoc] = useState(saved?.routeId === routeId ? saved.soc : (vehicle?.soc ?? 40))
  const [kind, setKind] = useState<RouteKind>(saved?.routeId === routeId ? (saved.kind ?? 'fastest') : 'fastest')
  const [arrival, setArrival] = useState(saved?.routeId === routeId ? (saved.arrival ?? STOP_RESERVE) : STOP_RESERVE)
  const [preset, setPreset] = useState<HighwayPreset>(saved?.routeId === routeId ? (saved.preset ?? 'highway') : 'highway')
  const trip = TRIP_ROUTES.find((r) => r.id === routeId) ?? TRIP_ROUTES[0]
  const options = useMemo(() => compareRoutes(trip), [trip])
  const route = options[kind]
  const separateAlternative = options.fastest.id !== options.reliable.id
  const compatible = !!model?.connectors.some((c) => c.standard === 'CCS2' && c.mode === 'DC')
  const planningSoc = useDeferredValue(soc)
  const planningArrival = useDeferredValue(arrival)
  const plans = useMemo(() => {
    if (!model || !compatible) return { fastest: null, reliable: null }
    const consumption = model.consumption_kwh_per_km * POLICY.uncertainty * HIGHWAY_PRESETS[preset].multiplier
    const calculate = (candidate: typeof route) => planTrip(candidate.distanceKm, model.usable_battery_wh / 1000, consumption, planningSoc, candidate.chargers, model.dc_limit_kw, planningArrival)
    return { fastest: calculate(options.fastest), reliable: calculate(options.reliable) }
  }, [model, compatible, options, preset, planningSoc, planningArrival])
  const plan = plans[kind]
  const planned = useMemo(() => (plan?.stops ?? []).flatMap((stop, index) => {
    const charger = route.chargers.find((candidate) => candidate.id === stop.id)
    return charger ? [{ ...stop, position: charger.position, order: index + 1 }] : []
  }), [plan, route])
  const stopIds = planned.map((stop) => stop.id).join('|')
  const geometry = useMemo(() => [trip.origin, ...tripWaypoints(route, new Set(stopIds.split('|'))), trip.destination], [trip, route, stopIds])
  const directions = googleMapsTripSections(geometry)
  const mapPoints = useMemo<TripMapPoint[]>(() => [
    { ...trip.origin, kind: 'start' },
    ...planned.map((stop) => ({
      ...stop.position, label: stop.name, kind: 'stop' as const, order: stop.order,
      detail: ['Approximate demo stop', `CCS2 DC · ${stop.powerKw} kW`, `~${stop.minutes} min charging`],
    })),
    { ...trip.destination, kind: 'end' },
  ], [trip, planned])
  const chargingMinutes = planned.reduce((sum, stop) => sum + stop.minutes, 0)
  const isSaved = saved?.routeId === trip.id && saved.soc === soc && (saved.kind ?? 'fastest') === kind && (saved.arrival ?? STOP_RESERVE) === arrival && (saved.preset ?? 'highway') === preset

  return (
    <>
      <PageHeader back title="Trip planner" />
      <Page className="mx-auto max-w-3xl">
        <AskAmpere departureSoc={soc} arrivalSoc={arrival} onApply={(request) => {
          setRouteId(request.routeId)
          setKind('fastest')
          setSoc(request.departureSoc)
          setArrival(request.arrivalSoc)
        }} />
        <Card className="border border-line !rounded-[2rem] !p-4">
          <label className="block text-sm font-medium">
            Trip
            <select
              value={trip.id}
              onChange={(event) => {
                const next = event.target.value
                setRouteId(next)
                setKind(saved?.routeId === next ? (saved.kind ?? 'fastest') : 'fastest')
                setSoc(saved?.routeId === next ? saved.soc : (vehicle?.soc ?? 40))
                setArrival(saved?.routeId === next ? (saved.arrival ?? STOP_RESERVE) : STOP_RESERVE)
                setPreset(saved?.routeId === next ? (saved.preset ?? 'highway') : 'highway')
              }}
              className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface-2 px-4"
            >
              {TRIP_ROUTES.map((item) => (
                <option key={item.id} value={item.id}>{item.origin.label} → {item.destination.label}</option>
              ))}
            </select>
          </label>
          {model ? (
            <>
              <div className="mb-1 mt-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm"><BatteryCharging className="size-4 text-volt" /> Departure battery</span>
                <strong className="text-xl text-volt">{soc}%</strong>
              </div>
              <Range label="Departure battery percentage" value={soc} min={0} max={100} onChange={setSoc} />
              <p className="mt-2 text-xs text-muted">{model.make} {model.model} · {(model.usable_battery_wh / 1000).toFixed(0)} kWh</p>
              {['vm-nexon-ev-demo', 'vm-xuv400-demo'].includes(model.id) && (
                <Link to="/vehicle" className="mt-1 inline-block text-xs font-medium text-volt">Demo profile · confirm your battery variant</Link>
              )}
              <details className="group mt-3 border-t border-line pt-2">
                <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  <span>Range settings <span className="font-normal text-muted">· {arrival}% arrival</span></span>
                  <ChevronDown className="size-4 text-muted group-open:rotate-180" aria-hidden="true" />
                </summary>
                <Range label="Minimum arrival battery percentage" value={arrival} min={STOP_RESERVE} max={100} onChange={setArrival} />
                <label className="mt-2 block text-sm">
                  Driving conditions
                  <select value={preset} onChange={(event) => setPreset(event.target.value === 'higher' ? 'higher' : 'highway')} className="mt-1 block min-h-10 w-full rounded-xl border border-line bg-surface-2 px-3">
                    {Object.entries(HIGHWAY_PRESETS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
                  </select>
                </label>
                <p className="mt-2 text-xs text-muted">Demo assumptions · {STOP_RESERVE}% stop reserve · {CHARGE_CAP}% charging cap</p>
              </details>
            </>
          ) : (
            <Link to="/vehicle" className="mt-4 inline-block text-sm font-semibold text-volt">Add a vehicle for battery estimates →</Link>
          )}
        </Card>

        <section className="mt-5" aria-labelledby="compare-routes">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 id="compare-routes" className="text-lg font-semibold">Compare routes</h2>
            <span className="text-xs text-muted">Demo estimates</span>
          </div>
          <div className="grid grid-cols-2 gap-3" role="group" aria-label="Route shown on map">
            {(['fastest', 'reliable'] as const).map((choice) => {
              const candidate = options[choice]
              const unavailable = choice === 'reliable' && !separateAlternative
              return (
                <button key={choice} type="button" disabled={unavailable} aria-pressed={kind === choice && !unavailable}
                  onClick={() => setKind(choice)}
                  className={`rounded-2xl border p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt sm:p-4 ${kind === choice && !unavailable ? 'border-volt bg-volt-soft' : 'border-line bg-surface-2'}`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold">{choice === 'fastest' ? <Clock3 className="size-4 shrink-0" /> : <Zap className="size-4 shrink-0" />}{routeLabels[choice]}</span>
                  {unavailable ? <span className="mt-2 block text-xs text-muted">No alternate corridor improves coverage.</span> : (
                    <>
                      <span className="mt-2 block text-lg font-semibold">{formatDuration(candidate.driveMinutes)}</span>
                      <span className="block text-xs text-muted">{candidate.distanceKm.toLocaleString('en-IN')} km · {candidate.chargers.length} chargers</span>
                      <span className="mt-2 block text-xs">{candidate.longestGapKm} km max gap</span>
                      {plans[choice] && <span className="mt-1 block text-xs font-medium text-volt">{plans[choice].arrivalSoc === null ? 'Battery target unmet' : `~${Math.floor(plans[choice].arrivalSoc)}% on arrival`}</span>}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        <div className="mt-4 overflow-hidden rounded-3xl border border-line">
          <TripMap points={mapPoints} geometry={geometry} reliable={kind === 'reliable' && separateAlternative}
            className="h-64 sm:h-96" />
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line px-4 py-2.5 text-xs text-muted">
            <span>{routeLabels[kind]} route</span>
            <span>{planned.length} charging {planned.length === 1 ? 'stop' : 'stops'}{chargingMinutes > 0 && ` · ${formatDuration(chargingMinutes)} charging`}</span>
          </div>
        </div>

        {route.gaps.length > 0 && (
          <ul aria-label="Charging coverage gaps" className="mt-3 space-y-1.5">
            {route.gaps.map((gap) => (
              <li key={`${gap.from}-${gap.to}`} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                <TriangleAlert className="size-4 shrink-0 text-amber" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">Limited charging</p>
                  <p className="text-xs text-muted">{gap.from} → {gap.to}</p>
                </div>
                <strong className="shrink-0 text-sm tabular-nums">{gap.km} km</strong>
              </li>
            ))}
          </ul>
        )}
        {model && !compatible && <p className="mt-3 text-sm text-amber">Sample chargers require CCS2.</p>}
        {plan?.problem && <div className="mt-3"><Notice tone="amber">{plan.problem}</Notice></div>}

        <div className="mt-3 space-y-2" aria-label="Google Maps route preview">
          {directions.length > 1 && <h2 className="text-sm font-semibold">Google Maps preview · {directions.length} parts</h2>}
          {directions.map((section, index) => (
            <a key={section.url} href={section.url} target="_blank" rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-2 rounded-2xl bg-volt px-4 py-2 text-sm font-semibold !text-white">
              <Navigation className="size-4 shrink-0" aria-hidden="true" />
              {directions.length === 1 ? 'Preview route in Google Maps' : `${index + 1}. ${section.from} → ${section.to}`}
            </a>
          ))}
          <p className="text-xs text-muted">Demo pins mark approximate stops. Check the actual charger address before driving.</p>
        </div>

        <section className="mt-5" aria-labelledby="route-stops">
          <h2 id="route-stops" className="mb-2 text-lg font-semibold">Itinerary</h2>
          <ol className="space-y-1.5">
            <li className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line text-xs font-semibold">A</span>
              <span className="flex-1 text-sm font-semibold">{trip.origin.label}</span>
              {model && <span className="text-xs text-muted">{soc}% at departure</span>}
            </li>
            {planned.map((stop, index) => (
              <li key={stop.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-volt-soft text-xs font-semibold text-volt">{stop.order}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{stop.name}</p>
                  <p className="text-xs text-muted">{stop.km - (planned[index - 1]?.km ?? 0)} km from previous stop</p>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <p className="font-semibold text-volt">{Math.floor(stop.arrivalSoc)}% → {Math.round(stop.departureSoc)}%</p>
                  <p className="text-muted">{stop.minutes} min</p>
                </div>
              </li>
            ))}
            <li className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line"><Flag className="size-3.5" aria-hidden="true" /></span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{trip.destination.label}</p>
                <p className="text-xs text-muted">{route.distanceKm - (planned.at(-1)?.km ?? 0)} km from previous stop</p>
              </div>
              {plan?.arrivalSoc != null && <span className="text-xs font-semibold text-volt">~{Math.floor(plan.arrivalSoc)}% on arrival</span>}
            </li>
          </ol>
        </section>

        <details className="group mt-3 rounded-xl border border-line px-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            <span>Charger coverage <span className="font-normal text-muted">({route.chargers.length})</span></span>
            <ChevronDown className="size-4 shrink-0 text-muted group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="pb-2 text-xs text-muted">Sample CCS2 locations. Availability is unverified.</p>
          <ul className="divide-y divide-line">
            {route.chargers.map((charger, index) => (
              <li key={charger.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span>{charger.name}</span>
                <span className="text-right text-xs text-muted">{route.legs[index].km} km from {route.legs[index].from} · {charger.powerKw} kW</span>
              </li>
            ))}
          </ul>
        </details>
        {plan && !plan.problem && (
          <button type="button" onClick={() => setSaved({ routeId: trip.id, soc, kind, arrival, preset })}
            className="mt-5 min-h-12 w-full rounded-full bg-volt px-5 font-semibold text-white">
            {isSaved ? 'Plan saved on this device' : 'Save this plan'}
          </button>
        )}
      </Page>
    </>
  )
}
