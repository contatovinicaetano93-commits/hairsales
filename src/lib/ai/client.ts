import Anthropic from '@anthropic-ai/sdk'
import { getBrand } from '@/lib/brand'

function fallbackReply() {
  const brand = getBrand()
  return `Olá! Sou a recepcionista virtual do ${brand.aiPersonaName}. Posso ajudar com agendamento, valores ou tirar dúvidas sobre nossos serviços. O que você precisa?`
}

let client: Anthropic | null = null

function getClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada')
    client = new Anthropic({ apiKey })
  }
  return client
}

export function isAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim())
}

export function getAiModel() {
  return process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'
}

async function askAIWithRetry(
  systemPrompt: string,
  userMessage: string,
  maxRetries: number = 2,
): Promise<string> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15_000)

      const res = await Promise.race([
        getClient().messages.create({
          model: getAiModel(),
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI request timeout')), 15_000),
        ),
      ])

      clearTimeout(timeout)

      const block = res.content.find((c) => c.type === 'text')
      return block?.type === 'text' ? block.text.trim() : ''
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))

      const isRetryable =
        lastError.message.includes('timeout') ||
        lastError.message.includes('rate_limit') ||
        lastError.message.includes('overloaded')

      if (attempt < maxRetries && isRetryable) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 8000)
        await new Promise((resolve) => setTimeout(resolve, backoffMs))
        continue
      }

      throw lastError
    }
  }

  throw lastError
}

export async function askAI(
  systemPrompt: string,
  userMessage: string,
  fallback: () => string = fallbackReply,
): Promise<string> {
  if (!isAiConfigured()) {
    return fallback()
  }

  try {
    return await askAIWithRetry(systemPrompt, userMessage)
  } catch (e) {
    return fallback()
  }
}
