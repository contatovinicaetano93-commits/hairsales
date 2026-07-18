# GABRIEL VITRINI — Operação do salão

Sistema interno do salão Gabriel Vitrini: recebe contatos de clientes por
WhatsApp (IA de primeiro atendimento), Telegram (secretária de consulta prática
pra equipe) e Avec (sync de agenda/clientes), e centraliza tudo num painel de
KPIs, financeiro, estoque, contatos e treinamento.

Stack: Next.js (App Router) + TypeScript + Tailwind + Neon (Postgres serverless),
API-first (front-end só fala com `/api/*`). Acesso ao banco por SQL direto
(`@neondatabase/serverless`).

**Interface adaptativa:** mobile-first no celular (bottom bar, drawer) e layout
desktop completo a partir de `lg` (sidebar fixa, conteúdo em largura total até
1600px, painel em duas colunas).

## Como funciona

- `src/app/api/webhooks/avec` — **tempo real** (push): agendamento, atendimento, cliente.
  Header `x-avec-secret` = `AVEC_WEBHOOK_SECRET`.
- `src/app/api/avec/sync` — sync de backup com a API de Relatórios Avec
  (clientes `0004`, agendamentos `0051`, atendidos `0002`). Cron fast a cada 5 min,
  full a cada 10 min, ou tempo real via webhook. Manual com `CRON_SECRET`.
- `src/app/api/webhooks/whatsapp` — recebe mensagem do provedor WhatsApp
  (Evolution API), responde com IA (primeiro atendimento guiado) e loga tudo.
- `src/app/api/webhooks/telegram` — bot "secretária": equipe pergunta em
  linguagem natural, a IA responde puxando os KPIs do Neon.
- `src/app/dashboard` — painel com contatos por dia, por canal, por status e
  taxa de conversão.
- `src/app/contatos` — lista dos últimos contatos (todos os canais) e formulário
  pra registrar contato manual (`GET`/`POST /api/contacts`).
- `src/lib/whatsapp/adapter.ts` — interface de mensageria. Hoje implementada
  com Evolution API; trocar para WhatsApp Cloud API oficial no futuro é só
  implementar a interface de novo, sem mexer no resto.

Resiliência: todo evento (mensagem recebida, resposta da IA, erro) vira uma
linha em `contact_events` — nada se perde silenciosamente, dá pra reprocessar
ou investigar depois.

## Configuração pendente

O Neon e o projeto Vercel devem ser exclusivos desta instância. Siga
`deploy/SETUP-GABRIEL-VITRINI.md` e use `deploy/vercel-gabriel-vitrini.env`.

1. Preencher cidade/unidade, endereço, telefone e roster do Gabriel Vitrini.
2. Rodar o pipeline `npm run db:migrate` no Neon dedicado.
3. **Claude (Anthropic)** — `ANTHROPIC_API_KEY` em [console.anthropic.com](https://console.anthropic.com)
   para briefings IA, WhatsApp e Telegram. Modelo padrão: `claude-sonnet-4-20250514`.
4. **Avec** — gerar `AVEC_API_TOKEN` no painel Avec. A URL padrão já é
   `https://api.avec.beauty` ([documentação Postman](https://documenter.getpostman.com/view/12527228/2sA2xmUWJo)).
   Tempo real: `AVEC_WEBHOOK_SECRET` + URL `/api/webhooks/avec`. Backup: `CRON_SECRET` (cron fast 5 min + full 10 min).
5. **Decidir o provedor de WhatsApp**: Evolution API (rápido, roda em minutos,
   mas usa número real em modo não-oficial) ou WhatsApp Cloud API oficial
   (mais lento pra configurar — verificação Meta Business — porém mais
   resiliente a longo prazo). O código já está pronto pros dois, só falta a
   decisão + credenciais.
6. **Criar um bot Telegram dedicado ao Gabriel Vitrini** via `@BotFather` (2 min, token na
   hora) e configurar o `setWebhook` apontando para
   `/api/webhooks/telegram` com um `secret_token`.
7. Preencher `.env.local` com base no `.env.example`.
8. **Produção:** configure `ROM_ADMIN_PASSWORD`, `ROM_STAFF_USER` / `ROM_STAFF_PASSWORD`
   (funcionário: painel sem faturamento), `CRON_SECRET`, `WHATSAPP_WEBHOOK_SECRET`
   e `TELEGRAM_STAFF_CHAT_IDS` — sem eles, webhooks e sync ficam bloqueados em produção.

## App Pro (assinante B2C)

Path `/pro/*` — profissional individual (não o salão). Conectar agenda (Avec/Trinks),
assistente com cotas, Telegram no Free, WhatsApp Cloud no Pro.

### Stripe Customer Portal

1. Crie produto/preço da assinatura Pro e defina `STRIPE_PRICE_PRO`.
2. Webhook `checkout.session.completed` → `/api/webhooks/stripe` (`STRIPE_WEBHOOK_SECRET`).
3. Configure o portal (return URL `{NEXT_PUBLIC_APP_URL}/pro/conectar`):

```bash
STRIPE_SECRET_KEY=sk_test_... NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run stripe:portal
```

4. Salve o `STRIPE_PORTAL_CONFIGURATION_ID` impresso no `.env` / Vercel.
5. Branding/legal opcional no Dashboard:
   [Settings → Billing → Customer portal](https://dashboard.stripe.com/test/settings/billing/portal).

Botão **Gerenciar cobrança** em `/pro/conectar` após a primeira compra (quando há `stripe_customer_id`).

### Deploy e smoke Pro

Checklist completo: **`deploy/SETUP-PRO.md`**.

```bash
# ROM + presença do /pro
npm run verify:deploy -- https://SEU-DOMINIO

# Smoke dedicado do assinante
npm run verify:pro -- https://SEU-PREVIEW-OU-DOMINIO

# Fluxo register→connect (só preview/dev com mock)
PRO_SMOKE_FULL=1 npm run verify:pro -- http://localhost:3000
```

### E2E do setup Pro

Com `npm run dev` + Neon migrado (`020`–`024`):

```bash
npm test -- src/__tests__/e2e-pro-onboarding.test.ts
```

Sem servidor/DB o teste faz skip. Unitário do checklist: `src/lib/pro/onboarding.test.ts`.

## Rodando local

```bash
npm install
cp .env.example .env.local   # preencher as chaves
npm run dev
```
