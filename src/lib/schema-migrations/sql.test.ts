import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { existsSync } from 'fs'
import { join } from 'path'
import type { RomPanelId } from '@/lib/brand'
import { assertSafeDbFileName, splitSqlStatements } from './sql'
import {
  listMigrationsForPanel,
  loadMigrationsManifest,
  MissingMigrationFileError,
} from './registry'

const PRO_MIGRATION_IDS = [
  '020_pro_subscribers',
  '021_pro_assistant',
  '022_pro_whatsapp',
  '023_pro_wa_packs',
  '024_pro_stripe',
  '025_pro_billing_signup',
  '026_pro_subscription_status',
  '027_pro_billing_events',
  '028_pro_session_version',
  '029_pro_billing_events_pending',
  '030_pro_rate_limits',
]

function panelOfThisRepo(): RomPanelId {
  const db = join(process.cwd(), 'db')
  if (existsSync(join(db, 'delta-telegram-staff-links.sql'))) return 'brasil'
  if (existsSync(join(db, 'delta-parity-brasil.sql'))) return 'iguatemi'
  return 'brasil'
}

describe('splitSqlStatements', () => {
  it('remove comentários e parte por ponto-e-vírgula', () => {
    const sql = `
-- cabeçalho
create table if not exists foo (id int);
-- outro
create index if not exists foo_idx on foo (id);
`
    expect(splitSqlStatements(sql)).toEqual([
      'create table if not exists foo (id int)',
      'create index if not exists foo_idx on foo (id)',
    ])
  })

  it('não corta -- dentro de string', () => {
    const sql = `insert into t (n) values ('a--b');`
    expect(splitSqlStatements(sql)).toEqual([`insert into t (n) values ('a--b')`])
  })
})

describe('assertSafeDbFileName', () => {
  it('aceita nome simples .sql', () => {
    expect(assertSafeDbFileName('delta-finance.sql')).toBe('delta-finance.sql')
  })

  it('rejeita path traversal', () => {
    expect(() => assertSafeDbFileName('../schema.sql')).toThrow(/inválido/)
    expect(() => assertSafeDbFileName('db/schema.sql')).toThrow(/inválido/)
    expect(() => assertSafeDbFileName('schema.txt')).toThrow(/inválido/)
  })
})

describe('migrations registry', () => {
  const env = process.env

  beforeEach(() => {
    process.env = { ...env }
    delete process.env.APP_SURFACE
    delete process.env.NEXT_PUBLIC_APP_SURFACE
    delete process.env.PRO_MIGRATIONS_ON_ROM
  })

  afterEach(() => {
    process.env = env
  })

  it('carrega manifest e ids únicos', () => {
    const { migrations } = loadMigrationsManifest()
    const ids = migrations.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(migrations[0]?.id).toBe('001_base_schema')
  })

  it('painel deste repo tem todos os arquivos presentes', () => {
    const panel = panelOfThisRepo()
    const list = listMigrationsForPanel(panel)
    expect(list.length).toBeGreaterThan(0)
    for (const m of list) {
      expect(existsSync(join(process.cwd(), 'db', m.file))).toBe(true)
      expect(m.panels).toContain(panel)
    }
  })

  it('Vitrini tem pipeline completo sem seed de equipe de outra unidade', () => {
    const list = listMigrationsForPanel('vitrini')
    const files = list.map((migration) => migration.file)

    expect(files).toContain('schema.sql')
    expect(files).toContain('delta-vitrini-staff-links.sql')
    expect(files).not.toContain('delta-telegram-staff-links.sql')
    for (const migration of list) {
      expect(existsSync(join(process.cwd(), 'db', migration.file))).toBe(true)
    }
  })

  it('no surface ROM não inclui migrations exclusivas do HairSales', () => {
    process.env.APP_SURFACE = 'rom'

    const list = listMigrationsForPanel('vitrini')
    const ids = list.map((migration) => migration.id)

    expect(ids).not.toEqual(expect.arrayContaining(PRO_MIGRATION_IDS))
    expect(list.some((migration) => migration.panels.includes('hairsales'))).toBe(false)
  })

  it('no surface HairSales ignora ROM_PANEL e lista apenas migrations hairsales', () => {
    process.env.APP_SURFACE = 'hairsales'
    process.env.ROM_PANEL = 'brasil'
    process.env.NEXT_PUBLIC_ROM_PANEL = 'brasil'

    const list = listMigrationsForPanel('vitrini')
    const ids = list.map((migration) => migration.id)

    expect(ids).toEqual(PRO_MIGRATION_IDS)
    expect(list.every((migration) => migration.panels.includes('hairsales'))).toBe(true)
  })

  it('permite escape hatch transitório para Pro migrations no ROM', () => {
    process.env.APP_SURFACE = 'rom'
    process.env.PRO_MIGRATIONS_ON_ROM = '1'

    const list = listMigrationsForPanel('vitrini')
    const ids = list.map((migration) => migration.id)

    expect(ids).toContain('001_base_schema')
    expect(ids).toEqual(expect.arrayContaining(PRO_MIGRATION_IDS))
  })

  it('falha se arquivo do outro painel estiver ausente neste repo', () => {
    const panel = panelOfThisRepo()
    const other: RomPanelId = panel === 'brasil' ? 'iguatemi' : 'brasil'
    const otherFile =
      other === 'iguatemi' ? 'delta-parity-brasil.sql' : 'delta-telegram-staff-links.sql'
    if (existsSync(join(process.cwd(), 'db', otherFile))) return
    expect(() => listMigrationsForPanel(other)).toThrow(MissingMigrationFileError)
  })
})
