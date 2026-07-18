/** Normaliza nome para match flexível (acentos, case, espaços). */
export function normalizeProKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Casamento do nome do assinante com nomes vindos da API.
 * Nunca expõe o salão inteiro como produto — só decide match / ambiguous / not_found.
 */
export function matchSubscriberName(
  displayName: string,
  apiNames: string[],
): { status: 'matched'; canonicalName: string; aliases: string[] } | { status: 'not_found' } | {
  status: 'ambiguous'
  candidates: string[]
} {
  const key = normalizeProKey(displayName)
  if (!key) return { status: 'not_found' }

  const unique = Array.from(
    new Map(apiNames.filter(Boolean).map((n) => [normalizeProKey(n), n.trim()])).entries(),
  )

  const exact = unique.filter(([k]) => k === key)
  if (exact.length === 1) {
    const canonical = exact[0]![1]
    return { status: 'matched', canonicalName: canonical, aliases: [canonical, displayName.trim()] }
  }

  const partial = unique.filter(([k, _name]) => {
    return k === key || k.startsWith(key + ' ') || key.startsWith(k + ' ') || k.includes(key) || key.includes(k)
  })

  if (partial.length === 1) {
    const canonical = partial[0]![1]
    return { status: 'matched', canonicalName: canonical, aliases: [canonical, displayName.trim()] }
  }

  if (partial.length > 1) {
    return { status: 'ambiguous', candidates: partial.map(([, n]) => n).slice(0, 8) }
  }

  return { status: 'not_found' }
}

export function nameMatchesProfessional(
  candidate: string | null | undefined,
  professional: { canonicalName: string; aliases: string[] },
): boolean {
  if (!candidate?.trim()) return false
  const key = normalizeProKey(candidate)
  const keys = [professional.canonicalName, ...professional.aliases].map(normalizeProKey)
  return keys.some((k) => k && (k === key || key.startsWith(k + ' ') || k.startsWith(key + ' ')))
}
