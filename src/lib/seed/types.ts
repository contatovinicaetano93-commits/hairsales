import type { ContactStatus } from '@/lib/contacts'
import type { RomSeedPreset } from '@/lib/brand'

export interface SeedServiceSpec {
  name: string
  category: 'corte' | 'coloracao' | 'tratamento' | 'bem_estar' | 'outro'
  cadenceDays: number
  overdue?: boolean
  dueSoon?: boolean
  scheduleTomorrow?: boolean
  scheduleToday?: boolean
}

export interface SeedContactSpec {
  name: string
  phone: string
  email?: string
  channel: 'whatsapp' | 'telegram' | 'avec' | 'instagram' | 'manual'
  source: string
  status: ContactStatus
  notes?: string
  avecClientId?: string
  services: SeedServiceSpec[]
}

export interface SeedPreset {
  id: RomSeedPreset
  label: string
  contacts: SeedContactSpec[]
}

export interface SeedResult {
  preset: RomSeedPreset
  contacts: number
  services: number
  message: string
}
