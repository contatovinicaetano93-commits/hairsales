'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronLeft,
  Phone,
  Mail,
  Sparkles,
  Check,
  Plus,
  X,
  Clock,
  AlertTriangle,
  CircleCheck,
} from 'lucide-react'
import {
  StatusPill,
  PrimaryButton,
  SectionCard,
  CHANNEL_LABEL,
  STATUS_LABEL,
} from '../../_components/ui'

interface Service {
  id: string
  name: string
  category: string
  cadence_days: number | null
  product: string | null
  notes: string | null
  next_due_at: string | null
  days_until: number | null
  state: 'overdue' | 'due_soon' | 'ok' | 'no_cadence'
}
interface Recommendation {
  type: 'overdue' | 'due_soon' | 'upsell' | 'crosssell'
  title: string
  detail: string
}
interface Contact {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  channel: string
  status: string
  notes: string | null
}
interface Profile {
  contact: Contact
  services: Service[]
  recommendations: Recommendation[]
}

const STATUS_FLOW = ['novo', 'em_atendimento', 'agendado', 'convertido', 'perdido']

const CATEGORY_LABEL: Record<string, string> = {
  corte: 'Corte',
  tratamento: 'Tratamento',
  coloracao: 'Coloração',
  bem_estar: 'Bem-estar',
  produto: 'Produto',
  outro: 'Outro',
}

const REC_TONE: Record<string, string> = {
  overdue: 'border-danger/40 bg-danger/10',
  due_soon: 'border-warning/40 bg-warning/10',
  upsell: 'border-gold/40 bg-gold/10',
  crosssell: 'border-sky-500/40 bg-sky-500/10',
}

