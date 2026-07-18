export interface MarketingPack {
  id: string
  credits: number
  label: string
  /** Preço em centavos BRL. */
  amount_cents: number
}

export const MARKETING_PACKS: MarketingPack[] = [
  { id: 'mkt_50', credits: 50, label: '50 mensagens', amount_cents: 2900 },
  { id: 'mkt_100', credits: 100, label: '100 mensagens', amount_cents: 4900 },
  { id: 'mkt_250', credits: 250, label: '250 mensagens', amount_cents: 9900 },
]

export function listMarketingPacks() {
  return MARKETING_PACKS
}

export function getMarketingPack(packId: string): MarketingPack | null {
  return MARKETING_PACKS.find((p) => p.id === packId) ?? null
}
