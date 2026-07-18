import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { requireProSession } from '@/lib/pro/auth'
import { findSubscriberById, setSubscriberGoals } from '@/lib/pro/subscribers'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)
    const s = auth.session.subscriber
    return ok({
      daily_goal_revenue: s.daily_goal_revenue != null ? Number(s.daily_goal_revenue) : null,
      weekly_goal_revenue: s.weekly_goal_revenue != null ? Number(s.weekly_goal_revenue) : null,
    })
  } catch (e) {
    return handleError(e)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)

    const body = await req.json().catch(() => null)
    const dailyRaw = body?.daily_goal_revenue
    const weeklyRaw = body?.weekly_goal_revenue

    const daily =
      dailyRaw === null || dailyRaw === ''
        ? null
        : Number(dailyRaw)
    const weekly =
      weeklyRaw === null || weeklyRaw === ''
        ? null
        : Number(weeklyRaw)

    if (daily != null && (!Number.isFinite(daily) || daily < 0)) {
      return err('Meta diária inválida', 400)
    }
    if (weekly != null && (!Number.isFinite(weekly) || weekly < 0)) {
      return err('Meta semanal inválida', 400)
    }

    // Se o campo não veio no body, mantém o valor atual
    const current = auth.session.subscriber
    const nextDaily =
      dailyRaw === undefined
        ? current.daily_goal_revenue != null
          ? Number(current.daily_goal_revenue)
          : null
        : daily
    const nextWeekly =
      weeklyRaw === undefined
        ? current.weekly_goal_revenue != null
          ? Number(current.weekly_goal_revenue)
          : null
        : weekly

    const updated = await setSubscriberGoals(auth.session.subscriber.id, nextDaily, nextWeekly)
    // refresh
    await findSubscriberById(updated.id)

    return ok({
      daily_goal_revenue: updated.daily_goal_revenue != null ? Number(updated.daily_goal_revenue) : null,
      weekly_goal_revenue:
        updated.weekly_goal_revenue != null ? Number(updated.weekly_goal_revenue) : null,
    })
  } catch (e) {
    return handleError(e)
  }
}
