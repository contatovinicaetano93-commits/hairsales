import type { AgendaProvider, ResolveProfessionalResult } from '@/lib/providers/types'

/** Stub — mesma UX de Conectar; implementação da API Trinks na sequência. */
export const trinksProvider: AgendaProvider = {
  id: 'trinks',
  label: 'Trinks',
  available: false,

  async resolveProfessional(): Promise<ResolveProfessionalResult> {
    return { status: 'not_found', candidates: [] }
  },

  async fetchRevenue() {
    return null
  },

  async fetchAppointments() {
    return []
  },

  async fetchAttendances() {
    return []
  },
}
