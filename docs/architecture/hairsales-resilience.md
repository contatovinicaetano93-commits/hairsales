# HairSales resilience target state

Checklist for keeping HairSales isolated, observable and safe as the Pro product matures.

## Entitlements

- [x] Every paid feature checks subscriber entitlements from durable data, not only client state.
- [ ] Plan checks use the same plan catalog as checkout and billing.
- [x] Downgrade/cancel paths remove or suspend Pro-only access without deleting subscriber history.
- [x] Webhook-driven entitlement changes are idempotent.

## Billing events

- [x] Stripe webhook events are persisted in `subscriber_billing_events` before side effects.
- [x] Event processing deduplicates by Stripe event id.
- [ ] Subscription create/update/delete paths record the previous and next subscription state.
- [x] Failed billing side effects surface in Sentry with `surface=hairsales`.

## Atomic quotas

- [ ] Assistant and WhatsApp usage consume quotas with one atomic database statement.
- [x] Quota reset windows are computed server-side.
- [ ] Failed downstream calls do not consume quota unless the user-visible action succeeded.
- [x] Quota errors are user-safe and do not reveal other subscribers' data.

## Session version

- [x] Subscriber sessions include a `session_version`.
- [ ] Password resets, forced logout and account security events increment `session_version`.
- [x] Auth middleware rejects stale session versions.
- [x] Session cookies stay scoped to the HairSales project/domain.

## Observability

- [x] HairSales exceptions use Sentry tag `surface=hairsales`.
- [x] Subscriber-scoped exceptions tag `subscriber_id`, `plan` and `subscription_status` when available.
- [ ] Funnel milestones emit structured logs for checkout start, signup completion and agenda connection.
- [ ] Separate HairSales deploys use a distinct Sentry project or environment from ROM.
