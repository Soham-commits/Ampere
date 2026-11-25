export type TripInterpretation =
  | { kind: 'trip'; routeId: string; departureSoc: number | null; arrivalSoc: number | null }
  | { kind: 'clarify'; message: string }
