# HairSales separado do painel ROM

Este guia descreve como publicar HairSales (`/pro/*`, `/api/me/*`, `/api/pro/*` e webhooks Pro) em infraestrutura separada do painel ROM da equipe (`/login`, `/hoje`, financeiro, estoque).

Objetivo: isolar banco, segredos, Stripe e webhooks do produto B2C sem quebrar os projetos de unidade que continuam usando o painel ROM.

## 1. Topologia recomendada

| Componente | ROM / unidades | HairSales |
|------------|----------------|-----------|
| Vercel Project | Projeto atual da unidade | Novo projeto Vercel dedicado |
| Neon | `DATABASE_URL` da unidade / painel | Novo Neon project ou branch dedicado |
| Domínio | Ex.: `rom-salao.example.com` | Ex.: `hairsales.example.com` |
| Login principal | `/login` | `/pro/login` |
| Webhooks Pro | Não configurar | Configurar Stripe, Telegram Pro e WhatsApp Pro |
| Crons Vercel | Somente unidade (`avec`, `estoque`, `director-report`) | Pro (`reminders`, `billing/reconcile`) via `deploy/vercel-hairsales.json` |

O ROM `/login` pode continuar nos projetos das unidades. HairSales usa seu próprio projeto Vercel e seu próprio `DATABASE_URL`, apontando para Neon separado.

## 2. Criar o projeto Vercel HairSales

1. Crie um novo Vercel Project a partir do mesmo repositório.
2. Aponte a Production Branch para a branch que contém o app Pro.
3. Defina `NEXT_PUBLIC_APP_URL` para o domínio HairSales final.
4. Não copie variáveis de banco das unidades ROM. Use as variáveis HairSales abaixo.
5. Configure os crons Pro a partir de `deploy/vercel-hairsales.json` (copiando para `vercel.json` no projeto/branch HairSales ou replicando os agendamentos no Vercel dedicado).
6. Configure o domínio HairSales no projeto novo.

## 3. Criar Neon separado

1. Crie um Neon project novo para HairSales ou uma branch Neon dedicada e isolada.
2. Copie a connection string pooled/production.
3. Configure essa string como `DATABASE_URL` apenas no projeto Vercel HairSales.
4. Aplique as migrations Pro listadas em `deploy/SETUP-PRO.md`.
5. Não reutilize o `DATABASE_URL` de unidade ROM em HairSales.
6. Quando o split estiver ativo, rode migrations Pro somente contra este banco HairSales.

## 4. Variáveis obrigatórias no Vercel HairSales

### Base

| Var | Uso |
|-----|-----|
| `DATABASE_URL` | Neon separado do HairSales |
| `PRO_DATA_SECRET` | Sessão Pro e criptografia dos tokens de agenda; gere com `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | URL pública do projeto HairSales |
| `ANTHROPIC_API_KEY` | Assistente Pro / briefing |
| `CRON_SECRET` | Protege rotas cron/automação quando habilitadas |

### Stripe

| Var | Uso |
|-----|-----|
| `STRIPE_SECRET_KEY` | Checkout, assinaturas e Portal |
| `STRIPE_WEBHOOK_SECRET` | Webhook `POST /api/webhooks/stripe` do projeto HairSales |
| `STRIPE_PRICE_STANDARD` | Preço da assinatura Standard |
| `STRIPE_PRICE_PRO` | Preço da assinatura Pro |
| `STRIPE_PORTAL_CONFIGURATION_ID` | Configuração do Customer Portal |

Configure o endpoint Stripe para `https://HAIRSALES_DOMINIO/api/webhooks/stripe`.

### Telegram Pro

| Var | Uso |
|-----|-----|
| `TELEGRAM_PRO_BOT_TOKEN` | Bot do assinante |
| `TELEGRAM_PRO_WEBHOOK_SECRET` | Segredo do webhook Pro |
| `TELEGRAM_PRO_BOT_USERNAME` | Deep links no onboarding |

Configure o webhook para `https://HAIRSALES_DOMINIO/api/webhooks/telegram-pro`.

### WhatsApp Pro

| Var | Uso |
|-----|-----|
| `WHATSAPP_PRO_VERIFY_TOKEN` | Verify token Meta |
| `WHATSAPP_PRO_APP_SECRET` | HMAC `X-Hub-Signature-256` do webhook Meta |
| `META_APP_ID` | Embedded Signup |
| `META_APP_SECRET` | Embedded Signup |
| `META_EMBEDDED_SIGNUP_CONFIG_ID` | Embedded Signup |

Configure o webhook para `https://HAIRSALES_DOMINIO/api/webhooks/whatsapp-pro`.

### Sentry

| Var | Uso |
|-----|-----|
| `SENTRY_DSN` | Captura de erros server/client |
| `SENTRY_AUTH_TOKEN` | Upload de sourcemaps no build, se usado |
| `SENTRY_ORG` | Organização Sentry, se usado |
| `SENTRY_PROJECT` | Projeto Sentry HairSales, se usado |
| `SENTRY_ENVIRONMENT` | Ambiente (`production`, `preview`, etc.), se usado |

Eventos HairSales usam a tag `surface=hairsales`. Quando há assinante autenticado, também enviam `plan`, `subscription_status` e `subscriber_id`.

## 5. Variáveis que não devem vazar dos projetos ROM

- `DATABASE_URL` das unidades ROM.
- Segredos de webhooks ROM (`TELEGRAM_*` de equipe, Avec de unidade, integrações de financeiro/estoque).
- Domínios `NEXT_PUBLIC_APP_URL` de projetos de unidade.

Se uma variável existe para ROM e para HairSales, prefira nomes Pro (`TELEGRAM_PRO_*`, `WHATSAPP_PRO_*`) no projeto HairSales.

## 6. Webhooks e smoke

1. Deploy do projeto HairSales.
2. Configure webhooks externos apontando para o domínio HairSales.
3. Rode:

```bash
npm run verify:pro -- https://HAIRSALES_DOMINIO
```

4. Faça smoke manual:
   - `/pro/login` abre.
   - Checkout Standard/Pro retorna para `/pro/completar-cadastro`.
   - Conta criada entra com cookie Pro.
   - `/pro/conectar` conecta agenda e mostra dados do profissional.
   - Sentry recebe eventos com `surface=hairsales` em falhas controladas de preview.

## 7. ROM continua separado

Os projetos Vercel das unidades podem continuar servindo `/login` e demais telas ROM com seus bancos atuais. Não é necessário mover o painel ROM para o projeto HairSales.

O `vercel.json` da raiz não agenda crons Pro por padrão. Mantenha `/api/pro/reminders` e `/api/pro/billing/reconcile` fora dos projetos de unidade para evitar que reconciliem ou enviem lembretes usando bancos ROM.

Se o mesmo repositório publica ambos, a separação real fica nas variáveis por projeto: cada Vercel Project aponta para seu próprio `DATABASE_URL`, domínio, conjunto de webhooks e arquivo de crons.
