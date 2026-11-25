import { modelById, readVehicleCatalogue } from '../server/db'
import { Check } from 'lucide-react'
import { useSession } from '../app/hooks'
import { CarExoskeleton } from '../components/CarExoskeleton'
import { Page, PageHeader } from '../components/Shell'
import { Card, Chip, Field, Notice, Range, SectionTitle, useAction } from '../components/ui'
import { rangeBudget } from '../domain/calc'
import { CONNECTOR_LABEL } from '../domain/catalogue'
import { POLICY } from '../domain/policy'
import { cn } from '../lib/cn'
import { km } from '../lib/format'
import { api } from '../server/api'
import { useVehicleSlider } from '../app/useVehicleSlider'
import { useMyVehicle } from '../app/useMyVehicle'

export default function Vehicle() {
  const user = useSession()!
  const vehicle = useMyVehicle()
  const battery = useVehicleSlider(vehicle, 'soc')
  const chargeTarget = useVehicleSlider(vehicle, 'target_soc')
  const { run } = useAction()
  if (!vehicle) return <Page><Notice>This account has no car profile.</Notice></Page>
  const model = modelById(vehicle.model_id)
  if (!model) return <Page><Notice>Vehicle specifications are unavailable. Reload the page to try again.</Notice></Page>
  const { models } = readVehicleCatalogue()
  const soc = battery.value ?? vehicle.soc
  const target = chargeTarget.value ?? vehicle.target_soc
  const budget = rangeBudget(model, soc, POLICY)
  return (
    <>
      <PageHeader back title="Car profile" subtitle={user.display_name} />
      <Page>
        <div className="lg:grid lg:grid-cols-[320px_1fr] lg:gap-10">
          <div className="mx-auto max-w-[260px] lg:max-w-none">
            <CarExoskeleton soc={soc} inletLabel={model.connectors.map((c) => `${CONNECTOR_LABEL[c.standard]} ${c.mode}`).join(' · ')} className="mx-auto aspect-[240/520] w-full" />
          </div>
          <div>
            <Card className="mt-4 lg:mt-0">
              <div className="text-2xl font-semibold tracking-tight">
                {model.make} {model.model}
              </div>
              <div className="text-sm text-muted">{model.variant}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Chip>{(model.usable_battery_wh / 1000).toFixed(0)} kWh usable</Chip>
                <Chip>AC ≤ {model.ac_limit_kw} kW</Chip>
                <Chip>DC ≤ {model.dc_limit_kw} kW</Chip>
                <Chip>{model.consumption_kwh_per_km} kWh/km (conservative)</Chip>
                {model.connectors.map((c) => (
                  <Chip key={c.standard} tone="volt">
                    {CONNECTOR_LABEL[c.standard]} {c.mode}
                  </Chip>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted">{model.evidence_note}</p>
              {model.published_specs && <a href={model.published_specs.source} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-volt">Manufacturer specifications · reviewed {model.published_specs.reviewed_on}</a>}
              {['vm-nexon-ev-demo', 'vm-xuv400-demo'].includes(model.id) && <p className="mt-2 text-xs font-semibold">Select your exact battery variant below to replace this demo profile.</p>}
            </Card>
            <Card className="mt-3 space-y-5">
              <Field label={`Battery now: ${soc}%`} hint={`Range budget ${km(budget.range_budget_m)} after ${POLICY.reserve_pct}% reserve and ×${POLICY.uncertainty} uncertainty.`}>
                <Range label="Battery now" value={soc} min={0} max={100} onChange={battery.onChange} onCommit={battery.onCommit} />
              </Field>
              <Field label={`Charge target: ${target}%`}>
                <Range label="Charge target" value={target} min={10} max={100} onChange={chargeTarget.onChange} onCommit={chargeTarget.onCommit} />
              </Field>
            </Card>
            <SectionTitle>Reviewed catalogue</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2">
              {[...models].sort((a, b) => Number(!!b.published_specs) - Number(!!a.published_specs)).map((m) => (
                <button key={m.id} onClick={() => run('m', () => api.updateVehicle(vehicle.id, { model_id: m.id, nickname: m.model }), `Car set to ${m.make} ${m.model}`)} className={cn('flex items-center gap-3 rounded-2xl border bg-surface p-3 text-left', m.id === model.id ? 'border-ink' : 'border-line')}>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {m.make} {m.model}
                    </div>
                    <div className="truncate text-xs text-muted">{m.variant}</div>
                  </div>
                  {m.id === model.id ? <Check className="size-4" /> : null}
                </button>
              ))}
            </div>
            <Notice className="mt-4">Battery percentage is entered by you each time — Ampere doesn’t read live vehicle telemetry. Unsupported models need manual, clearly unverified data (not enabled in this demo).</Notice>
          </div>
        </div>
      </Page>
    </>
  )
}
