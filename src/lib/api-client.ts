const DEFAULT_TIMEOUT_MS = 15_000

export class ApiTimeoutError extends Error {
  constructor() {
    super('Tempo de conexão esgotado. Verifique sua internet e tente de novo.')
    this.name = 'ApiTimeoutError'
  }
}

/**
 * Fetch autenticado — envia cookie de sessão, aborta em timeoutMs (padrão 15s,
 * importante em wifi de salão) e redireciona pro login em 401 em vez de deixar
 * a tela travada em "carregando".
 */
export async function apiFetch(
  input: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = init ?? {}
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true })

  try {
    const res = await fetch(input, { ...rest, credentials: 'include', signal: controller.signal })
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.assign('/pro/login')
    }
    return res
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new ApiTimeoutError()
    }
    throw e
  } finally {
    clearTimeout(timeout)
  }
}

interface ApiResult<T> {
  ok: boolean
  data: T | null
  error: string | null
  status: number
}

/** Como apiFetch, mas já parseia o envelope `{ data, error }` das rotas /api/*. */
export async function apiJson<T = unknown>(
  input: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<ApiResult<T>> {
  try {
    const res = await apiFetch(input, init)
    const json = await res.json().catch(() => null)
    return {
      ok: res.ok && !json?.error,
      data: (json?.data ?? null) as T | null,
      error: json?.error ?? (res.ok ? null : 'Erro inesperado'),
      status: res.status,
    }
  } catch (e) {
    return {
      ok: false,
      data: null,
      error: e instanceof Error ? e.message : 'Erro de conexão',
      status: 0,
    }
  }
}
