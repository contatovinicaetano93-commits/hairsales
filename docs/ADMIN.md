# Admin & Operações

## Ativação Manual de Assinantes (Pix/Transferência)

Enquanto o Stripe não está configurado, use esta rota para ativar clientes que pagaram via Pix/transferência.

### Endpoint

```
POST /api/pro/admin/manual-activate
Authorization: x-admin-secret: <PRO_ADMIN_SECRET>
Content-Type: application/json
```

### Payload

```json
{
  "display_name": "Nome Completo",
  "email": "cliente@example.com",
  "plan": "standard"
}
```

Campos:
- `display_name` (string, opcional se assinante já existe): nome do cliente.
- `email` (string, obrigatório): e-mail único.
- `plan` (string, padrão "standard"): `"standard"` ou `"pro"`.

### Resposta (201 ou 200)

```json
{
  "data": {
    "id": "uuid",
    "email": "cliente@example.com",
    "plan": "standard",
    "subscription_status": "active",
    "created": true
  },
  "meta": null
}
```

### Comportamento

1. **Novo cliente**: cria conta como `active`, envia e-mail de boas-vindas + link de reset de senha (1h de validade).
2. **Cliente existente**: reativa para o plano/status especificado, reenvia apenas o link de reset de senha.
3. **Webhook de e-mail**: ambos os e-mails são fire-and-forget (nunca travam a ativação se Resend falhar).

### Exemplo

```bash
curl -X POST http://localhost:3002/api/pro/admin/manual-activate \
  -H "x-admin-secret: $PRO_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Marina Silva",
    "email": "marina@example.com",
    "plan": "pro"
  }'
```

### Autenticação

O secret `PRO_ADMIN_SECRET` deve estar configurado em produção nas env vars da Vercel. Use `openssl rand -hex 24` para gerar um novo.

### Limites

- 20 ativações por minuto por IP.
- Senha inicial é gerada aleatoriamente (cliente recebe link pra redefinir).

### Roadmap

Quando o Stripe estiver configurado, este endpoint se tornará obsoleto (checkout automático).
