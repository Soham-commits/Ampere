import { describe, expect, it } from 'vitest'
import { compareRoutes, googleMapsTripSections, tripWaypoints, TRIP_ROUTES } from '../src/features/trips/routes'

describe('seeded route comparisons', () => {
  it.each(TRIP_ROUTES)('offers a slower, better-covered alternative for $id', (trip) => {
    const { fastest, reliable } = compareRoutes(trip)
    expect(fastest.id).not.toBe(reliable.id)
    expect(fastest.driveMinutes).toBe(Math.min(...trip.options.map((option) => option.driveMinutes)))
    expect(reliable.driveMinutes).toBeGreaterThan(fastest.driveMinutes)
    expect(reliable.chargers.length).toBeGreaterThan(fastest.chargers.length)
    expect(reliable.longestGapKm).toBeLessThan(fastest.longestGapKm)
    for (const route of [fastest, reliable]) {
      expect(route.legs.every((leg) => leg.km > 0)).toBe(true)
      expect(route.legs.reduce((sum, leg) => sum + leg.km, 0)).toBe(route.distanceKm)
    }
  })

  it('keeps a sparse EV alternative and reports the named gap to the destination', () => {
    const { reliable } = compareRoutes(TRIP_ROUTES.find((trip) => trip.id === 'goa')!)
    expect(reliable.gaps).toContainEqual({ from: 'Belagavi', to: 'Goa (Panaji)', km: 160 })
  })

  it('keeps an entirely unserved corridor with an endpoint-to-endpoint gap', () => {
    const trip = TRIP_ROUTES[0]
    const option = { ...trip.options[0], chargers: [] }
    const { fastest, reliable } = compareRoutes({ ...trip, options: [option] })
    expect(reliable).toBe(fastest)
    expect(fastest.gaps).toEqual([{ from: 'Pune', to: 'Mumbai', km: 155 }])
  })
})

describe('Google Maps handoff', () => {
  it('includes corridor waypoints and every charging stop once, in trip order', () => {
    const trip = TRIP_ROUTES.find((candidate) => candidate.id === 'delhi')!
    const { reliable } = compareRoutes(trip)
    const waypoints = tripWaypoints(reliable, new Set(['tathawade', 'surat', 'vadodara', 'neemrana']))
    expect(waypoints.map((point) => point.label)).toEqual([
      'Tathawade', 'Surat', 'Vadodara', 'Udaipur', 'Jaipur', 'Neemrana',
    ])
    const points = [trip.origin, ...waypoints, trip.destination]
    const sections = googleMapsTripSections(points).map((section) => new URL(section.url).searchParams)
    const coordinates = (point: { lat: number; lng: number }) => `${point.lat},${point.lng}`
    expect(sections).toHaveLength(2)
    expect(sections[0].get('destination')).toBe(sections[1].get('origin'))
    expect(sections.flatMap((section) => {
      const intermediate = section.get('waypoints')?.split('|') ?? []
      expect(intermediate.length).toBeLessThanOrEqual(3)
      return [section.get('origin'), ...intermediate]
    }).concat(sections.at(-1)!.get('destination'))).toEqual(points.map(coordinates))
  })
})
