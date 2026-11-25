import type { RouteCharger } from './planner'

export interface Coord {
  lat: number
  lng: number
}

type Place = Coord & { label: string }
type CorridorStop = RouteCharger & { position: Coord }

interface RouteOption {
  id: string
  distanceKm: number
  driveMinutes: number
  chargers: CorridorStop[]
  waypoints: Coord[]
}

interface TripRoute {
  id: string
  origin: Place
  destination: Place
  options: RouteOption[]
}

const pune = { label: 'Pune', lat: 18.5204, lng: 73.8567 }
const mumbai = { label: 'Mumbai', lat: 19.076, lng: 72.8777 }
const delhi = { label: 'Delhi', lat: 28.6139, lng: 77.209 }
const bengaluru = { label: 'Bengaluru', lat: 12.9716, lng: 77.5946 }

// Sample charging locations are corridor markers for the demo, not station entrances.
function charger(id: string, name: string, km: number, lat: number, lng: number, powerKw = 50): CorridorStop {
  return { id, name, km, position: { lat, lng }, powerKw }
}

function option(id: string, distanceKm: number, driveMinutes: number, chargers: CorridorStop[], waypoints: Coord[] = []): RouteOption {
  return { id, distanceKm, driveMinutes, chargers, waypoints }
}

const tathawade = charger('tathawade', 'Tathawade', 22, 18.615, 73.757, 30)
const kamshet = charger('kamshet', 'Kamshet', 48, 18.752, 73.534)
const khalapur = charger('khalapur', 'Khalapur', 88, 18.819, 73.274, 60)
const panvel = charger('panvel', 'Panvel', 122, 18.9894, 73.1175)
const chakan = charger('chakan', 'Chakan', 30, 18.76, 73.863, 30)
const nashikStops = [
  chakan,
  charger('rajgurunagar', 'Rajgurunagar', 55, 18.867, 73.887),
  charger('narayangaon', 'Narayangaon', 90, 19.119, 73.971),
  charger('sangamner', 'Sangamner', 145, 19.567, 74.209, 60),
  charger('sinnar', 'Sinnar', 180, 19.848, 73.998),
]

export const TRIP_ROUTES: TripRoute[] = [
  {
    id: 'mumbai', origin: pune, destination: mumbai,
    options: [
      option('expressway', 155, 160, [tathawade, khalapur]),
      option('lonavala-panvel', 169, 195, [
        tathawade, kamshet, charger('lonavala', 'Lonavala', 68, 18.7546, 73.4062),
        { ...khalapur, km: 101 }, { ...panvel, km: 135 },
      ], [{ lat: 18.7546, lng: 73.4062 }, panvel.position]),
    ],
  },
  {
    id: 'delhi', origin: pune, destination: delhi,
    options: [
      option('dhule-indore', 1440, 1430, [
        charger('dhule', 'Dhule', 345, 20.9042, 74.7749),
        charger('indore', 'Indore', 605, 22.7196, 75.8577),
        charger('kota', 'Kota', 925, 25.2138, 75.8648),
        charger('jaipur', 'Jaipur', 1170, 26.9124, 75.7873),
      ], [{ lat: 22.7196, lng: 75.8577 }, { lat: 25.2138, lng: 75.8648 }]),
      option('surat-udaipur', 1540, 1570, [
        tathawade, { ...panvel, km: 115 },
        charger('vasai', 'Vasai', 185, 19.434, 72.8397),
        charger('vapi', 'Vapi', 285, 20.3893, 72.9106),
        charger('surat', 'Surat', 410, 21.1702, 72.8311),
        charger('vadodara', 'Vadodara', 560, 22.3072, 73.1812),
        charger('ahmedabad', 'Ahmedabad', 670, 23.0225, 72.5714),
        charger('himmatnagar', 'Himmatnagar', 760, 23.5986, 72.963),
        charger('shamlaji', 'Shamlaji', 815, 23.681, 73.386),
        charger('udaipur', 'Udaipur', 940, 24.5854, 73.7125),
        charger('chittorgarh', 'Chittorgarh', 1060, 24.8887, 74.6269),
        charger('bhilwara', 'Bhilwara', 1120, 25.3407, 74.6313),
        charger('ajmer', 'Ajmer', 1255, 26.4499, 74.6399),
        charger('kishangarh', 'Kishangarh', 1285, 26.587, 74.856),
        charger('jaipur', 'Jaipur', 1380, 26.9124, 75.7873),
        charger('neemrana', 'Neemrana', 1470, 27.988, 76.385),
      ], [{ lat: 21.1702, lng: 72.8311 }, { lat: 24.5854, lng: 73.7125 }, { lat: 26.9124, lng: 75.7873 }]),
    ],
  },
  {
    id: 'goa', origin: mumbai, destination: { label: 'Goa (Panaji)', lat: 15.4909, lng: 73.8278 },
    options: [
      option('coastal', 565, 645, [
        { ...panvel, km: 50 },
        charger('chiplun', 'Chiplun', 265, 17.5323, 73.5178),
        charger('kankavli', 'Kankavli', 445, 16.267, 73.712),
      ], [{ lat: 17.5323, lng: 73.5178 }]),
      option('pune-kolhapur', 625, 725, [
        { ...panvel, km: 50 }, { ...khalapur, km: 75 },
        charger('pune-south', 'Pune South', 165, 18.4578, 73.8537),
        charger('satara', 'Satara', 275, 17.6805, 74.0183),
        charger('karad', 'Karad', 325, 17.285, 74.184),
        charger('kolhapur', 'Kolhapur', 395, 16.705, 74.2433),
        charger('belagavi', 'Belagavi', 465, 15.8497, 74.4977),
      ], [{ lat: 18.4578, lng: 73.8537 }, { lat: 15.8497, lng: 74.4977 }]),
    ],
  },
  {
    id: 'chennai', origin: bengaluru, destination: { label: 'Chennai', lat: 13.0827, lng: 80.2707 },
    options: [
      option('krishnagiri', 346, 320, [
        charger('krishnagiri', 'Krishnagiri', 95, 12.5266, 78.2143),
        charger('vellore', 'Vellore', 215, 12.9165, 79.1325),
      ], [{ lat: 12.5266, lng: 78.2143 }]),
      option('kolar-chittoor', 370, 370, [
        charger('kolar', 'Kolar', 70, 13.1362, 78.1291),
        charger('palamaner', 'Palamaner', 150, 13.198, 78.747),
        charger('chittoor', 'Chittoor', 200, 13.2172, 79.1003),
        charger('tiruttani', 'Tiruttani', 275, 13.1759, 79.6165),
        charger('tiruvallur', 'Tiruvallur', 325, 13.1231, 79.912),
      ], [{ lat: 13.1362, lng: 78.1291 }, { lat: 13.2172, lng: 79.1003 }]),
    ],
  },
  {
    id: 'jaipur', origin: delhi, destination: { label: 'Jaipur', lat: 26.9124, lng: 75.7873 },
    options: [
      option('expressway', 285, 280, [
        charger('sohna', 'Sohna', 60, 28.2474, 77.0654),
        charger('dausa', 'Dausa', 225, 26.8932, 76.3375),
      ], [{ lat: 28.2474, lng: 77.0654 }, { lat: 26.8932, lng: 76.3375 }]),
      option('neemrana-nh48', 301, 340, [
        charger('manesar', 'Manesar', 57, 28.3515, 76.942),
        charger('neemrana', 'Neemrana', 128, 27.988, 76.385),
        charger('kotputli', 'Kotputli', 185, 27.702, 76.199),
        charger('shahpura', 'Shahpura', 230, 27.435, 76.048),
      ], [{ lat: 27.988, lng: 76.385 }]),
    ],
  },
  {
    id: 'lonavala', origin: pune, destination: { label: 'Lonavala', lat: 18.7546, lng: 73.4062 },
    options: [
      option('expressway', 65, 75, [tathawade]),
      option('old-highway', 71, 95, [tathawade, kamshet], [kamshet.position]),
    ],
  },
  {
    id: 'nashik', origin: pune, destination: { label: 'Nashik', lat: 19.9975, lng: 73.7898 },
    options: [
      option('nh60', 210, 280, [chakan, nashikStops[3]]),
      option('town-stops', 225, 310, nashikStops, [nashikStops[2].position, nashikStops[3].position, nashikStops[4].position]),
    ],
  },
]

