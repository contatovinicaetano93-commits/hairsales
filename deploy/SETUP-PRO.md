# App Pro (assinante) — checklist de deploy

Path B2C `/pro/*` + APIs `/api/me/*` e `/api/pro/*`.  
Não substitui o painel ROM — só empilha o produto do profissional individual.

PR de referência: `cursor/pro-subscriber-app-2182` → base `feat/vitrini-branding`.

## 0. Pré-requisito

- [ ] PR #6 (ou branch Pro) mergeado na branch que o Vercel usa em produção/preview
- [ ] Projeto Vercel + Neon exclusivos (ver `SETUP-GABRIEL-VITRINI.md`)
- [ ] Produção atual sem Pro responde **404** em `/pro/login` até o merge/deploy

## 1. Migrations (Neon)

Aplicar `020`–`024` (já listadas em `db/migrations.json`):

| ID | Arquivo |
|----|---------|
| `020_pro_subscribers` | `delta-pro-subscribers.sql` |
| `021_pro_assistant` | `delta-pro-assistant.sql` |
| `022_pro_whatsapp` | `delta-pro-whatsapp.sql` |
| `023_pro_wa_packs` | `delta-pro-wa-packs.sql` |
| `024_pro_stripe` | `delta-pro-stripe.sql` |

```bash
DATABASE_URL=... ROM_PANEL=vitrini npm run db:migrate
```

Ou confiar no boot (`instrumentation`) se `ROM_SKIP_BOOT_MIGRATIONS` **não** estiver `1`.

## 2. Variáveis Vercel (mínimo para /pro subir)

Obrigatórias em **production**:

| Var | Uso |
|-----|-----|
| `DATABASE_URL` | Neon |
| `PRO_DATA_SECRET` | Cookie de sessão + criptografia do token da agenda (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_APP_URL` | Return URLs Stripe / links absolutos |
| `ANTHROPIC_API_KEY` | Assistente / briefing |

Recomendadas no primeiro go-live Free:

| Var | Uso |
|-----|-----|
| `TELEGRAM_PRO_BOT_TOKEN` | Bot do assinante |
| `TELEGRAM_PRO_WEBHOOK_SECRET` | Webhook `/api/webhooks/telegram-pro` |
| `TELEGRAM_PRO_BOT_USERNAME` | Deep link no Conectar |

Stripe (quando for cobrar):

| Var | Uso |
|-----|-----|
| `STRIPE_SECRET_KEY` | Checkout + Portal |
| `STRIPE_WEBHOOK_SECRET` | `/api/webhooks/stripe` |
| `STRIPE_PRICE_PRO` | Assinatura Pro |
| `STRIPE_PORTAL_CONFIGURATION_ID` | Saída de `npm run stripe:portal` |

WhatsApp Cloud (só Pro):

| Var | Uso |
|-----|-----|
| `WHATSAPP_PRO_VERIFY_TOKEN` | Verify do webhook Meta |
| `META_APP_ID` / `META_APP_SECRET` / `META_EMBEDDED_SIGNUP_CONFIG_ID` | Embedded Signup (opcional) |

**Não** ligar em production sem necessidade:

- `PRO_ALLOW_SELF_UPGRADE` / `PRO_ALLOW_PACK_PURCHASE` — só demo
- `AVEC_MOCK` / `TRINKS_MOCK` / `WHATSAPP_CLOUD_MOCK` — bloqueados ou inseguros em prod

Template: `deploy/vercel-gabriel-vitrini.env` (seção Pro).

## 3. Stripe Customer Portal

```bash
STRIPE_SECRET_KEY=sk_live_ou_test_... \
NEXT_PUBLIC_APP_URL=https://SEU-DOMINIO \
npm run stripe:portal
```

- [ ] Copiar `STRIPE_PORTAL_CONFIGURATION_ID` para o Vercel
- [ ] Webhook Stripe → `https://SEU-DOMINIO/api/webhooks/stripe` (`checkout.session.completed`)
- [ ] Branding opcional: [Customer portal](https://dashboard.stripe.com/settings/billing/portal)

## 4. Webhooks externos

Após o domínio no ar:

- Telegram Pro: `https://SEU-DOMINIO/api/webhooks/telegram-pro`
- WhatsApp Pro: `https://SEU-DOMINIO/api/webhooks/whatsapp-pro`
- Stripe: `https://SEU-DOMINIO/api/webhooks/stripe`

## 5. Smoke (automático)

Com a URL do preview ou produção **já com o branch Pro**:

```bash
npm run verify:pro -- https://SEU-PREVIEW-OU-DOMINIO
```

Fluxo completo (register → connect mock → onboarding) exige DB migrado e **não** usa mock de agenda em production — use token Avec real ou rode o e2e só em preview/dev:

```bash
# local / preview com AVEC_MOCK permitido
npm test -- src/__tests__/e2e-pro-onboarding.test.ts
```

## 6. Smoke manual (5 min)

1. Abrir `/pro/login` → criar conta  
2. `/pro/conectar` → nome igual à agenda + token Avec (ou `mock` só em preview/dev)  
3. `/pro/hoje` → métricas só desse profissional  
4. Checklist Setup avança (`ready_for_day`)  
5. Assistente responde sem vazar salão  
6. (Pro) WhatsApp / packs / Portal só após Stripe + plano Pro  

## 7. Critérios de “está no ar”

- [ ] `GET /pro/login` → **200** (não 404)
- [ ] `GET /api/me/onboarding` sem cookie → **401**
- [ ] Register + connect devolve sessão `vitrini_pro_session`
- [ ] ROM (`/login`, `/hoje`, financeiro) continua intacto
- [ ] `npm run verify:deploy -- https://SEU-DOMINIO` ainda passa
- [ ] `npm run verify:pro -- https://SEU-DOMINIO` passa
