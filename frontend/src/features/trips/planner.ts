import { energyAboveReserve } from '../../domain/calc'

export interface RouteCharger {
  id: string
  name: string
  km: number
  powerKw: number
}
export interface TripStop extends RouteCharger {
  arrivalSoc: number
  departureSoc: number
  chargeKwh: number
  minutes: number
}
export interface TripPlan {
  stops: TripStop[]
  arrivalSoc: number | null
  problem: string | null
}

export const STOP_RESERVE = 10
export const CHARGE_CAP = 80
const EPSILON = 1e-8

/** Finds a feasible itinerary with the fewest stops, then charges only as much as each next leg needs. */
export function planTrip(
  distanceKm: number,
  batteryKwh: number,
  consumption: number,
  initialSoc: number,
  chargers: RouteCharger[],
  vehiclePowerKw: number,
  minimumArrivalSoc = STOP_RESERVE,
): TripPlan {
  if (
    ![distanceKm, batteryKwh, consumption, initialSoc, vehiclePowerKw, minimumArrivalSoc].every(Number.isFinite) ||
    distanceKm <= 0 || batteryKwh <= 0 || consumption <= 0 || vehiclePowerKw <= 0 ||
    initialSoc < 0 || initialSoc > 100 || minimumArrivalSoc < 0 || minimumArrivalSoc > 100
  ) return { stops: [], arrivalSoc: null, problem: 'Enter valid battery and vehicle values.' }

  const arrivalTarget = Math.max(STOP_RESERVE, minimumArrivalSoc)
  const candidates = chargers
    .filter((c) => Number.isFinite(c.km) && c.km > 0 && c.km < distanceKm && Number.isFinite(c.powerKw) && c.powerKw > 0)
    .sort((a, b) => a.km - b.km)
  const reachable = (from: number, to: number, soc: number, reserve: number) =>
    (to - from) * consumption <= energyAboveReserve(batteryKwh, soc, reserve) + EPSILON
  const remainingStops = candidates.map(() => Infinity)
  for (let i = candidates.length - 1; i >= 0; i--) {
    const { km } = candidates[i]
    if (reachable(km, distanceKm, CHARGE_CAP, arrivalTarget)) remainingStops[i] = 0
    for (let j = i + 1; j < candidates.length; j++) {
      if (candidates[j].km > km && reachable(km, candidates[j].km, CHARGE_CAP, STOP_RESERVE))
        remainingStops[i] = Math.min(remainingStops[i], 1 + remainingStops[j])
    }
  }

  const itinerary: RouteCharger[] = []
  let position = 0
  let soc = initialSoc
  while (!reachable(position, distanceKm, soc, arrivalTarget)) {
    let chosen = -1
    for (let i = 0; i < candidates.length; i++) {
      const { km } = candidates[i]
      if (km > position && reachable(position, km, soc, STOP_RESERVE) &&
          (chosen === -1 || remainingStops[i] <= remainingStops[chosen])) chosen = i
    }
    if (chosen === -1) break
    itinerary.push(candidates[chosen])
    position = candidates[chosen].km
    soc = CHARGE_CAP
  }

  const complete = reachable(position, distanceKm, soc, arrivalTarget)
  const stops: TripStop[] = []
  let previousKm = 0
  let departureSoc = initialSoc
  for (const [index, stop] of itinerary.entries()) {
    const arrivalSoc = departureSoc - (stop.km - previousKm) * consumption * 100 / batteryKwh
    const next = itinerary[index + 1]
    const requiredSoc = next || complete
      ? (next ? STOP_RESERVE : arrivalTarget) + ((next?.km ?? distanceKm) - stop.km) * consumption * 100 / batteryKwh
      : arrivalSoc
    departureSoc = Math.max(arrivalSoc, Math.min(CHARGE_CAP, requiredSoc))
    const chargeKwh = energyAboveReserve(batteryKwh, departureSoc, arrivalSoc)
    stops.push({ ...stop, arrivalSoc, departureSoc, chargeKwh, minutes: Math.ceil(Math.max(0, chargeKwh * 60 / (Math.min(stop.powerKw, vehiclePowerKw) * 0.9) - EPSILON)) })
    previousKm = stop.km
  }

  if (!complete) return {
    stops,
    arrivalSoc: null,
    problem: itinerary.length
      ? `No feasible next leg from ${itinerary.at(-1)!.name} with a ${STOP_RESERVE}% stop reserve and ${arrivalTarget}% destination target.`
      : `Charge before departure or choose another route: the first stop or destination is outside your battery budget.`,
  }
  const arrivalSoc = departureSoc - (distanceKm - previousKm) * consumption * 100 / batteryKwh
  return { stops, arrivalSoc: Math.max(arrivalTarget, arrivalSoc), problem: null }
}
