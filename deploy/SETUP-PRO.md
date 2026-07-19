# App Pro (assinante) — checklist de deploy

Path B2C `/pro/*` + APIs `/api/me/*` e `/api/pro/*`.  
Não substitui o painel ROM — só empilha o produto do profissional individual.

Para isolar HairSales do painel ROM em outro Vercel Project/Neon, siga `deploy/HAIRSALES-SEPARATE-DEPLOY.md`.

PR de referência: `cursor/pro-subscriber-app-2182` → base `feat/vitrini-branding`.

## 0. Pré-requisito

- [ ] PR #6 (ou branch Pro) mergeado na branch que o Vercel usa em produção/preview
- [ ] Projeto Vercel + Neon exclusivos (ver `SETUP-GABRIEL-VITRINI.md`)
- [ ] Produção atual sem Pro responde **404** em `/pro/login` até o merge/deploy

## 1. Migrations (Neon)

Aplicar `020`–`028` (já listadas em `db/migrations.json`):

| ID | Arquivo |
|----|---------|
| `020_pro_subscribers` | `delta-pro-subscribers.sql` |
| `021_pro_assistant` | `delta-pro-assistant.sql` |
| `022_pro_whatsapp` | `delta-pro-whatsapp.sql` |
| `023_pro_wa_packs` | `delta-pro-wa-packs.sql` |
| `024_pro_stripe` | `delta-pro-stripe.sql` |
| `025_pro_billing_signup` | `delta-pro-billing-signup.sql` |
| `026_pro_subscription_status` | `delta-pro-subscription-status.sql` |
| `027_pro_billing_events` | `delta-pro-billing-events.sql` |
| `028_pro_session_version` | `delta-pro-session-version.sql` |

Não há migration `029` nesta base. Se a migration de claim/lock de billing ainda não estiver mergeada quando você fizer o deploy, ela deve entrar depois como `029`.

Quando HairSales estiver separado do painel ROM, aplique as migrations Pro somente no `DATABASE_URL` do Neon HairSales. Não rode estas migrations contra bancos das unidades ROM.

```bash
DATABASE_URL=... ROM_PANEL=vitrini npm run db:migrate
```

Ou confiar no boot (`instrumentation`) se `ROM_SKIP_BOOT_MIGRATIONS` **não** estiver `1`.

## 2. Variáveis Vercel (mínimo para /pro subir)

Obrigatórias em **production**:

| Var | Uso |
|-----|-----|
| `DATABASE_URL` | Neon |
| `PRO_DATA_SECRET` | Cookie de sessão + criptografia do token da agenda (`openssl rand -hex 32`); deve ser único e nunca o `CRON_SECRET` |
| `NEXT_PUBLIC_APP_URL` | Return URLs Stripe / links absolutos |
| `ANTHROPIC_API_KEY` | Assistente / briefing |
| `CRON_SECRET` | Protege `/api/pro/reminders` e `/api/pro/billing/reconcile` |

Recomendadas no go-live HairSales (Standard / Pro):

| Var | Uso |
|-----|-----|
| `TELEGRAM_PRO_BOT_TOKEN` | Bot do assinante (Standard+) |
| `TELEGRAM_PRO_WEBHOOK_SECRET` | Webhook `/api/webhooks/telegram-pro` |
| `TELEGRAM_PRO_BOT_USERNAME` | Deep link no Conectar |

Stripe (obrigatório para cobrar assinaturas — pagar antes do cadastro):

| Var | Uso |
|-----|-----|
| `STRIPE_SECRET_KEY` | Checkout + Portal |
| `STRIPE_WEBHOOK_SECRET` | `/api/webhooks/stripe` |
| `STRIPE_PRICE_STANDARD` | Assinatura Standard (R$ 29,90/mês) |
| `STRIPE_PRICE_PRO` | Assinatura Pro (R$ 199,90/mês) |
| `STRIPE_PORTAL_CONFIGURATION_ID` | Saída de `npm run stripe:portal` |

