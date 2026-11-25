import { useEffect, useRef, useState } from 'react'
import type { Vehicle } from '../domain/types'
import { api } from '../server/api'

/** Keep the live drag independent of slower profile snapshots and save edits in order. */
export function useVehicleSlider(vehicle: Vehicle | null | undefined, field: 'soc' | 'target_soc') {
  const stored = vehicle?.[field]
  const id = vehicle?.id
  const [draft, setDraft] = useState<{ id: string; value: number } | null>(null)
  const latest = useRef(0)
  const queue = useRef(Promise.resolve())
  const latestStored = useRef(stored)
  const confirmed = useRef<number | null>(null)

  useEffect(() => {
    latestStored.current = stored
    if (confirmed.current === stored) setDraft((current) => current && current.id === id && current.value === stored ? null : current)
  }, [id, stored])

  function onChange(value: number) {
    if (id) {
      latest.current++
      confirmed.current = null
      setDraft({ id, value })
    }
  }

  function onCommit(value: number) {
    if (!id) return
    const edit = latest.current
    queue.current = queue.current.then(async () => {
      const result = await api.updateVehicle(id, { [field]: value })
      if (latest.current !== edit) return
      if (!result.ok) setDraft(null)
      else {
        confirmed.current = value
        if (latestStored.current === value) setDraft(null)
      }
    }).catch(() => {
      if (latest.current === edit) setDraft(null)
    })
  }

  return { value: draft?.id === id ? draft?.value ?? stored : stored, onChange, onCommit }
}
