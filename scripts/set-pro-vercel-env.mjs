#!/usr/bin/env node
/**
 * Define as variáveis mínimas do app Pro no projeto Vercel.
 *
 * Uso:
 *   VERCEL_TOKEN=... \
 *   VERCEL_PROJECT=gabriel-vitrini \
 *   NEXT_PUBLIC_APP_URL=https://gabriel-vitrini.vercel.app \
 *   npm run vercel:env-pro
 *
 * Opcional: PRO_DATA_SECRET=... (senão gera um e imprime uma vez)
 * Escopos: production + preview (default). Só production: VERCEL_ENV_TARGETS=production
 *
 * Docs: https://vercel.com/docs/rest-api/reference/endpoints/projects/create-one-or-more-environment-variables
 */
import { randomBytes } from 'crypto'

const token = process.env.VERCEL_TOKEN?.trim()
const project = process.env.VERCEL_PROJECT?.trim() || 'gabriel-vitrini'
const teamId = process.env.VERCEL_TEAM_ID?.trim() || process.env.VERCEL_ORG_ID?.trim()
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://gabriel-vitrini.vercel.app'
const targets = (process.env.VERCEL_ENV_TARGETS || 'production,preview')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

if (!token) {
  console.error('VERCEL_TOKEN é obrigatório (Account Settings → Tokens).')
  process.exit(1)
}

const proDataSecret =
  process.env.PRO_DATA_SECRET?.trim() || randomBytes(32).toString('hex')
const generatedSecret = !process.env.PRO_DATA_SECRET?.trim()

const vars = [
  { key: 'PRO_DATA_SECRET', value: proDataSecret, target: targets, type: 'encrypted' },
  { key: 'NEXT_PUBLIC_APP_URL', value: appUrl, target: targets, type: 'plain' },
]

// Opcionais — só envia se já estiverem no ambiente local
const optional = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_PRO',
  'STRIPE_PORTAL_CONFIGURATION_ID',
  'TELEGRAM_PRO_BOT_TOKEN',
  'TELEGRAM_PRO_WEBHOOK_SECRET',
  'TELEGRAM_PRO_BOT_USERNAME',
  'WHATSAPP_PRO_VERIFY_TOKEN',
  'ANTHROPIC_API_KEY',
]
for (const key of optional) {
  const value = process.env[key]?.trim()
  if (value) {
    vars.push({
      key,
      value,
      target: targets,
      type: key.startsWith('NEXT_PUBLIC_') ? 'plain' : 'encrypted',
    })
  }
}

async function api(path, init = {}) {
  const url = new URL(`https://api.vercel.com${path}`)
  if (teamId) url.searchParams.set('teamId', teamId)
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }
  if (!res.ok) {
    const msg = body?.error?.message || body?.message || text || res.statusText
    throw new Error(`${init.method || 'GET'} ${path} → ${res.status}: ${msg}`)
  }
  return body
}

async function upsertEnv(entry) {
  // Remove existing on same targets then create (API não faz upsert limpo)
  const listed = await api(`/v9/projects/${encodeURIComponent(project)}/env`)
  const existing = (listed?.envs || []).filter((e) => e.key === entry.key)
  for (const env of existing) {
    const overlap = (env.target || []).some((t) => entry.target.includes(t))
    if (overlap) {
      await api(`/v9/projects/${encodeURIComponent(project)}/env/${env.id}`, {
        method: 'DELETE',
      })
      console.log(`  removed old ${entry.key} (${(env.target || []).join(',')})`)
    }
  }
  await api(`/v10/projects/${encodeURIComponent(project)}/env`, {
    method: 'POST',
    body: JSON.stringify(entry),
  })
  console.log(`  set ${entry.key} → [${entry.target.join(', ')}]`)
}

async function main() {
  console.log(`Projeto: ${project}${teamId ? ` (team ${teamId})` : ''}`)
  console.log(`Targets: ${targets.join(', ')}`)
  console.log(`App URL: ${appUrl}`)
  console.log('')

  // Resolve project exists
  await api(`/v9/projects/${encodeURIComponent(project)}`)

  for (const entry of vars) {
    await upsertEnv(entry)
  }

  console.log('')
  console.log('OK — variáveis Pro definidas.')
  if (generatedSecret) {
    console.log('')
    console.log('PRO_DATA_SECRET gerado (guarde em local seguro):')
    console.log(`  ${proDataSecret}`)
  }
  console.log('')
  console.log('Próximo: redeploy + npm run verify:pro -- ' + appUrl)
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