export const LIMITED_COVERAGE_KM = 150

function compareCoverage(route: TripRoute, candidate: RouteOption) {
  const chargers = [...candidate.chargers].sort((a, b) => a.km - b.km)
  const points = [{ name: route.origin.label, km: 0 }, ...chargers, { name: route.destination.label, km: candidate.distanceKm }]
  const legs = points.slice(1).map((end, index) => ({
    from: points[index].name,
    to: end.name,
    km: end.km - points[index].km,
  }))
  return {
    ...candidate,
    chargers,
    legs,
    longestGapKm: Math.max(...legs.map((leg) => leg.km)),
    gaps: legs.filter((leg) => leg.km > LIMITED_COVERAGE_KM),
  }
}

export type ComparedRoute = ReturnType<typeof compareCoverage>

export function compareRoutes(route: TripRoute) {
  const candidates = route.options.map((option) => compareCoverage(route, option))
  const [fastest, ...alternatives] = candidates.sort((a, b) => a.driveMinutes - b.driveMinutes)
  const reliable = alternatives
    .filter((route) => route.longestGapKm < fastest.longestGapKm)
    .sort((a, b) => a.longestGapKm - b.longestGapKm || b.chargers.length - a.chargers.length || a.driveMinutes - b.driveMinutes)[0]
  return { fastest, reliable: reliable ?? fastest }
}

export function tripWaypoints(route: ComparedRoute, stopIds: ReadonlySet<string>) {
  return route.chargers.filter((charger) =>
    stopIds.has(charger.id) || route.waypoints.some((point) =>
      point.lat === charger.position.lat && point.lng === charger.position.lng
    )
  ).map((charger) => ({ ...charger.position, label: charger.name }))
}

export function googleMapsTripSections(points: Place[]) {
  // A mobile Maps URL supports three intermediate stops, or four legs.
  return points.slice(0, -1).flatMap((from, index) => {
    if (index % 4 !== 0) return []
    const end = Math.min(index + 4, points.length - 1)
    const to = points[end]
    return [{ from: from.label, to: to.label, url: googleMapsDirectionsUrl(from, points.slice(index + 1, end), to) }]
  })
}

/** Directions may differ from the seeded corridor estimates. */
function googleMapsDirectionsUrl(origin: Coord, stops: Coord[], destination: Coord): string {
  const at = (c: Coord) => `${c.lat},${c.lng}`
  const params = new URLSearchParams({ api: '1', origin: at(origin), destination: at(destination), travelmode: 'driving' })
  if (stops.length) params.set('waypoints', stops.map(at).join('|'))
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
