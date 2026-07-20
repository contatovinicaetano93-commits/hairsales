import { getProBrand } from '@/lib/pro/brand'

/** Mesma lógica de src/lib/pro/stripe.ts:appBaseUrl — duplicada aqui pra não acoplar e-mail ao módulo Stripe. */
function appBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim()
  if (!url) return 'http://localhost:3000'
  return url.startsWith('http') ? url.replace(/\/$/, '') : `https://${url.replace(/\/$/, '')}`
}

interface SendResult {
  ok: boolean
  id?: string
  error?: string
}

async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY não configurado' }

  const from = process.env.PRO_EMAIL_FROM?.trim() || `${getProBrand().name} <onboarding@resend.dev>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    })
    const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string }
    if (!res.ok) return { ok: false, error: json.message ?? `Resend HTTP ${res.status}` }
    return { ok: true, id: json.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

function emailShell(title: string, bodyHtml: string): string {
  const brand = getProBrand()
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#f7f5f0;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1a1714">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fffdf8;border-radius:20px;padding:32px;border:1px solid #e7ddc9">
        <tr><td>
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#a9822f">${brand.productLine}</p>
          <h1 style="margin:8px 0 20px;font-size:22px;font-weight:700;color:#1a1714">${title}</h1>
          ${bodyHtml}
          <p style="margin-top:28px;font-size:12px;color:#8a8272">${brand.name} · ${brand.tagline}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

/** Fire-and-forget — nunca lança. Falha de e-mail nunca deve travar cadastro/reset. */
export async function sendWelcomeEmail(to: string, displayName: string): Promise<SendResult> {
  const brand = getProBrand()
  const loginUrl = `${appBaseUrl()}/pro/login`
  const html = emailShell(
    `Bem-vindo(a) ao ${brand.name}, ${displayName.split(' ')[0]}!`,
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#3a352c">
      Sua conta foi criada. Agora é conectar sua agenda (Avec ou Trinks) pra começar a acompanhar
      seu dia a dia, definir sua meta e falar com a assistente de IA.
    </p>
    <a href="${loginUrl}" style="display:inline-block;background:#c9a13b;color:#1a1714;font-weight:700;font-size:14px;padding:12px 20px;border-radius:12px;text-decoration:none">
      Entrar no ${brand.name}
    </a>`,
  )
  return sendEmail(to, `Bem-vindo(a) ao ${brand.name}`, html)
}

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<SendResult> {
  const brand = getProBrand()
  const resetUrl = `${appBaseUrl()}/pro/redefinir-senha?token=${encodeURIComponent(resetToken)}`
  const html = emailShell(
    'Redefinir sua senha',
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#3a352c">
      Pediram a redefinição da senha da sua conta ${brand.name}. Se não foi você, ignore este
      e-mail — sua senha continua a mesma. O link abaixo expira em 1 hora.
    </p>
    <a href="${resetUrl}" style="display:inline-block;background:#c9a13b;color:#1a1714;font-weight:700;font-size:14px;padding:12px 20px;border-radius:12px;text-decoration:none">
      Redefinir senha
    </a>`,
  )
  return sendEmail(to, `Redefinir senha · ${brand.name}`, html)
}
