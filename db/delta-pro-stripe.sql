-- Stripe: sessões de checkout dos packs marketing (+ opcional assinatura Pro).

alter table subscriber_whatsapp_pack_purchases
  add column if not exists stripe_session_id text;

alter table subscriber_whatsapp_pack_purchases
  add column if not exists stripe_payment_intent text;

alter table subscriber_whatsapp_pack_purchases
  add column if not exists provider text not null default 'demo';

create unique index if not exists subscriber_whatsapp_pack_purchases_stripe_session_idx
  on subscriber_whatsapp_pack_purchases (stripe_session_id)
  where stripe_session_id is not null;

alter table subscribers
  add column if not exists stripe_customer_id text;

create unique index if not exists subscribers_stripe_customer_idx
  on subscribers (stripe_customer_id)
  where stripe_customer_id is not null;
