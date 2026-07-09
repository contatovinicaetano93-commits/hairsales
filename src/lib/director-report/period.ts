import type { DirectorReport, MonthKey, QuarterKey } from './types'

const MONTH_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

export function labelMonth(month: MonthKey): string {
  const [y, m] = month.split('-')
  const idx = Number(m) - 1
  if (!y || idx < 0 || idx > 11) return month
  return `${MONTH_PT[idx]}/${y}`
}

export function labelQuarter(quarter: QuarterKey): string {
  const [y, q] = quarter.split('-Q')
  if (!y || !q) return quarter
  return `${q}º tri/${y}`
}

export function label0011(report: DirectorReport): string {
  const { selected_quarter, compare_quarter } = report.period
  return `Retorno ${labelQuarter(selected_quarter)} vs ${labelQuarter(compare_quarter)}`
}

export function label0021(report: DirectorReport): string {
  const { selected_month, compare_month } = report.period
  return `Fat ${labelMonth(selected_month)} vs ${labelMonth(compare_month)}`
}

/** Ex.: "Etapa 1: Retorno … · Etapa 2: Fat …" */
export function reportPeriodLabel(report: DirectorReport): string {
  return `Etapa 1: ${label0011(report)} · Etapa 2: ${label0021(report)}`
}

/** Data de referência do relatório (último dia do mês selecionado 0021), pt-BR. */
export function reportReferenceDate(report: DirectorReport): string {
  const [y, m] = report.period.selected_month.split('-').map(Number)
  if (!y || !m) {
    return new Date(report.generated_at).toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    })
  }
  const last = new Date(Date.UTC(y, m, 0))
  return last.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

export function reportSubject0011(report: DirectorReport): string {
  return `ROM Brasil · Etapa 1 · Relatório 0011 · ${label0011(report)} · ref. ${report.period.reference_date}`
}

export function reportSubject0021(report: DirectorReport): string {
  return `ROM Brasil · Etapa 2 · Relatório 0021 · ${label0021(report)} · ref. ${report.period.reference_date}`
}

/** @deprecated use reportSubject0011 / reportSubject0021 */
export function reportSubject(report: DirectorReport): string {
  return `ROM Brasil · Relatório diretoria · ${reportPeriodLabel(report)} · ref. ${reportReferenceDate(report)}`
}

export function slug0011(report: DirectorReport): string {
  const { selected_quarter, compare_quarter } = report.period
  return `0011_${selected_quarter}_vs_${compare_quarter}`.replace(/[^a-zA-Z0-9_-]/g, '_')
}

export function slug0021(report: DirectorReport): string {
  const { selected_month, compare_month } = report.period
  return `0021_${selected_month}_vs_${compare_month}`.replace(/[^a-zA-Z0-9_-]/g, '_')
}

export function slugPeriod(report: DirectorReport): string {
  return `${slug0011(report)}_${slug0021(report)}`
}

/** Mês anterior (YYYY-MM). */
export function previousMonth(month: MonthKey): MonthKey {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return month
  if (m === 1) return `${y - 1}-12` as MonthKey
  return `${y}-${String(m - 1).padStart(2, '0')}` as MonthKey
}
