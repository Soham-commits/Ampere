import { describe, expect, it } from 'vitest'
import { planTrip } from '../src/features/trips/planner'

const chargers = [
  { id: 'a', name: 'First', km: 50, powerKw: 50 },
  { id: 'b', name: 'Second', km: 150, powerKw: 50 },
]
describe('illustrative trip planning', () => {
  it('arrives directly when the reserve permits it', () => {
    const result = planTrip(50, 40, 0.16, 80, chargers, 30)
    expect(result.stops).toHaveLength(0)
    expect(result.arrivalSoc).toBeCloseTo(60)
  })
  it('adds a reachable stop and respects car charging power', () => {
    const result = planTrip(200, 40, 0.16, 40, chargers, 25)
    expect(result.problem).toBeNull()
    expect(result.stops.map((s) => s.id)).toEqual(['a'])
    expect(result.stops[0].arrivalSoc).toBeCloseTo(20)
    expect(result.stops[0].minutes).toBe(54)
    expect(result.arrivalSoc).toBeCloseTo(10)
  })
  it('rejects unreachable first stops and incompatible corridors', () => {
    expect(planTrip(200, 40, 0.16, 4, chargers, 50).problem).toMatch(/before departure/)
    expect(planTrip(200, 40, 0.16, 40, [], 50).problem).toBeTruthy()
  })
  it('reports a gap after a reachable stop rather than pretending the route completes', () => {
    const result = planTrip(400, 40, 0.16, 40, chargers.slice(0, 1), 50)
    expect(result.stops).toHaveLength(1)
    expect(result.arrivalSoc).toBeNull()
    expect(result.problem).toMatch(/next leg/)
  })
  it('enforces the requested destination target while preserving the stop reserve', () => {
    const result = planTrip(200, 40, 0.16, 40, chargers, 25, 30)
    expect(result.problem).toBeNull()
    expect(result.stops[0].arrivalSoc).toBeCloseTo(20)
    expect(result.stops.map((stop) => stop.id)).toEqual(['a', 'b'])
    expect(result.stops[0].departureSoc).toBeCloseTo(50)
    expect(result.arrivalSoc).toBeCloseTo(30)
  })
  it('does not exceed the charge cap to satisfy a high arrival target', () => {
    const result = planTrip(200, 40, 0.16, 40, chargers, 25, 85)
    expect(result.arrivalSoc).toBeNull()
    expect(result.problem).toMatch(/85% destination target/)
    expect(result.stops.every((stop) => stop.departureSoc <= 80)).toBe(true)
  })
  it('adds a stop when higher consumption makes the direct plan infeasible', () => {
    const ordinary = planTrip(150, 40, 0.16, 80, chargers, 25)
    const higher = planTrip(150, 40, 0.192, 80, chargers, 25)
    expect(ordinary.stops).toHaveLength(0)
    expect(higher.stops).toHaveLength(1)
    expect(higher.arrivalSoc).toBeCloseTo(10)
  })
  it('rejects invalid inputs and ignores malformed charger fixtures', () => {
    expect(planTrip(200, 0, 0.16, 40, chargers, 50).problem).toBeTruthy()
    expect(planTrip(200, 40, 0.16, NaN, chargers, 50).problem).toBeTruthy()
    expect(planTrip(200, 40, 0.16, 40, [{ ...chargers[0], powerKw: 0 }], 50).problem).toBeTruthy()
  })
})
