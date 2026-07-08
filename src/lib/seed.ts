import { getSql } from '@/lib/db'
import { upsertContact, updateContact, logEvent } from '@/lib/contacts'
import { addService, scheduleService } from '@/lib/services'

export interface SeedResult {
  contacts: number
  services: number
  message: string
}

export async function runSeed(): Promise<SeedResult> {
  const sql = getSql()
  const existing = (await sql`select count(*)::int as n from contacts`) as { n: number }[]
  if ((existing[0]?.n ?? 0) > 0) {
    return { contacts: 0, services: 0, message: 'Banco já tem contatos — seed ignorado para não duplicar.' }
  }

  const demos = [
    {
      name: 'Mariana Oliveira',
      phone: '+5511987654321',
      email: 'mariana@demo.com',
      channel: 'whatsapp' as const,
      source: 'seed',
      status: 'em_atendimento' as const,
      notes: 'Quer coloração nas próximas semanas.',
      services: [
        { name: 'Corte feminino', category: 'corte' as const, cadenceDays: 45 },
        { name: 'Hidratação', category: 'tratamento' as const, cadenceDays: 30, overdue: true },
      ],
    },
    {
      name: 'Roberto Alves',
      phone: '+5511976543210',
      channel: 'manual' as const,
      source: 'seed',
      status: 'agendado' as const,
      services: [
        { name: 'Corte masculino', category: 'corte' as const, cadenceDays: 21, scheduleTomorrow: true },
      ],
    },
    {
      name: 'Fernanda Lima',
      phone: '+5511965432109',
      channel: 'telegram' as const,
      source: 'seed',
      status: 'novo' as const,
      notes: 'Primeiro contato hoje.',
      services: [],
    },
    {
      name: 'Patricia Souza',
      phone: '+5511954321098',
      channel: 'avec' as const,
      source: 'seed',
      status: 'convertido' as const,
      avecClientId: 'seed-004',
      services: [
        { name: 'Escova progressiva', category: 'tratamento' as const, cadenceDays: 90 },
        { name: 'Manutenção raiz', category: 'coloracao' as const, cadenceDays: 45, dueSoon: true },
      ],
    },
    {
      name: 'Lucas Ferreira',
      phone: '+5511943210987',
      channel: 'instagram' as const,
      source: 'seed',
      status: 'perdido' as const,
      services: [{ name: 'Barba', category: 'corte' as const, cadenceDays: 14 }],
    },
    {
      name: 'Camila Rocha',
      phone: '+5511932109876',
      channel: 'whatsapp' as const,
      source: 'seed',
      status: 'em_atendimento' as const,
      services: [
        { name: 'Massagem relaxante', category: 'bem_estar' as const, cadenceDays: 30, scheduleToday: true },
      ],
    },
  ]

  let contactCount = 0
  let serviceCount = 0

  for (const d of demos) {
    const contact = await upsertContact({
      name: d.name,
      phone: d.phone,
      email: d.email,
      channel: d.channel,
      source: d.source,
      status: d.status,
      avecClientId: d.avecClientId,
    })
    contactCount++

    if (d.notes) await updateContact(contact.id, { notes: d.notes })

    for (const s of d.services) {
      const svc = await addService(contact.id, {
        name: s.name,
        category: s.category,
        cadenceDays: s.cadenceDays,
      })
      serviceCount++

      if ('overdue' in s && s.overdue) {
        const past = new Date()
        past.setDate(past.getDate() - (s.cadenceDays + 5))
        const sql2 = getSql()
        await sql2`update client_services set last_done_at = ${past.toISOString()} where id = ${svc.id}`
      } else if ('dueSoon' in s && s.dueSoon) {
        const past = new Date()
        past.setDate(past.getDate() - (s.cadenceDays - 3))
        const sql2 = getSql()
        await sql2`update client_services set last_done_at = ${past.toISOString()} where id = ${svc.id}`
      }

      if ('scheduleTomorrow' in s && s.scheduleTomorrow) {
        const when = new Date()
        when.setDate(when.getDate() + 1)
        when.setHours(10, 30, 0, 0)
        await scheduleService(svc.id, when.toISOString())
      }
      if ('scheduleToday' in s && s.scheduleToday) {
        const when = new Date()
        when.setHours(15, 0, 0, 0)
        if (when.getTime() < Date.now()) when.setDate(when.getDate() + 1)
        await scheduleService(svc.id, when.toISOString())
      }
    }

    await logEvent({
      contactId: contact.id,
      channel: d.channel,
      direction: 'in',
      handledBy: 'system',
      payload: { seed: true, name: d.name },
    })
  }

  return {
    contacts: contactCount,
    services: serviceCount,
    message: `${contactCount} contatos e ${serviceCount} serviços de demonstração criados.`,
  }
}
