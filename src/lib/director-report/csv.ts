import type { DirectorReport, MonthKey, QuarterKey } from './types'
import { labelMonth, labelQuarter } from './period'

function esc(v: string | number | null | undefined) {
  const s = v == null ? '' : String(v)
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** 0021 — série mês a mês (faturamento + ticket). */
export function revenueCsv(report: DirectorReport, selectedMonth?: MonthKey) {
  const months = report.revenue_blocks[0]?.months.map((m) => m.month) ?? []
  const filtered = selectedMonth ? months.filter((m) => m === selectedMonth) : months
  const header = ['Profissional', ...filtered.flatMap((m) => [`Fat ${m}`, `Ticket ${m}`]), 'Total fat']
  const lines = [header.map(esc).join(';')]

  for (const block of report.revenue_blocks) {
    const byMonth = new Map(block.months.map((m) => [m.month, m]))
    let total = 0
    const cells: (string | number)[] = [block.professional.name]
    for (const m of filtered) {
      const row = byMonth.get(m)
      const rev = row?.revenue ?? 0
      total += rev
      cells.push(rev, row?.ticket_avg ?? 0)
    }
    cells.push(total)
    lines.push(cells.map(esc).join(';'))
  }
  return lines.join('\n')
}

/** 0021 — comparativo mês A vs mês B. */
export function revenueCompareCsv(report: DirectorReport) {
  const a = report.period.selected_month
  const b = report.period.compare_month
  const header = [
    'Profissional',
    `Fat ${labelMonth(a)}`,
    `Ticket ${labelMonth(a)}`,
    `Fat ${labelMonth(b)}`,
    `Ticket ${labelMonth(b)}`,
    'Δ Fat (R$)',
    'Δ Fat %',
    'Δ Ticket (R$)',
  ]
  const lines = [header.map(esc).join(';')]

  for (const block of report.revenue_blocks) {
    const byMonth = new Map(block.months.map((m) => [m.month, m]))
    const rowA = byMonth.get(a)
    const rowB = byMonth.get(b)
    const fatA = rowA?.revenue ?? 0
    const fatB = rowB?.revenue ?? 0
    const tickA = rowA?.ticket_avg ?? 0
    const tickB = rowB?.ticket_avg ?? 0
    const delta = fatA - fatB
    const deltaPct = fatB > 0 ? ((delta / fatB) * 100).toFixed(1) : ''
    lines.push(
      [block.professional.name, fatA, tickA, fatB, tickB, delta, deltaPct, tickA - tickB]
        .map(esc)
        .join(';')
    )
  }
  return lines.join('\n')
}

/** 0011 — comparativo trimestre A vs trimestre B. */
export function returnCompareCsv(report: DirectorReport) {
  const a = report.period.selected_quarter
  const b = report.period.compare_quarter
  const header = [
    'Profissional',
    `Taxa ${labelQuarter(a)} %`,
    `Clientes ${labelQuarter(a)}`,
    `Taxa ${labelQuarter(b)} %`,
    `Clientes ${labelQuarter(b)}`,
    'Δ p.p.',
  ]
  const lines = [header.map(esc).join(';')]

  for (const block of report.return_blocks) {
    const qa = block.quarters.find((q) => q.quarter === a)
    const qb = block.quarters.find((q) => q.quarter === b)
    const rateA = qa?.return_rate ?? 0
    const rateB = qb?.return_rate ?? 0
    const delta = Math.round((rateA - rateB) * 1000) / 10
    lines.push(
      [
        block.professional.name,
        (rateA * 100).toFixed(1),
        qa?.clients_total ?? '',
        (rateB * 100).toFixed(1),
        qb?.clients_total ?? '',
        delta,
      ]
        .map(esc)
        .join(';')
    )
  }
  return lines.join('\n')
}

/** 0011 — série trimestral completa. */
export function returnCsv(report: DirectorReport, selectedQuarter?: QuarterKey) {
  const header = [
    'Profissional',
    'Trimestre',
    'Taxa retorno %',
    'Clientes',
    'Retornaram',
    'Δ vs anterior (p.p.)',
  ]
  const lines = [header.map(esc).join(';')]
  for (const block of report.return_blocks) {
    for (const q of block.quarters) {
      if (selectedQuarter && q.quarter !== selectedQuarter) continue
      lines.push(
        [
          block.professional.name,
          q.label,
          (q.return_rate * 100).toFixed(1),
          q.clients_total,
          q.clients_returned,
          q.delta_vs_prev ?? '',
        ]
          .map(esc)
          .join(';')
      )
    }
  }
  return lines.join('\n')
}

/** Lista 0011 no formato Avec. */
export function reactivationCsv(report: DirectorReport) {
  const header = [
    'Profissional',
    'Cliente',
    'E-mail',
    'Telefone',
    'Celular',
    'Sexo',
    'Data ultima comanda',
    'Dias sem vir',
    'Ação sugerida',
  ]
  const lines = [header.map(esc).join(';')]
  for (const block of report.return_blocks) {
    for (const c of block.reactivation) {
      lines.push(
        [
          block.professional.name,
          c.name,
          c.email ?? '',
          c.phone ?? '',
          c.mobile ?? '',
          c.gender ?? '',
          c.last_visit,
          c.days_since,
          c.suggested_action,
        ]
          .map(esc)
          .join(';')
      )
    }
  }
  return lines.join('\n')
}