Fluxo: landing → Checkout Stripe → `/pro/completar-cadastro` → conta ativa.  
Painel da equipe (`/login`) continua com acesso normal (sem estes planos).

WhatsApp Cloud (só Pro):

| Var | Uso |
|-----|-----|
| `WHATSAPP_PRO_VERIFY_TOKEN` | Verify do webhook Meta |
| `WHATSAPP_PRO_APP_SECRET` | Verificação HMAC `X-Hub-Signature-256` do POST do webhook Meta |
| `META_APP_ID` / `META_APP_SECRET` / `META_EMBEDDED_SIGNUP_CONFIG_ID` | Embedded Signup (opcional) |

**Não** ligar em production sem necessidade:

- `PRO_ALLOW_SELF_UPGRADE` / `PRO_ALLOW_PACK_PURCHASE` — só demo
- `AVEC_MOCK` / `TRINKS_MOCK` / `WHATSAPP_CLOUD_MOCK` — bloqueados ou inseguros em prod

Template: `deploy/vercel-gabriel-vitrini.env` (seção Pro).

### Atalho via API (token)

```bash
VERCEL_TOKEN=... \
VERCEL_PROJECT=gabriel-vitrini \
NEXT_PUBLIC_APP_URL=https://gabriel-vitrini.vercel.app \
npm run vercel:env-pro
```

Gera `PRO_DATA_SECRET` se não passar um. Opcionais (`STRIPE_*`, `TELEGRAM_PRO_*`, …) só entram se já estiverem no ambiente da shell.

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

## 5. Crons HairSales

O `vercel.json` da raiz fica reservado para crons das unidades ROM (`/api/avec/sync`, `/api/estoque/sync`, `/api/director-report`) e não agenda rotas Pro por padrão.

No projeto Vercel HairSales, use `deploy/vercel-hairsales.json` como fonte dos crons Pro (copie para `vercel.json` na branch/projeto HairSales ou replique os agendamentos no projeto dedicado):

| Path | Schedule | Requer |
|------|----------|--------|
| `/api/pro/reminders` | `0 * * * *` | `CRON_SECRET` |
| `/api/pro/billing/reconcile` | `0 5 * * *` | `CRON_SECRET`, Stripe configurado |

Esses crons devem apontar para o `DATABASE_URL` separado do HairSales, nunca para bancos de unidade ROM.

## 6. Smoke (automático)

Com a URL do preview ou produção **já com o branch Pro**:

```bash
npm run verify:pro -- https://SEU-PREVIEW-OU-DOMINIO
```

Fluxo completo (register → connect mock → onboarding) exige DB migrado e **não** usa mock de agenda em production — use token Avec real ou rode o e2e só em preview/dev:

```bash
# local / preview com AVEC_MOCK permitido
npm test -- src/__tests__/e2e-pro-onboarding.test.ts
```

## 7. Smoke manual (5 min)

1. Abrir `/pro/login` → criar conta  
2. `/pro/conectar` → nome igual à agenda + token Avec (ou `mock` só em preview/dev)  
3. `/pro/hoje` → métricas só desse profissional  
4. Checklist Setup avança (`ready_for_day`)  
5. Assistente responde sem vazar salão  
6. (Pro) WhatsApp / packs / Portal só após Stripe + plano Pro  

## 8. Critérios de “está no ar”

- [ ] `GET /pro/login` → **200** (não 404)
- [ ] `GET /api/me/onboarding` sem cookie → **401**
- [ ] Register + connect devolve sessão `vitrini_pro_session`
- [ ] ROM (`/login`, `/hoje`, financeiro) continua intacto
- [ ] `npm run verify:deploy -- https://SEU-DOMINIO` ainda passa
- [ ] `npm run verify:pro -- https://SEU-DOMINIO` passa
