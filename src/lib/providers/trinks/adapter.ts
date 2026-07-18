import { matchSubscriberName, nameMatchesProfessional } from '@/lib/providers/name-match'
import type {
  AgendaProvider,
  ProviderAppointment,
  ProviderAttendance,
  ProviderRevenueRow,
  ResolveProfessionalResult,
} from '@/lib/providers/types'

const DEFAULT_BASE = 'https://api.trinks.com'

function baseUrl() {
  return (process.env.TRINKS_API_URL ?? DEFAULT_BASE).replace(/\/$/, '')
}

function useMock(token: string) {
  return (
    token === 'mock' ||
    process.env.TRINKS_MOCK === '1' ||
    process.env.TRINKS_MOCK === 'true'
  )
}

async function trinksFetch(
  token: string,
  path: string,
  query: Record<string, string | number | undefined> = {},
) {
  if (useMock(token)) {
    return mockTrinks(path, query)
  }

  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === '') continue
    qs.set(k, String(v))
  }
  const url = `${baseUrl()}${path}${qs.size ? `?${qs}` : ''}`
  const res = await fetch(url, {
    headers: {
      'X-Api-Key': token,
      Accept: 'application/json',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Trinks ${path} HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`)
  }

  return res.json()
}

function extractList(payload: unknown): Record<string, unknown>[] {
  if (!payload) return []
  if (Array.isArray(payload)) return payload as Record<string, unknown>[]
  if (typeof payload !== 'object') return []
  const obj = payload as Record<string, unknown>
  for (const key of ['data', 'items', 'result', 'profissionais', 'agendamentos', 'results']) {
    if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[]
  }
  return []
}

function pickStr(row: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number') return String(v)
  }
  // nested profissional
  const pro = row.profissional
  if (pro && typeof pro === 'object') {
    const p = pro as Record<string, unknown>
    for (const k of ['nome', 'name', 'nomeProfissional']) {
      if (typeof p[k] === 'string' && p[k].trim()) return String(p[k]).trim()
    }
  }
  return null
}

function mockTrinks(path: string, query: Record<string, string | number | undefined>) {
  if (path.startsWith('/v1/profissionais')) {
    return {
      data: [
        { id: 101, nome: 'Dani Mariniello' },
        { id: 102, nome: 'Walter' },
      ],
    }
  }
  if (path.startsWith('/v1/agendamentos')) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(15, 0, 0, 0)
    return {
      data: [
        {
          id: 1,
          profissionalId: 101,
          profissionalNome: 'Dani Mariniello',
          clienteId: 501,
          clienteNome: 'Ana Paula Silva',
          clienteTelefone: '11987654321',
          servicoNome: 'Hidratação',
          dataHoraInicio: tomorrow.toISOString(),
          valor: 280,
          status: 'agendado',
        },
        {
          id: 2,
          profissionalId: 102,
          profissionalNome: 'Walter',
          clienteId: 502,
          clienteNome: 'Carlos Mendes',
          clienteTelefone: '11976543210',
          servicoNome: 'Corte',
          dataHoraInicio: tomorrow.toISOString(),
          valor: 120,
          status: 'agendado',
        },
      ].filter((a) => {
        if (query.profissionalId) return String(a.profissionalId) === String(query.profissionalId)
        return true
      }),
    }
  }
  return { data: [] }
}

function requireEstabelecimento(unitExternalId?: string | null) {
  const id = unitExternalId?.trim()
  if (!id && !useMock('x')) {
    // mock path doesn't need it; real API does
  }
  return id || process.env.TRINKS_ESTABELECIMENTO_ID?.trim() || ''
}

export const trinksProvider: AgendaProvider = {
  id: 'trinks',
  label: 'Trinks',
  available: true,

  async resolveProfessional({ token, displayName, unitExternalId }): Promise<ResolveProfessionalResult> {
    const estabelecimentoId = requireEstabelecimento(unitExternalId)
    if (!estabelecimentoId && !useMock(token)) {
      return { status: 'not_found', candidates: [] }
    }

    const payload = await trinksFetch(token, '/v1/profissionais', {
      estabelecimentoId: estabelecimentoId || 'mock',
      page: 1,
      pageSize: 100,
    })
    const rows = extractList(payload)
    const names = rows
      .map((r) => pickStr(r, ['nome', 'name', 'nomeProfissional', 'profissionalNome']))
      .filter(Boolean) as string[]

    const match = matchSubscriberName(displayName, names)
    if (match.status === 'matched') {
      let externalId: string | null = null
      for (const row of rows) {
        const n = pickStr(row, ['nome', 'name', 'nomeProfissional'])
        if (n && nameMatchesProfessional(n, match)) {
          const id = row.id ?? row.profissionalId ?? row.profissional_id
          if (id != null) externalId = String(id)
          break
        }
      }
      return {
        status: 'matched',
        externalId,
        canonicalName: match.canonicalName,
        aliases: match.aliases,
      }
    }
    if (match.status === 'ambiguous') {
      return { status: 'ambiguous', candidates: match.candidates }
    }
    return { status: 'not_found', candidates: [] }
  },

  async fetchRevenue(): Promise<ProviderRevenueRow | null> {
    // Trinks não expõe o mesmo relatório 0021 — métricas vêm dos atendimentos syncados.
    return null
  },

  async fetchAppointments({
    token,
    professional,
    unitExternalId,
    daysBack = 0,
    daysForward = 14,
  }): Promise<ProviderAppointment[]> {
    const estabelecimentoId = requireEstabelecimento(unitExternalId) || 'mock'
    const start = new Date()
    start.setDate(start.getDate() - daysBack)
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setDate(end.getDate() + daysForward)
    end.setHours(23, 59, 59, 999)

    const payload = await trinksFetch(token, '/v1/agendamentos', {
      estabelecimentoId,
      dataInicio: start.toISOString(),
      dataFim: end.toISOString(),
      profissionalId: professional.externalId ? Number(professional.externalId) : undefined,
      page: 1,
      pageSize: 100,
    })

    const out: ProviderAppointment[] = []
    for (const row of extractList(payload)) {
      const proName = pickStr(row, ['profissionalNome', 'nomeProfissional', 'profissional'])
      if (!nameMatchesProfessional(proName, professional) && professional.externalId) {
        const pid = row.profissionalId ?? row.profissional_id
        if (pid != null && String(pid) !== professional.externalId) continue
      } else if (!nameMatchesProfessional(proName, professional) && !professional.externalId) {
        continue
      }

      const whenRaw =
        pickStr(row, ['dataHoraInicio', 'dataInicio', 'inicio', 'data_hora']) ?? null
      const scheduledAt = whenRaw ? new Date(whenRaw) : null

      out.push({
        externalClientId: pickStr(row, ['clienteId', 'cliente_id', 'idCliente']),
        clientName: pickStr(row, ['clienteNome', 'nomeCliente', 'cliente']),
        clientPhone: pickStr(row, ['clienteTelefone', 'telefone', 'celular']),
        serviceName: pickStr(row, ['servicoNome', 'nomeServico', 'servico']),
        scheduledAt:
          scheduledAt && !Number.isNaN(scheduledAt.getTime()) ? scheduledAt : null,
        status: pickStr(row, ['status', 'situacao']),
        price: Number(row.valor ?? row.preco ?? row.price) || null,
        professionalName: proName,
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
    // Reusa agendamentos passados como proxy de atendimentos (filtra status quando houver).
    const appts = await this.fetchAppointments({
      token,
      professional,
      unitExternalId,
      daysBack,
      daysForward: 0,
    })
    return appts
      .filter((a) => {
        const s = (a.status ?? '').toLowerCase()
        if (!s) return true
        return !/(cancel|falta|no.?show|desmarc)/.test(s)
      })
      .map((a) => ({
        externalClientId: a.externalClientId,
        clientName: a.clientName,
        clientPhone: a.clientPhone,
        serviceName: a.serviceName,
        doneAt: a.scheduledAt,
        price: a.price,
        professionalName: a.professionalName,
      }))
  },
}
