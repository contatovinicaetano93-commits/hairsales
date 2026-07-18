export type AgendaProviderId = 'avec' | 'trinks'

export type ResolveProfessionalResult =
  | {
      status: 'matched'
      externalId: string | null
      canonicalName: string
      aliases: string[]
    }
  | { status: 'not_found'; candidates: string[] }
  | { status: 'ambiguous'; candidates: string[] }

export interface ProviderProfessionalRef {
  externalId: string | null
  canonicalName: string
  aliases: string[]
}

export interface ProviderAppointment {
  externalClientId: string | null
  clientName: string | null
  clientPhone: string | null
  serviceName: string | null
  scheduledAt: Date | null
  status: string | null
  price: number | null
  professionalName: string | null
}

export interface ProviderAttendance {
  externalClientId: string | null
  clientName: string | null
  clientPhone: string | null
  serviceName: string | null
  doneAt: Date | null
  price: number | null
  professionalName: string | null
}

export interface ProviderRevenueRow {
  professionalName: string
  revenue: number
  attended: number
  ticketAvg: number
  occupancy: number | null
}

export interface AgendaProvider {
  id: AgendaProviderId
  label: string
  available: boolean
  resolveProfessional(input: {
    token: string
    displayName: string
    unitExternalId?: string | null
  }): Promise<ResolveProfessionalResult>
  fetchRevenue(input: {
    token: string
    professional: ProviderProfessionalRef
    unitExternalId?: string | null
    daysBack?: number
  }): Promise<ProviderRevenueRow | null>
  fetchAppointments(input: {
    token: string
    professional: ProviderProfessionalRef
    unitExternalId?: string | null
    daysBack?: number
    daysForward?: number
  }): Promise<ProviderAppointment[]>
  fetchAttendances(input: {
    token: string
    professional: ProviderProfessionalRef
    unitExternalId?: string | null
    daysBack?: number
  }): Promise<ProviderAttendance[]>
}
