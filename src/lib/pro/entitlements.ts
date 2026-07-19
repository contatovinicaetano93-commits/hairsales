import type { SubscriberPlan, SubscriptionStatus } from '@/lib/pro/subscribers'

export type Capability =
  | 'assistant'
  | 'telegram'
  | 'whatsapp_cloud'
  | 'marketing_packs'
  | 'agenda_sync'
  | 'billing_portal'

export interface EntitledSubscriber {
  plan: SubscriberPlan
  subscription_status: SubscriptionStatus
  stripe_customer_id?: string | null
}

export type EntitlementResult =
  | { ok: true }
  | { ok: false; capability: Capability; message: string }

export class EntitlementError extends Error {
  readonly capability: Capability

  constructor(capability: Capability, message: string) {
    super(message)
    this.name = 'EntitlementError'
    this.capability = capability
  }
}

function hasActiveOrDemoStatus(subscriber: EntitledSubscriber): boolean {
  if (subscriber.subscription_status === 'active') return true
  if (subscriber.subscription_status !== 'none') return false
  return (
    process.env.NODE_ENV !== 'production' ||
    process.env.PRO_ALLOW_DEMO_ENTITLEMENTS?.trim() === '1'
  )
}

function isStandardKeepAlive(subscriber: EntitledSubscriber): boolean {
  return (
    subscriber.plan === 'standard' &&
    (subscriber.subscription_status === 'canceled' ||
      subscriber.subscription_status === 'past_due')
  )
}

function hasStripeCustomer(subscriber: EntitledSubscriber): boolean {
  return Boolean(subscriber.stripe_customer_id?.trim())
}

export function can(subscriber: EntitledSubscriber, capability: Capability): boolean {
  switch (capability) {
    case 'assistant':
    case 'agenda_sync':
      return hasActiveOrDemoStatus(subscriber) || isStandardKeepAlive(subscriber)
    case 'telegram':
      return hasActiveOrDemoStatus(subscriber)
    case 'whatsapp_cloud':
    case 'marketing_packs':
      return subscriber.plan === 'pro' && subscriber.subscription_status === 'active'
    case 'billing_portal':
      return hasStripeCustomer(subscriber)
    default: {
      const exhaustive: never = capability
      throw new Error(`Capacidade inválida: ${exhaustive}`)
    }
  }
}

export function entitlementMessage(capability: Capability): string {
  switch (capability) {
    case 'assistant':
      return 'Assistente indisponível para esta assinatura.'
    case 'telegram':
      return 'Telegram requer plano Standard ou Pro ativo.'
    case 'agenda_sync':
      return 'Sincronização de agenda indisponível para esta assinatura.'
    case 'whatsapp_cloud':
      return 'WhatsApp Cloud API está disponível apenas no plano Pro ativo.'
    case 'marketing_packs':
      return 'Packs de marketing estão disponíveis apenas no plano Pro ativo.'
    case 'billing_portal':
      return 'Portal de cobrança indisponível sem cliente Stripe.'
    default: {
      const exhaustive: never = capability
      throw new Error(`Capacidade inválida: ${exhaustive}`)
    }
  }
}

export function checkCan(
  subscriber: EntitledSubscriber,
  capability: Capability,
): EntitlementResult {
  if (can(subscriber, capability)) return { ok: true }
  return { ok: false, capability, message: entitlementMessage(capability) }
}

export function assertCan(
  subscriber: EntitledSubscriber,
  capability: Capability,
): void {
  const result = checkCan(subscriber, capability)
  if (!result.ok) {
    throw new EntitlementError(result.capability, result.message)
  }
}
