const DEV_PRO_DATA_SECRET = 'dev-pro-data-secret-not-for-production'

export function getProDataSecret() {
  const secret = process.env.PRO_DATA_SECRET?.trim()
  if (secret) return secret

  if (process.env.NODE_ENV === 'production') {
    throw new Error('PRO_DATA_SECRET é obrigatório em produção para o app do profissional')
  }

  return DEV_PRO_DATA_SECRET
}

export function getWhatsAppProAppSecret() {
  return process.env.WHATSAPP_PRO_APP_SECRET?.trim() || process.env.WHATSAPP_APP_SECRET?.trim() || ''
}