function ServiceStateBadge({ state, days }: { state: Service['state']; days: number | null }) {
  if (state === 'overdue')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-danger/15 px-2 py-0.5 text-[0.65rem] font-semibold text-danger">
        <AlertTriangle size={11} /> Atrasado {Math.abs(days ?? 0)}d
      </span>
    )
  if (state === 'due_soon')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[0.65rem] font-semibold text-warning">
        <Clock size={11} /> Vence em {days}d
      </span>
    )
  if (state === 'ok')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[0.65rem] font-semibold text-success">
        <CircleCheck size={11} /> Em dia
      </span>
    )
  return <span className="rounded-full bg-border px-2 py-0.5 text-[0.65rem] font-semibold text-muted">Avulso</span>
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [brief, setBrief] = useState<{ text: string; source: string } | null>(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/contacts/${id}`, { cache: 'no-store' })
    const json = await res.json()
    if (json.error) setError(json.error)
    else setData(json.data)
  }, [id])

  useEffect(() => {
    fetch(`/api/contacts/${id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error)
        else setData(json.data)
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [id])

  async function changeStatus(status: string) {
    await fetch(`/api/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  async function markDone(serviceId: string) {
    await fetch(`/api/services/${serviceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'done' }),
    })
    load()
  }

  async function generateBrief() {
    setBriefLoading(true)
    try {
      const res = await fetch(`/api/contacts/${id}/brief`, { cache: 'no-store' })
      const json = await res.json()
      if (json.data) setBrief({ text: json.data.brief, source: json.data.source })
    } finally {
      setBriefLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="flex flex-1 flex-col gap-4 px-5 py-6">
        <div className="h-6 w-24 animate-pulse rounded bg-border" />
        <div className="h-28 animate-pulse rounded-2xl bg-card" />
        <div className="h-40 animate-pulse rounded-2xl bg-card" />
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="flex flex-1 flex-col gap-4 px-5 py-6">
        <button onClick={() => router.push('/contatos')} className="flex items-center gap-1 text-sm text-muted">
          <ChevronLeft size={18} /> Contatos
        </button>
        <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted">
          {error ?? 'Contato não encontrado.'}
        </p>
      </main>
    )
  }

  const { contact, services, recommendations } = data

  return (
    <main className="flex flex-1 flex-col gap-5 px-5 py-6">
      <button onClick={() => router.push('/contatos')} className="flex items-center gap-1 text-sm text-muted active:text-foreground">
        <ChevronLeft size={18} /> Contatos
      </button>

      {/* Perfil */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold">{contact.name ?? 'Sem nome'}</h1>
            <p className="mt-0.5 text-xs text-muted">{CHANNEL_LABEL[contact.channel] ?? contact.channel}</p>
          </div>
          <StatusPill status={contact.status} />
        </div>
        <div className="mt-4 flex flex-col gap-2 text-sm">
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-foreground/90">
              <Phone size={15} className="text-muted" /> {contact.phone}
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2 truncate text-foreground/90">
              <Mail size={15} className="text-muted" /> {contact.email}
            </a>
          )}
          {contact.notes && <p className="mt-1 text-xs leading-relaxed text-muted">{contact.notes}</p>}
        </div>
      </div>

      {/* Status guiado */}
      <SectionCard title="Status do atendimento">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {STATUS_FLOW.map((s) => {
            const active = contact.status === s
            return (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  active ? 'border-gold bg-gold/15 text-gold' : 'border-border text-muted active:text-foreground'
                }`}
              >
                {STATUS_LABEL[s] ?? s}
              </button>
            )
          })}
        </div>
      </SectionCard>

      {/* Briefing IA pro backstaff */}
      <SectionCard title="Briefing do backstaff">
        {brief ? (
          <div className="flex flex-col gap-3">
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{brief.text}</p>
            <span className="text-[0.65rem] uppercase tracking-wide text-muted">
              {brief.source === 'ai' ? 'Gerado por IA' : 'Gerado por regras (IA indisponível)'}
            </span>
          </div>
        ) : (
          <p className="mb-3 text-sm text-muted">
            Gere um resumo com as ações de cross-sell e up-sell recomendadas para este cliente.
          </p>
        )}
        <button
          onClick={generateBrief}
          disabled={briefLoading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 py-3 text-sm font-semibold text-gold active:scale-[0.99] transition-transform disabled:opacity-60"
        >
          <Sparkles size={16} />
          {briefLoading ? 'Gerando…' : brief ? 'Gerar novamente' : 'Gerar briefing'}
        </button>
      </SectionCard>

      {/* Recomendações */}
      {recommendations.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Ações recomendadas</h2>
          {recommendations.map((r, i) => (
            <div key={i} className={`rounded-2xl border p-4 ${REC_TONE[r.type] ?? 'border-border bg-card'}`}>
              <p className="text-sm font-semibold">{r.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-foreground/80">{r.detail}</p>
            </div>
          ))}
        </div>
      )}

      {/* Serviços */}
      <SectionCard
        title="Serviços & recorrência"
        badge={
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-1 text-xs font-semibold text-gold">
            <Plus size={14} /> Adicionar
          </button>
        }
      >
        <div className="flex flex-col gap-3">
          {services.length === 0 && <p className="py-4 text-center text-sm text-muted">Nenhum serviço cadastrado.</p>}
          {services.map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {CATEGORY_LABEL[s.category] ?? s.category}
                    {s.product ? ` · ${s.product}` : ''}
                    {s.cadence_days ? ` · a cada ${s.cadence_days}d` : ''}
                  </p>
                </div>
                <ServiceStateBadge state={s.state} days={s.days_until} />
              </div>
              <button
                onClick={() => markDone(s.id)}
                className="mt-3 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground/90 active:bg-card"
              >
                <Check size={13} /> Marcar como feito hoje
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      {addOpen && (
        <AddServiceSheet
          contactId={id}
          onClose={() => setAddOpen(false)}
          onAdded={() => {
            setAddOpen(false)
            load()
          }}
        />
      )}
    </main>
  )
}

function AddServiceSheet({
  contactId,
  onClose,
  onAdded,
}: {
  contactId: string
  onClose: () => void
  onAdded: () => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('corte')
  const [cadence, setCadence] = useState('')
  const [product, setProduct] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErr(null)
    try {
      const res = await fetch(`/api/contacts/${contactId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          cadenceDays: cadence ? Number(cadence) : undefined,
          product: product || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setErr(json.error ?? 'Erro ao salvar')
        return
      }
      onAdded()
    } catch (e) {
      setErr(String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="animate-fade-in absolute inset-0 bg-black/60" />
      <div
        className="animate-slide-up relative w-full max-w-md rounded-t-2xl border-t border-border bg-card-elevated p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Novo serviço</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-muted active:text-foreground">
            <X size={22} />
          </button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted">Serviço</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="Ex.: Corte de cabelo"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-gold"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted">Categoria</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-gold"
            >
              {Object.entries(CATEGORY_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-wide text-muted">Cadência (dias)</span>
              <input
                value={cadence}
                onChange={(e) => setCadence(e.target.value)}
                type="number"
                inputMode="numeric"
                placeholder="30"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-gold"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-wide text-muted">Produto</span>
              <input
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Opcional"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-gold"
              />
            </label>
          </div>
          {err && <p className="text-sm text-danger">{err}</p>}
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? 'Salvando…' : 'Adicionar serviço'}
          </PrimaryButton>
        </form>
      </div>
    </div>
  )
}
