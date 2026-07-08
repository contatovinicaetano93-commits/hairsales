// Cliente HTTP da API de Relatórios Avec.
// Docs: https://documenter.getpostman.com/view/12527228/2sA2xmUWJo
// Base oficial (collection Postman): https://api.avec.beauty
// Auth: header Authorization = token puro (sem "Bearer").

import { getMockReport } from '@/lib/avec/fixtures'

export const AVEC_DEFAULT_API_URL = 'https://api.avec.beauty'

export function isAvecMock() {
  const v = process.env.AVEC_MOCK
  return v === '1' || v === 'true'
}

export interface AvecReportParams {
  page?: number
  limit?: number
  inicio?: string
  fim?: string
  site?: string
  profissional_id?: string
  [key: string]: string | number | undefined
}

function getConfig() {
  const baseUrl = getAvecBaseUrl()
  const token = process.env.AVEC_API_TOKEN
  if (!token) {
    throw new Error('AVEC_API_TOKEN é obrigatório para sync com Avec')
  }
  return { baseUrl, token }
}

export function getAvecBaseUrl() {
  return (process.env.AVEC_API_URL ?? AVEC_DEFAULT_API_URL).replace(/\/$/, '')
}

export function isAvecConfigured() {
  return Boolean(process.env.AVEC_API_TOKEN) || isAvecMock()
}

export async function testAvecConnection() {
  if (!isAvecConfigured()) {
    return { ok: false as const, baseUrl: getAvecBaseUrl(), error: 'AVEC_API_TOKEN não configurado' }
  }
  if (isAvecMock()) {
    const payload = await fetchAvecReport('0004', { page: 1, limit: 1 })
    const rows = extractRows(payload)
    return { ok: true as const, baseUrl: getAvecBaseUrl(), sample_rows: rows.length, mock: true as const }
  }
  try {
    const payload = await fetchAvecReport('0004', { page: 1, limit: 1 })
    const rows = extractRows(payload)
    return { ok: true as const, baseUrl: getAvecBaseUrl(), sample_rows: rows.length }
  } catch (e) {
    return {
      ok: false as const,
      baseUrl: getAvecBaseUrl(),
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

// Formata datas no padrão dd/mm/yyyy usado pelos relatórios Avec.
export function fmtAvecDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export function periodRange(daysBack = 0, daysForward = 14) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - daysBack)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  end.setDate(end.getDate() + daysForward)
  return { inicio: fmtAvecDate(start), fim: fmtAvecDate(end) }
}

// Extrai linhas do JSON de relatório — formato varia por endpoint.
export function extractRows(payload: unknown): Record<string, unknown>[] {
  if (!payload) return []
  if (Array.isArray(payload)) return payload as Record<string, unknown>[]
  if (typeof payload !== 'object') return []

  const obj = payload as Record<string, unknown>
  for (const key of ['data', 'rows', 'result', 'items', 'registros', 'lista']) {
    const val = obj[key]
    if (Array.isArray(val)) return val as Record<string, unknown>[]
  }

  // Alguns relatórios retornam { data: { rows: [...] } }
  if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
    const nested = obj.data as Record<string, unknown>
    for (const key of ['rows', 'items', 'data']) {
      if (Array.isArray(nested[key])) return nested[key] as Record<string, unknown>[]
    }
  }

  return []
}

export async function fetchAvecReport(reportId: string, params: AvecReportParams = {}) {
  if (isAvecMock()) {
    return getMockReport(reportId, params.page ?? 1)
  }

  const { baseUrl, token } = getConfig()
  const qs = new URLSearchParams()
  qs.set('page', String(params.page ?? 1))
  qs.set('limit', String(params.limit ?? 250))
  for (const [k, v] of Object.entries(params)) {
    if (k === 'page' || k === 'limit' || v === undefined) continue
    qs.set(k, String(v))
  }

  const url = `${baseUrl}/reports/${reportId}?${qs}`
  const res = await fetch(url, {
    headers: { Authorization: token, Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Avec ${reportId} HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`)
  }

  return res.json()
}

// Pagina automaticamente até esgotar ou atingir maxPages.
export async function fetchAllAvecReport(reportId: string, params: AvecReportParams = {}, maxPages = 20) {
  const all: Record<string, unknown>[] = []
  for (let page = 1; page <= maxPages; page++) {
    const payload = await fetchAvecReport(reportId, { ...params, page, limit: params.limit ?? 250 })
    const rows = extractRows(payload)
    if (rows.length === 0) break
    all.push(...rows)
    if (rows.length < (params.limit ?? 250)) break
  }
  return all
}
