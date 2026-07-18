# GABRIEL VITRINI — deploy independente

Instância isolada, com repositório, projeto Vercel, banco Neon e credenciais próprios.

## 1. Dados pendentes

- [ ] Cidade/unidade para substituir `CIDADE A DEFINIR` em `src/lib/brand.ts`
- [ ] Domínio, endereço e telefone
- [ ] Profissionais e IDs Avec para o relatório de diretoria
- [ ] `AVEC_UNIT_ID` e token da unidade
- [ ] Usuários e senhas de admin, equipe, financeiro e estoque
- [ ] Número/instância WhatsApp e bots Telegram
- [ ] Destinatário e remetente do relatório de diretoria

## 2. Neon exclusivo

1. Criar o projeto `gabriel-vitrini` no Neon.
2. Copiar a connection string somente para `DATABASE_URL` desta instância.
3. Não executar seeds Brasil/Iguatemi. O preset `vitrini` começa sem contatos.

O schema é aplicado pelo pipeline versionado em `db/migrations.json`:

```bash
npm run db:migrate
```

No primeiro deploy, confirme também em `/admin` ou execute, autenticado:

```text
POST /api/admin/migrations
```

O boot executa migrations pendentes por padrão. Não configure
`ROM_SKIP_BOOT_MIGRATIONS=1` no primeiro deploy.

## 3. Vercel exclusivo

1. Importar o repositório `gabriel-vitrini` em um projeto Vercel novo.
2. Usar `gabriel-vitrini` como nome do projeto.
3. Cadastrar as variáveis de `deploy/vercel-gabriel-vitrini.env`.
4. Gerar credenciais e segredos novos; nunca copiar valores de outra unidade.
5. Fazer o primeiro deploy e associar o domínio.

## 4. Primeiro acesso

1. Abrir `/login` com o admin próprio.
2. Em `/admin`, confirmar `painel=vitrini` e revisar os avisos.
3. Rodar migrations e verificar que o banco está vazio.
4. Cadastrar dados reais manualmente ou sincronizar a unidade Avec correta.
5. Adicionar os vídeos e pilares de onboarding do Gabriel Vitrini.

## 5. Integrações

- WhatsApp: `https://SEU-DOMINIO/api/webhooks/whatsapp`
- Telegram: `https://SEU-DOMINIO/api/webhooks/telegram`
- Avec: `https://SEU-DOMINIO/api/webhooks/avec`

Use os respectivos segredos exclusivos nos headers/configurações de webhook.

## 6. Checklist de validação

- [ ] Login exibe apenas GABRIEL VITRINI e o tema claro
- [ ] `/hoje` exibe o painel Vitrini sem dados de outras unidades
- [ ] `/admin` mostra `painel=vitrini`
- [ ] `DATABASE_URL` aponta para o Neon exclusivo
- [ ] Migrations de `db/migrations.json` estão concluídas
- [ ] Preset `vitrini` não cria contatos fictícios
- [ ] Avec está limitado ao `AVEC_UNIT_ID` correto
- [ ] Financeiro, estoque, contatos e onboarding respeitam as roles
- [ ] CRON, WhatsApp e Telegram usam segredos próprios
- [ ] `npm run verify:deploy -- https://SEU-DOMINIO` passa

## 7. App Pro (assinante)

Depois do painel ROM estável, siga **`deploy/SETUP-PRO.md`** (migrations `020`–`024`,
`PRO_DATA_SECRET`, Stripe Portal, smoke `npm run verify:pro`).
