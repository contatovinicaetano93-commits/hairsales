#!/usr/bin/env node
/**
 * Configura (ou atualiza) o Stripe Customer Portal para o app Pro.
 *
 * Uso:
 *   STRIPE_SECRET_KEY=sk_test_... NEXT_PUBLIC_APP_URL=https://seu.app \
 *     npm run stripe:portal
 *
 * Opcional:
 *   STRIPE_PORTAL_CONFIGURATION_ID=bpc_...  # atualiza essa config
 *
 * Imprime o configuration id — salve em STRIPE_PORTAL_CONFIGURATION_ID.
 */
import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY?.trim()
if (!key) {
  console.error('STRIPE_SECRET_KEY é obrigatória')
  process.exit(1)
}

function appBaseUrl() {
  const url =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim()
  if (!url) return 'http://localhost:3000'
  return url.startsWith('http') ? url.replace(/\/$/, '') : `https://${url.replace(/\/$/, '')}`
}

const returnUrl = `${appBaseUrl()}/pro/conectar`
const features = {
  customer_update: {
    enabled: true,
    allowed_updates: ['email', 'name', 'address', 'phone', 'tax_id'],
  },
  invoice_history: { enabled: true },
  payment_method_update: { enabled: true },
  subscription_cancel: {
    enabled: true,
    mode: 'at_period_end',
    cancellation_reason: {
      enabled: true,
      options: ['too_expensive', 'missing_features', 'unused', 'switched_service', 'other'],
    },
  },
  subscription_update: { enabled: false },
}
const business_profile = {
  headline: 'Assistente Vitrini — gerencie sua assinatura Pro',
}

const stripe = new Stripe(key, { apiVersion: '2025-08-27.basil' })

async function main() {
  const configuredId = process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim()
  let result
  let created = false

  if (configuredId) {
    result = await stripe.billingPortal.configurations.update(configuredId, {
      default_return_url: returnUrl,
      business_profile,
      features,
    })
  } else {
    const listed = await stripe.billingPortal.configurations.list({ limit: 20 })
    const existing = listed.data.find((c) => c.is_default) ?? listed.data[0]
    if (existing) {
      result = await stripe.billingPortal.configurations.update(existing.id, {
        default_return_url: returnUrl,
        business_profile,
        features,
      })
    } else {
      result = await stripe.billingPortal.configurations.create({
        default_return_url: returnUrl,
        business_profile,
        features,
      })
      created = true
    }
  }

  console.log(created ? 'Customer Portal criado:' : 'Customer Portal atualizado:')
  console.log(`  id: ${result.id}`)
  console.log(`  default_return_url: ${result.default_return_url}`)
  console.log(`  is_default: ${result.is_default}`)
  console.log('')
  console.log('Adicione ao .env / Vercel:')
  console.log(`  STRIPE_PORTAL_CONFIGURATION_ID=${result.id}`)
  console.log(`  NEXT_PUBLIC_APP_URL=${appBaseUrl()}`)
  console.log('')
  console.log('Dashboard (opcional — branding/legal):')
  console.log('  https://dashboard.stripe.com/test/settings/billing/portal')
}

main().catch((err) => {
  console.error(err?.message || err)
  process.exit(1)
})
