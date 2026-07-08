import { ok, handleError } from '@/lib/api-response'
import { getSql } from '@/lib/db'

export async function GET() {
  try {
    const sql = getSql()
    const [byDay, byStatus, conversionRows] = await Promise.all([
      sql`select * from v_kpi_daily limit 30`,
      sql`select * from v_kpi_status`,
      sql`select * from v_kpi_conversion limit 1`,
    ])

    return ok({ byDay, byStatus, conversion: conversionRows[0] ?? null })
  } catch (e) {
    return handleError(e)
  }
}
