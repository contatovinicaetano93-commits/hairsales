import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { requireProSession } from '@/lib/pro/auth'
import { assertCan } from '@/lib/pro/entitlements'
import { createTelegramLinkCode, unlinkTelegram } from '@/lib/pro/telegram'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)
    const linked = Boolean(auth.session.subscriber.telegram_chat_id)
    return ok({
      linked,
      chat_id_masked: linked
        ? String(auth.session.subscriber.telegram_chat_id).slice(0, 4) + '…'
        : null,
      bot_username: process.env.TELEGRAM_PRO_BOT_USERNAME || null,
    })
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)
    assertCan(auth.session.subscriber, 'telegram')
    const { code, expires_at } = await createTelegramLinkCode(auth.session.subscriber.id)
    const bot = process.env.TELEGRAM_PRO_BOT_USERNAME
    return ok({
      code,
      expires_at,
      instructions: bot
        ? `No Telegram, abra @${bot} e envie: /start ${code}`
        : `No bot Telegram do profissional, envie: /start ${code}`,
    })
  } catch (e) {
    return handleError(e)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)
    await unlinkTelegram(auth.session.subscriber.id)
    return ok({ linked: false })
  } catch (e) {
    return handleError(e)
  }
}
