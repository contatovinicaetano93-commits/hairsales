import { NextRequest } from 'next/server'
import { ok } from '@/lib/api-response'
import { getSql } from '@/lib/db'
import { sendTelegramMessage } from '@/lib/telegram/bot'
import { askAI } from '@/lib/ai/client'
import type { ContactRow } from '@/lib/contacts'
import { listServices } from '@/lib/services'
import { enrichServices, computeRecommendations } from '@/lib/recommendations'
import { generateBrief } from '@/lib/brief'

const SECRETARIA_PROMPT = `Você é a secretária virtual do ROM Club para a equipe interna.
Responda perguntas práticas sobre os KPIs de contato do salão (quantidade de
contatos, canal, status) usando SOMENTE os dados fornecidos no contexto abaixo.
Seja direta, em português, no máximo 4 linhas. Se a pergunta não tiver relação
com os dados fornecidos, diga que só responde sobre KPIs de contato por enquanto.
Dica: use "/cliente <nome ou telefone>" pra receber o briefing de um cliente.`

interface TelegramUpdate {
  message?: {
    chat: { id: number }
    text?: string
  }
}

// Busca cliente por nome (parcial) ou telefone (dígitos) e monta o briefing pro backstaff.
async function handleClienteCommand(chatId: number, query: string) {
  const sql = getSql()
  const digits = query.replace(/\D/g, '')
  const rows = (await sql`
    select * from contacts
    where name ilike ${'%' + query + '%'}
       or (${digits} <> '' and regexp_replace(coalesce(phone,''), '\\D', '', 'g') like ${'%' + digits + '%'})
    order by last_contact_at desc
    limit 1
  `) as ContactRow[]

  const contact = rows[0]
  if (!contact) {
    await sendTelegramMessage(chatId, `Não encontrei cliente para "${query}".`)
    return
  }

  const services = enrichServices(await listServices(contact.id))
  const recs = computeRecommendations(services)
  const { brief } = await generateBrief(contact, services, recs)
  await sendTelegramMessage(chatId, `📋 ${contact.name ?? 'Cliente'}\n\n${brief}`)
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return ok({ ignored: true }, undefined, 200)
  }

  const update = (await req.json().catch(() => null)) as TelegramUpdate | null
  const chatId = update?.message?.chat.id
  const text = update?.message?.text

  if (!chatId || !text) return ok({ ignored: true })

  try {
    // Comando guiado: /cliente <busca> → briefing pro backstaff (cross/up-sell)
    const clienteMatch = text.match(/^\/cliente\s+(.+)/i)
    if (clienteMatch) {
      await handleClienteCommand(chatId, clienteMatch[1].trim())
      return ok({ replied: true, mode: 'cliente' })
    }

    const sql = getSql()
    const [byDay, byStatus, conversionRows] = await Promise.all([
      sql`select * from v_kpi_daily limit 7`,
      sql`select * from v_kpi_status`,
      sql`select * from v_kpi_conversion limit 1`,
    ])

    const context = JSON.stringify({ byDay, byStatus, conversion: conversionRows[0] ?? null })
    const reply = await askAI(SECRETARIA_PROMPT, `Pergunta: ${text}\n\nDados: ${context}`)

    await sendTelegramMessage(chatId, reply || 'Não consegui puxar essa informação agora.')
    return ok({ replied: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'erro desconhecido'
    await sendTelegramMessage(chatId, 'Tive um problema pra consultar os dados agora, já registrei o erro.').catch(
      () => {}
    )
    return ok({ replied: false, error: message })
  }
}
