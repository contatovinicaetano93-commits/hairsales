import { isProduction } from '@/lib/env'

const DEV_PRO_DATA_SECRET = 'dev-pro-data-secret-not-for-production'

function env(name: string) {
  return process.env[name]?.trim() || ''
}

export function getProDataSecret() {
  const secret = process.env.PRO_DATA_SECRET?.trim()
  if (secret) return secret

  if (process.env.NODE_ENV === 'production') {
    throw new Error('PRO_DATA_SECRET é obrigatório em produção para o app do profissional')
  }

  return DEV_PRO_DATA_SECRET
}

export function getWhatsAppProAppSecret() {
  const proSecret = env('WHATSAPP_PRO_APP_SECRET')
  if (proSecret) return proSecret

  // WHATSAPP_APP_SECRET is a Meta app-level secret useful for local/preview DX.
  // Production Pro webhooks must fail closed unless the dedicated Pro secret is set.
  if (isProduction()) return ''

  return env('WHATSAPP_APP_SECRET')
}

export function getTelegramProBotToken() {
  return env('TELEGRAM_PRO_BOT_TOKEN') || (isProduction() ? '' : env('TELEGRAM_BOT_TOKEN'))
}

export function getTelegramProWebhookSecret() {
  return env('TELEGRAM_PRO_WEBHOOK_SECRET') || (isProduction() ? '' : env('TELEGRAM_WEBHOOK_SECRET'))
}

export function getWhatsAppProVerifyToken() {
  return env('WHATSAPP_PRO_VERIFY_TOKEN') || (isProduction() ? '' : env('WHATSAPP_WEBHOOK_SECRET'))
}
