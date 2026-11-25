import { describe, expect, it, vi } from 'vitest'
import { USERS } from '../../frontend/src/domain/catalogue'
import { createOpenAiInterpreter, tripInterpretationRoutes } from '../src/tripInterpretation'

function responseWith(text: Record<string, unknown>) {
  return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(text) }] }] })
}

describe('trip interpretation', () => {
  it('asks for structured data and validates the extracted battery constraints', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(responseWith({ routeId: 'mumbai', departureSoc: null, arrivalSoc: 20 }))
    const interpret = createOpenAiInterpreter('test-key', 'test-model', request)
    await expect(interpret('Pune to Mumbai with 20% left')).resolves.toEqual({
      kind: 'trip', routeId: 'mumbai', departureSoc: null, arrivalSoc: 20,
    })
    const [, options] = request.mock.calls[0]
    const body = JSON.parse(String(options?.body))
    expect(body.text.format.strict).toBe(true)
    expect(body.store).toBe(false)
    request.mockResolvedValueOnce(responseWith({ routeId: 'unsupported', departureSoc: null, arrivalSoc: 20 }))
    await expect(interpret('Unsupported trip')).rejects.toThrow('Unsupported trip')
    request.mockResolvedValueOnce(responseWith({ routeId: 'mumbai', departureSoc: null, arrivalSoc: 120 }))
    await expect(interpret('Invalid charge')).rejects.toThrow('Invalid trip constraints')
    request.mockResolvedValueOnce(responseWith({ routeId: null, departureSoc: null, arrivalSoc: null }))
    await expect(interpret('Mumbai or Delhi')).resolves.toMatchObject({ kind: 'clarify' })
  })

  it('keeps the endpoint usable without a configured provider', async () => {
    const app = tripInterpretationRoutes(() => USERS[0], null)
    const response = await app.request('/interpret', { method: 'POST' })
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'AI_UNAVAILABLE' } })
  })

  it('limits requests per driver and returns a manual-planning fallback on provider failure', async () => {
    const provider = vi.fn().mockRejectedValue(new DOMException('Timeout', 'TimeoutError'))
    const app = tripInterpretationRoutes(() => USERS[0], provider)
    const send = () => app.request('/interpret', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: 'Pune to Mumbai' }),
    })
    for (let i = 0; i < 5; i++) expect((await send()).status).toBe(502)
    expect((await send()).status).toBe(429)
    expect(provider).toHaveBeenCalledTimes(5)
  })
})
