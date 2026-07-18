import { avecProvider } from '@/lib/providers/avec/adapter'
import { trinksProvider } from '@/lib/providers/trinks/adapter'
import type { AgendaProvider, AgendaProviderId } from '@/lib/providers/types'

const PROVIDERS: Record<AgendaProviderId, AgendaProvider> = {
  avec: avecProvider,
  trinks: trinksProvider,
}

export function getAgendaProvider(id: AgendaProviderId): AgendaProvider {
  return PROVIDERS[id]
}

export function listAgendaProviders(): AgendaProvider[] {
  return Object.values(PROVIDERS)
}
