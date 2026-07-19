import * as Sentry from '@sentry/nextjs'
import type { SubscriberRow } from '@/lib/pro/subscribers'

type HairsalesSentrySubscriber =
  | Pick<SubscriberRow, 'id' | 'plan' | 'subscription_status'>
  | {
      id?: string | null
      plan?: string | null
      subscription_status?: string | null
    }
  | null
  | undefined

type HairsalesSentryExtra = Record<string, unknown>

function applyHairsalesScope(
  scope: Sentry.Scope,
  subscriber?: HairsalesSentrySubscriber,
  extra?: HairsalesSentryExtra,
) {
  scope.setTag('surface', 'hairsales')

  if (subscriber?.plan) {
    scope.setTag('plan', subscriber.plan)
  }
  if (subscriber?.subscription_status) {
    scope.setTag('subscription_status', subscriber.subscription_status)
  }
  if (subscriber?.id) {
    scope.setTag('subscriber_id', subscriber.id)
  }

  if (extra && Object.keys(extra).length > 0) {
    scope.setContext('hairsales', extra)
  }
}

export function withHairsalesSentry(
  subscriber?: HairsalesSentrySubscriber,
  extra?: HairsalesSentryExtra,
) {
  const scope = Sentry.getCurrentScope()
  applyHairsalesScope(scope, subscriber, extra)
  return scope
}

export function captureHairsalesException(
  error: unknown,
  subscriber?: HairsalesSentrySubscriber,
  extra?: HairsalesSentryExtra,
) {
  Sentry.withScope((scope) => {
    applyHairsalesScope(scope, subscriber, extra)
    Sentry.captureException(error)
  })
}
