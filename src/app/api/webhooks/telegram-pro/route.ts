import { NextRequest } from 'next/server'
import { ok, err } from '@/lib/api-response'
import { sendTelegramMessage } from '@/lib/telegram/bot'
import { isProduction } from '@/lib/env'
import {
  findSubscriberByTelegramChat,
  linkTelegramByCode,
} from '@/lib/pro/telegram'
import { getTelegramProBotToken, getTelegramProWebhookSecret } from '@/lib/pro/secrets'
import { askSubscriberAssistant } from '@/lib/pro/assistant'
import { generateMorningBriefing } from '@/lib/pro/briefing'
import { checkCan } from '@/lib/pro/entitlements'
import { buildProHoje } from '@/lib/pro/hoje'
import { getProBrand } from '@/lib/pro/brand'

interface TelegramUpdate {
  message?: {
    chat: { id: number }
    text?: string
  }
}

function proBotToken() {
  return getTelegramProBotToken()
}

async function reply(chatId: number, text: string) {
  const token = proBotToken()
  if (!token) return
  await sendTelegramMessage(chatId, text, token)
}

export async function POST(req: NextRequest) {
  const secret = getTelegramProWebhookSecret()
  if (secret) {
    const header = req.headers.get('x-telegram-bot-api-secret-token')
    if (header !== secret) return err('Não autorizado', 401)
  } else if (isProduction()) {
    return err('TELEGRAM_PRO_WEBHOOK_SECRET não configurado', 401)
  }

  const update = (await req.json().catch(() => null)) as TelegramUpdate | null
  const chatId = update?.message?.chat.id
  const text = update?.message?.text?.trim()
  if (!chatId || !text) return ok({ ignored: true })

  const brand = getProBrand()
  const start = text.match(/^\/start(?:\s+([a-f0-9]{6}))?/i)
  if (start) {
    const code = start[1]
    if (code) {
      const sub = await linkTelegramByCode(code, String(chatId))
      if (!sub) {
        await reply(chatId, 'Código inválido ou expirado. Gere outro em Conectar no app.')
        return ok({ replied: true, mode: 'link_fail' })
      }
      await reply(
        chatId,
        `Pronto, ${sub.display_name}! Sou o ${brand.name}.\nPergunte sobre sua agenda, meta ou reativação.\nComandos: /hoje · /briefing`,
      )
      return ok({ replied: true, mode: 'linked' })
    }
    await reply(
      chatId,
      `Oi! Sou o ${brand.name} — assistente do profissional.\nPara vincular sua conta, gere um código em /pro/conectar e envie:\n/start SEUCODIGO`,
    )
    return ok({ replied: true, mode: 'start' })
  }

  const subscriber = await findSubscriberByTelegramChat(String(chatId))
  if (!subscriber) {
    await reply(
      chatId,
      'Este chat ainda não está vinculado. Abra o app → Conectar → vincular Telegram.',
    )
    return ok({ replied: true, mode: 'unlinked' })
  }

  const telegramEntitlement = checkCan(subscriber, 'telegram')
  if (!telegramEntitlement.ok) {
    await reply(chatId, telegramEntitlement.message)
    return ok({
      replied: true,
      mode: 'not_entitled',
      capability: telegramEntitlement.capability,
    })
  }

  if (/^\/hoje\b/i.test(text)) {
    const hoje = await buildProHoje(subscriber)
    await reply(
      chatId,
      [
        `Hoje — ${subscriber.display_name}`,
        `Agenda: ${hoje.metrics.appointments} · Fat: R$ ${hoje.metrics.revenue}`,
        `Atendidos: ${hoje.metrics.attended} · Reativar: ${hoje.reactivation_count}`,
        hoje.actions_top[0]
          ? `Próxima ação: ${hoje.actions_top[0].client_name} — ${hoje.actions_top[0].detail}`
          : 'Sem ações urgentes.',
      ].join('\n'),
    )
    return ok({ replied: true, mode: 'hoje' })
  }

  if (/^\/briefing\b/i.test(text)) {
    const assistantEntitlement = checkCan(subscriber, 'assistant')
    if (!assistantEntitlement.ok) {
      await reply(chatId, assistantEntitlement.message)
      return ok({
        replied: true,
        mode: 'not_entitled',
        capability: assistantEntitlement.capability,
      })
    }
    const result = await generateMorningBriefing(subscriber)
    await reply(chatId, result.briefing)
    return ok({ replied: true, mode: 'briefing' })
  }

  const assistantEntitlement = checkCan(subscriber, 'assistant')
  if (!assistantEntitlement.ok) {
    await reply(chatId, assistantEntitlement.message)
    return ok({
      replied: true,
      mode: 'not_entitled',
      capability: assistantEntitlement.capability,
    })
  }

  const result = await askSubscriberAssistant(subscriber, text)
  await reply(chatId, result.answer)
  return ok({ replied: true, mode: 'assistant', source: result.source })
}
