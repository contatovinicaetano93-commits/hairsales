import { askAI, isAiConfigured } from '@/lib/ai/client'
import { getProBrand } from '@/lib/pro/brand'
import { buildProHoje } from '@/lib/pro/hoje'
import { getSql } from '@/lib/db'
import { assertCan } from '@/lib/pro/entitlements'
import type { SubscriberRow } from '@/lib/pro/subscribers'
import { consumeAiUnits, QuotaExceededError, refundAiUnits } from '@/lib/pro/quotas'

function assistantSystemPrompt(displayName: string) {
  const brand = getProBrand()
  return `Você é ${brand.name}, assistente de gestão do profissional ${displayName}.
Responda só com base nos DADOS DO PROFISSIONAL fornecidos (agenda, faturamento, ticket, clientes, reativação, upsell).
Nunca invente números do salão inteiro nem de outros profissionais.
Seja direta, em português, no máximo 5 linhas. Foque em ação prática.
Se a pergunta não couber nos dados, diga o que falta (ex.: conectar agenda).`
}

function rulesAnswer(question: string, context: string): string {
  const q = question.toLowerCase()
  if (/(meta|fatur|ticket|ocupa)/.test(q)) {
    return `Com base nos seus dados de hoje:\n${context.slice(0, 600)}`
  }
  if (/(reativ|sumiu|voltar)/.test(q)) {
    return `Olhe a lista de reativação nas Ações — são clientes da sua carteira sem visita recente. Priorize os que sumiram há mais dias.`
  }
  if (/(agenda|hoje|horario|horário)/.test(q)) {
    return `Sua agenda do dia está em Hoje. Se estiver vazia, atualize a conexão Avec ou confira se o nome na agenda bate com o assinante.`
  }
  return `Posso ajudar com sua agenda, metas, ticket, reativação e upsell — só dos seus dados.\n\nContexto rápido:\n${context.slice(0, 500)}`
}

export async function buildSubscriberContext(subscriber: SubscriberRow): Promise<string> {
  const hoje = await buildProHoje(subscriber)
  const sql = getSql()
  const topClients = (await sql`
    select name, last_service_name, last_visit_at, status
    from subscriber_clients
    where subscriber_id = ${subscriber.id}
    order by coalesce(last_visit_at, updated_at) desc nulls last
    limit 8
  `) as Array<{
    name: string | null
    last_service_name: string | null
    last_visit_at: string | null
    status: string
  }>

  const lines = [
    `Profissional: ${hoje.connection.professional_name ?? subscriber.display_name}`,
    `Conexão: ${hoje.connection.status}`,
    `Dia: ${hoje.metrics.day}`,
    `Faturamento hoje: R$ ${hoje.metrics.revenue}`,
    `Atendidos: ${hoje.metrics.attended}`,
    `Ticket médio: ${hoje.metrics.ticket_avg ?? '—'}`,
    `Ocupação: ${hoje.metrics.occupancy ?? '—'}`,
    `Agenda hoje: ${hoje.metrics.appointments} horários`,
    `Meta diária: ${hoje.goals.daily_revenue ?? 'não definida'} (${hoje.goals.daily_progress_pct ?? 0}%)`,
    `Leads quentes: ${hoje.leads_hot}`,
    `Reativações pendentes: ${hoje.reactivation_count}`,
    `Ações: ${hoje.actions_top.map((a) => `${a.kind}:${a.client_name ?? '?'} — ${a.detail}`).join(' | ') || 'nenhuma'}`,
    `Agenda: ${hoje.agenda.map((a) => `${a.scheduled_at ?? '?'} ${a.client_name ?? ''} ${a.service_name ?? ''}`).join(' ; ') || 'vazia'}`,
    `Clientes recentes: ${topClients.map((c) => `${c.name ?? '?'} (${c.status})`).join(', ') || 'nenhum'}`,
  ]
  return lines.join('\n')
}

export async function askSubscriberAssistant(
  subscriber: SubscriberRow,
  question: string,
): Promise<{ answer: string; source: 'ai' | 'rules'; units: number; quota_error?: string }> {
  assertCan(subscriber, 'assistant')

  const context = await buildSubscriberContext(subscriber)

  let units = 0
  try {
    const consumed = await consumeAiUnits(subscriber.id, subscriber.plan, 'question')
    units = consumed.units
  } catch (e) {
    if (e instanceof QuotaExceededError) {
      return {
        answer: `${e.message}\n\nResumo sem IA:\n${context.slice(0, 700)}`,
        source: 'rules',
        units: 0,
        quota_error: e.message,
      }
    }
    throw e
  }

  if (isAiConfigured()) {
    try {
      const ai = await askAI(
        assistantSystemPrompt(subscriber.display_name),
        `DADOS DO PROFISSIONAL:\n${context}\n\nPERGUNTA:\n${question}`,
      )
      if (ai.trim()) {
        await logAssistantMessage(subscriber.id, question, ai.trim(), units)
        return { answer: ai.trim(), source: 'ai', units }
      }
    } catch {
      // fallback regras
    }
  }

  const answer = rulesAnswer(question, context)
  await refundAiUnits(subscriber.id, units)
  await logAssistantMessage(subscriber.id, question, answer, 0)
  return { answer, source: 'rules', units: 0 }
}

async function logAssistantMessage(
  subscriberId: string,
  question: string,
  answer: string,
  units: number,
) {
  const sql = getSql()
  await sql`
    insert into subscriber_assistant_messages (subscriber_id, role, content, units)
    values
      (${subscriberId}, 'user', ${question.slice(0, 4000)}, 0),
      (${subscriberId}, 'assistant', ${answer.slice(0, 4000)}, ${units})
  `
  // Mantém só as últimas ~40 mensagens por assinante
  await sql`
    delete from subscriber_assistant_messages
    where subscriber_id = ${subscriberId}
      and id not in (
        select id from subscriber_assistant_messages
        where subscriber_id = ${subscriberId}
        order by created_at desc
        limit 40
      )
  `
}

export async function listAssistantHistory(subscriberId: string, limit = 20) {
  const sql = getSql()
  return (await sql`
    select id, role, content, units, created_at
    from subscriber_assistant_messages
    where subscriber_id = ${subscriberId}
    order by created_at desc
    limit ${limit}
  `) as Array<{
    id: string
    role: string
    content: string
    units: number
    created_at: string
  }>
}
