import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { requireAdmin } from '@/lib/auth'
import { buildDirectorReport } from '@/lib/director-report/build'
import { reactivationCsv, returnCsv, revenueCsv } from '@/lib/director-report/csv'
import { deliverDirectorReport } from '@/lib/director-report/deliver'
import {
  getDirectorReportRecipients,
  isDirectorEmailConfigured,
} from '@/lib/director-report/email'
import type { MonthKey, QuarterKey } from '@/lib/director-report/types'

function asMonth(v: string | null): MonthKey | undefined {
  if (!v || !/^\d{4}-\d{2}$/.test(v)) return undefined
  return v as MonthKey
}

function asQuarter(v: string | null): QuarterKey | undefined {
  if (!v || !/^\d{4}-Q[1-4]$/.test(v)) return undefined
  return v as QuarterKey
}

/** GET /api/director-report — só admin. */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return err(auth.message, auth.status)

    const { searchParams } = req.nextUrl
    const report = await buildDirectorReport({
      selectedMonth: asMonth(searchParams.get('month')),
      selectedQuarter: asQuarter(searchParams.get('quarter')),
      compareQuarter: asQuarter(searchParams.get('compare')),
      professionalId: searchParams.get('professional_id') ?? undefined,
      forceMock: searchParams.get('mock') === '1',
    })

    const format = searchParams.get('format') ?? 'json'
    if (format === 'json') {
      return ok({
        ...report,
        delivery: {
          email_configured: isDirectorEmailConfigured(),
          recipients: getDirectorReportRecipients(),
        },
      })
    }

    let body = ''
    let filename = 'relatorio-diretoria.csv'
    if (format === 'csv-revenue') {
      body = revenueCsv(report)
      filename = 'faturamento-ticket-profissionais.csv'
    } else if (format === 'csv-return') {
      body = returnCsv(report)
      filename = 'retorno-clientes-trimestre.csv'
    } else if (format === 'csv-reactivation') {
      body = reactivationCsv(report)
      filename = '0011-lista-clientes-por-profissional.csv'
    } else {
      return err('format inválido', 400)
    }

    return new Response('\uFEFF' + body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    return handleError(e)
  }
}

/** POST — dispara relatório (cron ou admin) → e-mail + Telegram. */
export async function POST(req: NextRequest) {
  try {
    const cron = process.env.CRON_SECRET?.trim()
    const authHeader = req.headers.get('authorization')
    const isCron = Boolean(cron && authHeader === `Bearer ${cron}`)

    if (!isCron) {
      const auth = await requireAdmin(req)
      if (!auth.ok) return err(auth.message, auth.status)
    }

    const body = await req.json().catch(() => ({}))
    const forceMock = body?.mock !== false

    const report = await buildDirectorReport({ forceMock })
    const delivery = await deliverDirectorReport(report)

    console.info('[director-report] weekly run', {
      at: report.generated_at,
      professionals: report.summary.professionals,
      email: delivery.email.ok,
      telegram: delivery.telegram?.ok,
      cron: isCron,
    })

    const parts: string[] = []
    if (delivery.email.ok) parts.push(`e-mail → ${delivery.email.to.join(', ')}`)
    else parts.push(`e-mail falhou (${delivery.email.error})`)
    if (delivery.telegram?.ok) parts.push('Telegram OK (CSVs)')
    else if (delivery.telegram) parts.push(`Telegram falhou: ${delivery.telegram.error}`)

    return ok({
      ran: true,
      generated_at: report.generated_at,
      professionals: report.summary.professionals,
      summary: report.summary,
      delivery,
      note: parts.join(' · '),
    })
  } catch (e) {
    return handleError(e)
  }
}
