# Relatório diretoria — ROM Brasil

Painel: `/admin/relatorio-diretoria` (somente `ADMIN-BRASIL`).

## Fontes Avec

| Código | Uso |
|--------|-----|
| **0011** | Retorno de clientes por profissional · comparativo trimestre |
| **0021** | Faturamento + ticket médio por profissional · mês a mês |

## Agenda

- Cron Vercel: terça **08:00** America/Sao_Paulo → `POST /api/director-report` (`0 11 * * 2` UTC)
- Auth: `Authorization: Bearer $CRON_SECRET` ou sessão admin

## Preview atual

Sem `AVEC_API_TOKEN` (ou com `?mock=1`), usa:

- Série da planilha **FATURAMENTOVITOR** (Vitor M) como base
- Equipe do portfólio hairstylists 2026 (nomes; IDs Avec quando a planilha oficial chegar)

## Export / envio

- `csv-revenue` — faturamento + ticket (modelo planilha)
- `csv-return` — taxa de retorno por trimestre
- `csv-reactivation` — lista 0011 (Cliente, E-mail, Telefone, Celular, Sexo, Data ultima comanda)

### E-mail

```
DIRECTOR_REPORT_EMAIL=contato.vinicaetano93@gmail.com
RESEND_API_KEY=re_...
DIRECTOR_REPORT_FROM=ROM CLUB BRASIL <onboarding@resend.dev>
```

Sem `RESEND_API_KEY`, o POST ainda envia os CSVs no Telegram da gestão.

### Fixture 0011

Exemplo real Dani Mariniello: `fixtures/avec/0011-dani-mariniello-1tri-2tri-2026.xlsx`  
(lista embutida em `src/lib/director-report/fixtures/0011-dani-mariniello.json`)
