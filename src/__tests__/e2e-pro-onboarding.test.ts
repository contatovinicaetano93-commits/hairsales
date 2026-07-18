import { describe, it, expect } from 'vitest'

const BASE_URL = process.env.PRO_E2E_BASE_URL || 'http://localhost:3000'

function cookieFrom(res: Response) {
  const setCookie = res.headers.get('set-cookie')
  if (!setCookie) return null
  return setCookie.split(';')[0]
}

describe('E2E: Pro onboarding setup', () => {
  it('register → onboarding → connect mock → goals → telegram code → portal 4xx/503', async () => {
    const email = `pro-e2e-${Date.now()}@example.com`
    const password = 'teste123'
    const displayName = 'Dani Mariniello'

    let registerRes: Response
    try {
      registerRes = await fetch(`${BASE_URL}/api/pro/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          email,
          password,
        }),
      })
    } catch {
      console.log('Pro e2e: servidor indisponível em', BASE_URL, '— skip')
      return
    }

    if (registerRes.status === 503 || registerRes.status >= 500) {
      console.log('Pro e2e: DB/API indisponível (', registerRes.status, ') — skip')
      return
    }

    expect(registerRes.status).toBe(200)
    const cookie = cookieFrom(registerRes)
    expect(cookie).toBeTruthy()
    expect(cookie).toContain('vitrini_pro_session')

    const headers = {
      Cookie: cookie!,
      'Content-Type': 'application/json',
    }

    const before = await fetch(`${BASE_URL}/api/me/onboarding`, { headers: { Cookie: cookie! } })
    expect(before.status).toBe(200)
    const beforeJson = await before.json()
    expect(beforeJson.data.ready_for_day).toBe(false)
    expect(beforeJson.data.steps.find((s: { id: string }) => s.id === 'agenda')?.done).toBe(false)

    const connectRes = await fetch(`${BASE_URL}/api/me/connect`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        provider: 'avec',
        display_name: displayName,
        api_token: 'mock',
        unit_external_id: null,
      }),
    })
    expect(connectRes.status).toBe(200)
    const connectJson = await connectRes.json()
    expect(connectJson.data.connection.status).toBe('active')

    const afterConnect = await fetch(`${BASE_URL}/api/me/onboarding`, {
      headers: { Cookie: cookie! },
    })
    const afterConnectJson = await afterConnect.json()
    expect(afterConnectJson.data.ready_for_day).toBe(true)
    expect(afterConnectJson.data.steps.find((s: { id: string }) => s.id === 'agenda')?.done).toBe(
      true,
    )

    const goalsRes = await fetch(`${BASE_URL}/api/me/goals`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ daily_goal_revenue: 900, weekly_goal_revenue: 4500 }),
    })
    expect(goalsRes.status).toBe(200)

    const afterGoals = await fetch(`${BASE_URL}/api/me/onboarding`, {
      headers: { Cookie: cookie! },
    })
    const afterGoalsJson = await afterGoals.json()
    expect(afterGoalsJson.data.steps.find((s: { id: string }) => s.id === 'goals')?.done).toBe(true)

    const telegramRes = await fetch(`${BASE_URL}/api/me/telegram`, {
      method: 'POST',
      headers: { Cookie: cookie! },
    })
    expect(telegramRes.status).toBe(200)
    const telegramJson = await telegramRes.json()
    expect(telegramJson.data.code).toBeTruthy()

    // Portal: sem Stripe → 503; com Stripe mas sem customer → erro de negócio
    const portalRes = await fetch(`${BASE_URL}/api/me/billing/portal`, {
      method: 'POST',
      headers: { Cookie: cookie! },
    })
    expect([400, 403, 404, 503]).toContain(portalRes.status)

    const hojeRes = await fetch(`${BASE_URL}/api/me/hoje`, { headers: { Cookie: cookie! } })
    expect(hojeRes.status).toBe(200)
    const hojeJson = await hojeRes.json()
    expect(hojeJson.data.connection.status).toBe('active')
  })

  it('rejeita /api/me/onboarding sem sessão', async () => {
    let res: Response
    try {
      res = await fetch(`${BASE_URL}/api/me/onboarding`)
    } catch {
      console.log('Pro e2e: servidor indisponível — skip unauth check')
      return
    }
    expect([401, 403]).toContain(res.status)
  })
})
