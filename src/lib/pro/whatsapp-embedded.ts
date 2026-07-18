/**
 * Meta Embedded Signup — configuração + troca de código por token.
 * Requer META_APP_ID, META_APP_SECRET, META_EMBEDDED_SIGNUP_CONFIG_ID.
 * Docs: https://developers.facebook.com/docs/whatsapp/embedded-signup
 */

const GRAPH = 'https://graph.facebook.com/v21.0'

export function getEmbeddedSignupConfig() {
  const appId = process.env.META_APP_ID?.trim() || process.env.NEXT_PUBLIC_META_APP_ID?.trim()
  const configId = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID?.trim()
  const appSecret = Boolean(process.env.META_APP_SECRET?.trim())
  const enabled = Boolean(appId && configId && appSecret)

  const missing: string[] = []
  if (!appId) missing.push('META_APP_ID')
  if (!configId) missing.push('META_EMBEDDED_SIGNUP_CONFIG_ID')
  if (!appSecret) missing.push('META_APP_SECRET')

  return {
    enabled,
    app_id: appId || null,
    config_id: configId || null,
    graph_version: 'v21.0',
    feature_type: 'whatsapp_business_app_onboarding',
    missing_env: missing,
    setup_hint:
      missing.length === 0
        ? 'Pronto — use o botão Conectar com Meta.'
        : `Configure no ambiente: ${missing.join(', ')}. Enquanto isso, use phone_number_id + token manual.`,
  }
}

export async function exchangeEmbeddedSignupCode(code: string): Promise<{
  access_token: string
  phone_number_id: string | null
  waba_id: string | null
}> {
  const appId = process.env.META_APP_ID?.trim()
  const appSecret = process.env.META_APP_SECRET?.trim()
  if (!appId || !appSecret) {
    throw new Error('META_APP_ID / META_APP_SECRET não configurados')
  }

  const tokenUrl = new URL(`${GRAPH}/oauth/access_token`)
  tokenUrl.searchParams.set('client_id', appId)
  tokenUrl.searchParams.set('client_secret', appSecret)
  tokenUrl.searchParams.set('code', code)

  const tokenRes = await fetch(tokenUrl.toString(), { cache: 'no-store' })
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string
    error?: { message?: string }
  }
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error?.message ?? 'Falha ao trocar code Embedded Signup')
  }

  const accessToken = tokenJson.access_token

  // Descobre WABA + phone number do token
  let wabaId: string | null = null
  let phoneNumberId: string | null = null

  try {
    const debugUrl = new URL(`${GRAPH}/debug_token`)
    debugUrl.searchParams.set('input_token', accessToken)
    debugUrl.searchParams.set('access_token', `${appId}|${appSecret}`)
    const debugRes = await fetch(debugUrl.toString(), { cache: 'no-store' })
    const debugJson = (await debugRes.json()) as {
      data?: { granular_scopes?: Array<{ scope: string; target_ids?: string[] }> }
    }
    const wabaScope = debugJson.data?.granular_scopes?.find((s) =>
      s.scope?.includes('whatsapp_business'),
    )
    wabaId = wabaScope?.target_ids?.[0] ?? null

    if (wabaId) {
      const phonesRes = await fetch(
        `${GRAPH}/${wabaId}/phone_numbers?access_token=${encodeURIComponent(accessToken)}`,
        { cache: 'no-store' },
      )
      const phonesJson = (await phonesRes.json()) as {
        data?: Array<{ id?: string }>
      }
      phoneNumberId = phonesJson.data?.[0]?.id ?? null
    }
  } catch {
    // Token ok mesmo se discovery falhar — usuário completa manualmente
  }

  return { access_token: accessToken, phone_number_id: phoneNumberId, waba_id: wabaId }
}
