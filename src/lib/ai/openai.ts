import OpenAI from 'openai'

let client: OpenAI | null = null

function getClient() {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY não configurada')
    client = new OpenAI({ apiKey })
  }
  return client
}

export async function askAI(systemPrompt: string, userMessage: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return 'Olá! Sou a recepcionista virtual do ROM Club. Posso ajudar com agendamento, valores ou tirar dúvidas sobre nossos serviços. O que você precisa?'
  }

  const res = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.4,
  })

  return res.choices[0]?.message?.content?.trim() ?? ''
}
