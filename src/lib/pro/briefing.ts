import { askAI, isAiConfigured } from '@/lib/ai/client'
import { getProBrand } from '@/lib/pro/brand'
import { buildProHoje } from '@/lib/pro/hoje'
import { assertCan } from '@/lib/pro/entitlements'
import { consumeAiUnits, getQuotaStatus, QuotaExceededError, refundAiUnits } from '@/lib/pro/quotas'
import type { SubscriberRow } from '@/lib/pro/subscribers'

function briefingPrompt(name: string) {
  const brand = getProBrand()
  return `Você é ${brand.name}. Gere o briefing da manhã para o profissional ${name}.
Use SOMENTE os dados fornecidos. Máx. 6 linhas. Formato:
1) Como está o dia (agenda + meta)
2) 1–3 ações prioritárias (reativação/upsell/risco)
Tom prático, sem dados de outros profissionais ou do salão inteiro.`
}

export function buildRuleBriefing(hoje: Awaited<ReturnType<typeof buildProHoje>>): string {
  const lines = [
    `Bom dia, ${hoje.subscriber.display_name}.`,
    `Hoje: ${hoje.metrics.appointments} na agenda · R$ ${hoje.metrics.revenue} · ${hoje.metrics.attended} atendidos` +
      (hoje.goals.daily_revenue != null
        ? ` · meta ${hoje.goals.daily_progress_pct ?? 0}% de R$ ${hoje.goals.daily_revenue}`
        : ''),
  ]
  if (hoje.actions_top.length === 0) {
    lines.push('Sem ações urgentes na carteira — foque na agenda do dia.')
  } else {
    lines.push('Prioridades:')
    for (const a of hoje.actions_top.slice(0, 3)) {
      lines.push(`• [${a.kind === 'reactivation' ? 'Reativar' : 'Upsell'}] ${a.client_name ?? 'Cliente'}: ${a.detail}`)
    }
  }
  if (hoje.leads_hot > 0) {
    lines.push(`${hoje.leads_hot} lead(s) quente(s) na sua base.`)
  }
  return lines.join('\n')
}

export async function generateMorningBriefing(subscriber: SubscriberRow): Promise<{
  briefing: string
  source: 'ai' | 'rules'
  units: number
  already_done: boolean
  quota_error?: string
}> {
  assertCan(subscriber, 'assistant')

  const hoje = await buildProHoje(subscriber)
  const quota = await getQuotaStatus(subscriber.id, subscriber.plan)

  if (quota.briefing_done_today) {
    return {
      briefing: buildRuleBriefing(hoje),
      source: 'rules',
      units: 0,
      already_done: true,
    }
  }

  let units = 0
  try {
    const consumed = await consumeAiUnits(subscriber.id, subscriber.plan, 'briefing', {
      markBriefing: true,
    })
    units = consumed.units
  } catch (e) {
    if (e instanceof QuotaExceededError) {
      return {
        briefing: buildRuleBriefing(hoje),
        source: 'rules',
        units: 0,
        already_done: false,
        quota_error: e.message,
      }
    }
    throw e
  }

  const rule = buildRuleBriefing(hoje)
  if (isAiConfigured() && hoje.connection.status === 'active') {
    try {
      const ctx = [
        `Agenda: ${hoje.agenda.length}`,
        `Fat: ${hoje.metrics.revenue}`,
        `Meta%: ${hoje.goals.daily_progress_pct}`,
        `Ações: ${JSON.stringify(hoje.actions_top)}`,
        `Leads: ${hoje.leads_hot}`,
        `Reativações: ${hoje.reactivation_count}`,
      ].join('\n')
      const ai = await askAI(briefingPrompt(subscriber.display_name), ctx)
      if (ai.trim()) {
        return { briefing: ai.trim(), source: 'ai', units, already_done: false }
      }
    } catch {
      // fallback
    }
  }

  await refundAiUnits(subscriber.id, units)
  return { briefing: rule, source: 'rules', units: 0, already_done: false }
}
