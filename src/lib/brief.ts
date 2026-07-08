import { askAI } from '@/lib/ai/openai'
import type { ContactRow } from '@/lib/contacts'
import type { EnrichedService, Recommendation } from '@/lib/recommendations'

const BRIEF_PROMPT = `Você é a inteligência de atendimento do ROM Club (salão de beleza de alto padrão).
Gere um briefing curto e direto para o backstaff/executor, em português, no máximo 5 linhas.
Objetivo: facilitar o front no cross-sell e up-sell. Use SOMENTE os dados fornecidos.
Formato: 1 linha de contexto do cliente + bullets de ações recomendadas (o que oferecer e por quê).
Seja prático e caloroso, sem inventar informação que não está nos dados.`

function fmtService(s: EnrichedService) {
  const parts = [s.name]
  if (s.product) parts.push(`(${s.product})`)
  if (s.cadence_days) parts.push(`a cada ${s.cadence_days}d`)
  if (s.state === 'overdue') parts.push(`ATRASADO ${Math.abs(s.days_until ?? 0)}d`)
  else if (s.state === 'due_soon') parts.push(`vence em ${s.days_until}d`)
  return parts.join(' ')
}

// Briefing determinístico — sempre funciona, sem depender da IA.
export function buildRuleBrief(
  contact: ContactRow,
  services: EnrichedService[],
  recs: Recommendation[]
): string {
  const nome = contact.name ?? 'Cliente'
  const linhas: string[] = []
  linhas.push(`${nome} — ${services.length} serviço(s) no perfil.`)
  if (recs.length === 0) {
    linhas.push('• Sem ações urgentes agora. Mantenha o relacionamento e confirme preferências.')
  } else {
    for (const r of recs) linhas.push(`• ${r.title}: ${r.detail}`)
  }
  return linhas.join('\n')
}

// Briefing inteligente (IA) com fallback resiliente pro determinístico.
export async function generateBrief(
  contact: ContactRow,
  services: EnrichedService[],
  recs: Recommendation[]
): Promise<{ brief: string; source: 'ai' | 'rules' }> {
  const rule = buildRuleBrief(contact, services, recs)

  const context = JSON.stringify({
    cliente: { nome: contact.name, status: contact.status, notas: contact.notes },
    servicos: services.map(fmtService),
    recomendacoes: recs.map((r) => `${r.type}: ${r.title} — ${r.detail}`),
  })

  try {
    const ai = await askAI(BRIEF_PROMPT, `Dados do cliente: ${context}`)
    if (ai && ai.trim().length > 0) return { brief: ai.trim(), source: 'ai' }
  } catch {
    // IA indisponível (sem chave, timeout, etc.) — cai no briefing por regras.
  }
  return { brief: rule, source: 'rules' }
}
