import { ArrowRight, ChevronRight, Route } from 'lucide-react'
import { useState } from 'react'
import { AmpereMark } from '../../components/Shell'
import { Button, Sheet } from '../../components/ui'
import { api } from '../../server/api'
import { STOP_RESERVE } from './planner'
import type { TripInterpretation } from './interpretation'
import { TRIP_ROUTES } from './routes'

type TripRequest = { routeId: string; departureSoc: number; arrivalSoc: number }
type Review = Extract<TripInterpretation, { kind: 'trip' }>
const EXAMPLE = 'Pune to Mumbai, arrive with 20%'

function validBattery(value: number | null, minimum: number): value is number {
  return value !== null && Number.isInteger(value) && value >= minimum && value <= 100
}

export function AskAmpere({ departureSoc, arrivalSoc, onApply }: {
  departureSoc: number
  arrivalSoc: number
  onApply: (request: TripRequest) => void
}) {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [review, setReview] = useState<Review | null>(null)

  function edit(value: string) {
    setPrompt(value)
    setReview(null)
    setMessage('')
  }

  async function interpret() {
    if (!prompt.trim() || pending) return
    setPending(true)
    setReview(null)
    setMessage('')
    try {
      const result = await api.interpretTrip(prompt.trim())
      if (!result.ok) setMessage(result.error.message)
      else if (result.data.kind === 'clarify') setMessage(result.data.message)
      else setReview({
        ...result.data,
        departureSoc: result.data.departureSoc ?? departureSoc,
        arrivalSoc: Math.max(STOP_RESERVE, result.data.arrivalSoc ?? arrivalSoc),
      })
    } finally {
      setPending(false)
    }
  }

  function apply() {
    if (!review || !validBattery(review.departureSoc, 0) || !validBattery(review.arrivalSoc, STOP_RESERVE)) return
    onApply({ routeId: review.routeId, departureSoc: review.departureSoc, arrivalSoc: review.arrivalSoc })
    setReview(null)
    setOpen(false)
  }

  const fieldClass = 'mt-1.5 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink'
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="mb-3 flex min-h-16 w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:bg-volt-soft active:bg-volt-soft"
      >
        <AmpereMark className="size-10 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">Ask Ampere</span>
          <span className="block text-xs text-muted">Plan a trip in your own words</span>
        </span>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-volt-soft text-volt">
          <ChevronRight className="size-4" aria-hidden="true" />
        </span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} spring
        title={<span className="flex items-center gap-2.5"><AmpereMark className="size-8 shrink-0" />Ask Ampere</span>}>
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void interpret() }}>
          <label htmlFor="trip-request" className="sr-only">Describe your trip</label>
          <textarea
            id="trip-request" rows={2} maxLength={500} value={prompt} disabled={pending}
            onChange={(event) => edit(event.target.value)}
            placeholder="Where are you headed?"
            className="block min-h-20 w-full resize-none rounded-2xl border border-line bg-surface-2 px-4 py-3 text-base text-ink"
          />
          {!prompt && <button type="button" onClick={() => edit(EXAMPLE)}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-volt-soft px-3 text-left text-xs font-medium text-volt">
            <Route className="size-4 shrink-0" aria-hidden="true" />{EXAMPLE}
          </button>}
          {!review && <Button type="submit" variant="volt" loading={pending} disabled={pending || !prompt.trim()} className="w-full">
            {pending ? 'Reading request…' : 'Review trip'}{!pending && <ArrowRight className="size-4" aria-hidden="true" />}
          </Button>}
          {message && <p role="status" className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-ink-2">{message}</p>}
        </form>

        {review && (
          <section aria-labelledby="ask-ampere-review" className="mt-4 space-y-3 rounded-2xl bg-surface-2 p-4">
            <h3 id="ask-ampere-review" className="text-sm font-semibold">Review your trip</h3>
            <label className="block text-xs font-medium">Route
              <select value={review.routeId} onChange={(event) => setReview({ ...review, routeId: event.target.value })} className={fieldClass}>
                {TRIP_ROUTES.map((trip) => <option key={trip.id} value={trip.id}>{trip.origin.label} → {trip.destination.label}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-medium">Departure battery %
                <input type="number" min={0} max={100} value={review.departureSoc ?? ''} onChange={(event) => setReview({ ...review, departureSoc: event.target.value === '' ? null : event.target.valueAsNumber })} className={fieldClass} />
              </label>
              <label className="text-xs font-medium">Minimum arrival %
                <input type="number" min={STOP_RESERVE} max={100} value={review.arrivalSoc ?? ''} onChange={(event) => setReview({ ...review, arrivalSoc: event.target.value === '' ? null : event.target.valueAsNumber })} className={fieldClass} />
              </label>
            </div>
            <Button type="button" variant="volt" className="w-full" onClick={apply}
              disabled={!validBattery(review.departureSoc, 0) || !validBattery(review.arrivalSoc, STOP_RESERVE)}>
              Apply trip <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </section>
        )}
      </Sheet>
    </>
  )
}
