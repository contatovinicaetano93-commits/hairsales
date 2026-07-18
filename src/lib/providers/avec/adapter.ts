import {
  AVEC_DEFAULT_API_URL,
  extractRows,
  periodRange,
  type AvecReportParams,
} from '@/lib/avec/client'
import { getMockReport } from '@/lib/avec/fixtures'
import {
  normalizeAppointmentRow,
  normalizeAttendanceRow,
  normalizeP1OccupancyRow,
  normalizeP1ProfessionalRevenueRow,
} from '@/lib/avec/normalize'
import { matchSubscriberName, nameMatchesProfessional } from '@/lib/providers/name-match'
import type {
  AgendaProvider,
  ProviderAppointment,
  ProviderAttendance,
  ProviderProfessionalRef,
  ProviderRevenueRow,
  ResolveProfessionalResult,
} from '@/lib/providers/types'

function useMockToken(token: string) {
  return token === 'mock' || process.env.AVEC_MOCK === '1' || process.env.AVEC_MOCK === 'true'
}

async function fetchAvecReportWithToken(
  token: string,
  reportId: string,
  params: AvecReportParams = {},
) {
  if (useMockToken(token)) {
    return getMockReport(reportId, params.page ?? 1)
  }

  const baseUrl = (process.env.AVEC_API_URL ?? AVEC_DEFAULT_API_URL).replace(/\/$/, '')
  const qs = new URLSearchParams()
  qs.set('page', String(params.page ?? 1))
  qs.set('limit', String(params.limit ?? 250))
  for (const [k, v] of Object.entries(params)) {
    if (k === 'page' || k === 'limit' || v === undefined || v === '') continue
    qs.set(k, String(v))
  }

  const url = `${baseUrl}/reports/${reportId}?${qs}`
  const res = await fetch(url, {
    headers: { Authorization: token, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Avec ${reportId} HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`)
  }

  return res.json()
}

async function fetchAllWithToken(
  token: string,
  reportId: string,
  params: AvecReportParams = {},
  maxPages = 20,
) {
  const all: Record<string, unknown>[] = []
  const limit = params.limit ?? 250
  for (let page = 1; page <= maxPages; page++) {
    const payload = await fetchAvecReportWithToken(token, reportId, { ...params, page, limit })
    const rows = extractRows(payload)
    if (rows.length === 0) break
    all.push(...rows)
    if (rows.length < limit) break
  }
  return all
}

function collectProfessionalNames(rows: Record<string, unknown>[]): string[] {
  const names: string[] = []
  for (const row of rows) {
    const fromRevenue = normalizeP1ProfessionalRevenueRow(row)
    if (fromRevenue?.name) names.push(fromRevenue.name)
    const fromOcc = normalizeP1OccupancyRow(row)
    if (fromOcc?.name) names.push(fromOcc.name)
    const appt = normalizeAppointmentRow(row)
    if (appt?.professional) names.push(appt.professional)
    const att = normalizeAttendanceRow(row)
    if (att?.professional) names.push(att.professional)
  }
  return names
}

function toDate(iso: string | null): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

export const avecProvider: AgendaProvider = {
  id: 'avec',
  label: 'Avec',
  available: true,

  async resolveProfessional({ token, displayName, unitExternalId }): Promise<ResolveProfessionalResult> {
    const range = periodRange(60, 14)
    const site = unitExternalId?.trim() || undefined

    const [revRows, apptRows, attRows] = await Promise.all([
      fetchAllWithToken(token, '0021', { ...range, site, limit: 250 }),
      fetchAllWithToken(token, '0051', { ...range, site, limit: 250 }),
      fetchAllWithToken(token, '0002', { ...range, site, limit: 250 }),
    ])

    const names = collectProfessionalNames([...revRows, ...apptRows, ...attRows])
    const match = matchSubscriberName(displayName, names)

    if (match.status === 'matched') {
      let externalId: string | null = null
      for (const row of [...revRows, ...apptRows]) {
        const n =
          typeof row.profissional === 'string'
            ? row.profissional
            : typeof row.nome === 'string'
              ? row.nome
              : null
        if (n && nameMatchesProfessional(n, match)) {
          const id =
            row.profissional_id ?? row.id_profissional ?? row.colaborador_id ?? row.funcionario_id
          if (id != null && String(id).trim()) {
            externalId = String(id).trim()
            break
          }
        }
      }
      return {
        status: 'matched',
        externalId,
        canonicalName: match.canonicalName,
        aliases: Array.from(new Set(match.aliases.filter(Boolean))),
      }
    }

    if (match.status === 'ambiguous') {
      return { status: 'ambiguous', candidates: match.candidates }
    }

    return { status: 'not_found', candidates: [] }
  },

  async fetchRevenue({
    token,
    professional,
    unitExternalId,
    daysBack = 0,
  }): Promise<ProviderRevenueRow | null> {
    const range = periodRange(daysBack, 0)
    const site = unitExternalId?.trim() || undefined
    const rows = await fetchAllWithToken(token, '0021', {
      ...range,
      site,
      profissional_id: professional.externalId ?? '',
      limit: 250,
    })
    const occRows = await fetchAllWithToken(token, '0126', {
      ...range,
      site,
      profissional_id: professional.externalId ?? '',
      limit: 250,
    })

    let best: ProviderRevenueRow | null = null
    for (const row of rows) {
      const p = normalizeP1ProfessionalRevenueRow(row)
      if (!p || !nameMatchesProfessional(p.name, professional)) continue
      best = {
        professionalName: p.name,
        revenue: p.revenue,
        attended: p.attended,
        ticketAvg: p.ticketAvg,
        occupancy: p.occupancy,
      }
    }

    for (const row of occRows) {
      const o = normalizeP1OccupancyRow(row)
      if (!o || !nameMatchesProfessional(o.name, professional)) continue
      if (!best) {
        best = {
          professionalName: o.name,
          revenue: 0,
          attended: 0,
          ticketAvg: 0,
          occupancy: o.occupancy,
        }
      } else {
        best.occupancy = o.occupancy
      }
    }

    return best
  },

  async fetchAppointments({
    token,
    professional,
    unitExternalId,
    daysBack = 0,
    daysForward = 14,
  }): Promise<ProviderAppointment[]> {
    const range = periodRange(daysBack, daysForward)
    const site = unitExternalId?.trim() || undefined
    const rows = await fetchAllWithToken(token, '0051', {
      ...range,
      site,
      profissional_id: professional.externalId ?? '',
      limit: 250,
    })

    const out: ProviderAppointment[] = []
    for (const row of rows) {
      const a = normalizeAppointmentRow(row)
      if (!a) continue
      if (!nameMatchesProfessional(a.professional, professional)) continue
      out.push({
        externalClientId: a.avecClientId,
        clientName: a.clientName,
        clientPhone: a.phone,
        serviceName: a.serviceName,
        scheduledAt: toDate(a.scheduledAt),
        status: a.status,
        price: a.price,
        professionalName: a.professional,
      })
    }
    return out
  },

  async fetchAttendances({
    token,
    professional,
    unitExternalId,
    daysBack = 60,
  }): Promise<ProviderAttendance[]> {
    const range = periodRange(daysBack, 0)
    const site = unitExternalId?.trim() || undefined
    const rows = await fetchAllWithToken(token, '0002', {
      ...range,
      site,
      profissional_id: professional.externalId ?? '',
      limit: 250,
    })

    const out: ProviderAttendance[] = []
    for (const row of rows) {
      const a = normalizeAttendanceRow(row)
      if (!a) continue
      if (!nameMatchesProfessional(a.professional, professional)) continue
      out.push({
        externalClientId: a.avecClientId,
        clientName: a.clientName,
        clientPhone: a.phone,
        serviceName: a.serviceName,
        doneAt: toDate(a.attendedAt),
        price: a.price,
        professionalName: a.professional,
      })
    }
    return out
  },
}
