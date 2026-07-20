export type LandingModalId =
  | 'como-funciona'
  | 'produtos'
  | 'contato'
  | 'duvidas'
  | 'sobre'

export type SubscribePlanId = 'standard' | 'pro'

export interface PlanComparisonColumn {
  id: SubscribePlanId
  label: string
  price: string
  period: string
  description: string
  bullets: string[]
  featured?: boolean
}

export interface LandingNavItem {
  id: LandingModalId
  label: string
}

export interface ProductCard {
  title: string
  accent: string
  points: string[]
}

export interface ProductTab {
  id: string
  label: string
  description: string
  cards: ProductCard[]
  footer?: {
    badge: string
    title: string
    body: string
  }
}

export const LANDING_NAV: LandingNavItem[] = [
  { id: 'como-funciona', label: 'Como funciona' },
  { id: 'produtos', label: 'Produtos' },
  { id: 'contato', label: 'Contato' },
  { id: 'duvidas', label: 'Dúvidas' },
  { id: 'sobre', label: 'Sobre' },
]

export const PLAN_COMPARISON: PlanComparisonColumn[] = [
  {
    id: 'standard',
    label: 'Standard',
    price: 'R$ 29,90',
    period: '/mês',
    description: 'App + Telegram para o profissional individual.',
    bullets: [
      'App Hoje — faturamento, ticket, agenda e metas',
      'Assistente — 40 unidades de IA / dia',
      'Telegram — briefing e alertas no celular',
      'Ações — reativação e retorno de clientes',
    ],
  },
  {
    id: 'pro',
    label: 'Pro',
    price: 'R$ 199,90',
    period: '/mês',
    description: 'Tudo do Standard + WhatsApp e mais IA.',
    featured: true,
    bullets: [
      'Tudo do Standard incluso',
      'WhatsApp — canal oficial da Meta',
      'Assistente — 150 unidades de IA / dia',
      'Créditos extras de mensagens — 50 · 100 · 250',
    ],
  },
]

export const PRODUCT_TABS: ProductTab[] = [
  {
    id: 'standard',
    label: 'Standard · R$ 29,90',
    description: 'App + Telegram para o profissional individual. Assinatura mensal.',
    cards: [
      {
        title: 'App Hoje',
        accent: 'Resumo do seu dia',
        points: [
          'Faturamento, ticket e agenda',
          'Meta diária e semanal',
          'Ocupação e clientes em potencial',
        ],
      },
      {
        title: 'Assistente',
        accent: '40 unidades de IA / dia',
        points: [
          'Perguntas sobre sua agenda',
          'Briefing da manhã',
          'Respostas práticas do dia',
        ],
      },
      {
        title: 'Telegram',
        accent: 'Incluso no Standard',
        points: [
          'Vínculo com código no app',
          'Briefing e alertas no celular',
          'Sem WhatsApp',
        ],
      },
      {
        title: 'Ações',
        accent: 'Reativação e retorno',
        points: [
          'Clientes sumidos há 45+ dias',
          'Sugestões de retorno',
          'Lista clara para agir no dia',
        ],
      },
    ],
    footer: {
      badge: 'R$ 29,90/mês',
      title: 'Pague e depois complete o cadastro',
      body: 'Pague, crie sua senha e conecte a Avec ou Trinks.',
    },
  },
  {
    id: 'pro',
    label: 'Pro · R$ 199,90',
    description: 'Tudo do Standard + WhatsApp, mais IA e créditos extras de mensagens.',
    cards: [
      {
        title: 'WhatsApp',
        accent: 'Só no Pro',
        points: [
          'Token por assinante (Conectar)',
          'Conectar automaticamente com a Meta (quando disponível)',
          'Lembretes inclusos + mensagens de reativação sob demanda',
        ],
      },
      {
        title: 'Mais IA',
        accent: '150 unidades / dia',
        points: [
          'Até 4.000 unidades / mês',
          'Briefing e perguntas com folga',
          'Seus dados continuam disponíveis mesmo sem IA',
        ],
      },
      {
        title: 'Créditos de mensagens',
        accent: '50 · 100 · 250 msgs',
        points: [
          'Compra rápida e segura',
          'Créditos pro seu WhatsApp',
          'Gerencie tudo numa área própria',
        ],
      },
      {
        title: 'Assinatura',
        accent: 'R$ 199,90/mês',
        points: [
          'Pagamento antes de criar a conta',
          'Mude do Standard pro Pro quando quiser',
          'Acompanhe faturas e cancele quando quiser',
        ],
      },
    ],
    footer: {
      badge: 'Pro',
      title: 'WhatsApp incluso na mensalidade',
      body: 'Standard continua com App + Telegram. Pro adiciona o canal oficial da Meta.',
    },
  },
  {
    id: 'features',
    label: 'Funcionalidades',
    description: 'O que você usa no dia a dia depois de conectar a agenda.',
    cards: [
      {
        title: 'Agenda',
        accent: 'Avec primeiro, depois Trinks',
        points: [
          'Chave de acesso protegida',
          'Localiza pelo seu nome na agenda',
          'Sincroniza sua agenda automaticamente',
        ],
      },
      {
        title: 'Clientes',
        accent: 'Sua base',
        points: [
          'Histórico do seu atendimento',
          'Quem reativar e quem retornar',
          'Lista pronta para o dia',
        ],
      },
      {
        title: 'Metas',
        accent: 'Dia e semana',
        points: [
          'Defina no Conectar',
          'Progresso no Hoje',
          'Assistente responde sobre a meta',
        ],
      },
      {
        title: 'Primeiros passos',
        accent: 'Checklist guiado',
        points: [
          'Pagamento → conta → agenda',
          'Telegram no Standard',
          'WhatsApp no Pro',
        ],
      },
    ],
    footer: {
      badge: 'No app',
      title: 'Tudo no fluxo do profissional',
      body: 'HairSales concentra Hoje, Assistente, Clientes, Ações e Conectar num só lugar.',
    },
  },
]

export const COMO_FUNCIONA_STEPS = [
  {
    step: '01',
    title: 'Escolha o plano',
    body: 'Standard (R$ 29,90) ou Pro (R$ 199,90) — mensal via Stripe.',
  },
  {
    step: '02',
    title: 'Pague e complete o cadastro',
    body: 'Após o checkout, defina senha e o nome como está na agenda.',
  },
  {
    step: '03',
    title: 'Conecte a agenda',
    body: 'Cole a chave de acesso da Avec (ou Trinks) e confirme seu nome.',
  },
  {
    step: '04',
    title: 'Use a assistente',
    body: 'App e Telegram no Standard; WhatsApp no Pro.',
  },
]

export const DUVIDAS = [
  {
    q: 'Quem vê meus dados?',
    a: 'Só você. A agenda conecta no seu nome e o app mostra clientes, horários e ações do seu perfil.',
  },
  {
    q: 'Qual a diferença entre Standard e Pro?',
    a: 'Standard (R$ 29,90): App + Telegram + IA. Pro (R$ 199,90): tudo isso + WhatsApp, mais IA e créditos extras de mensagens.',
  },
  {
    q: 'Preciso pagar antes de criar a conta?',
    a: 'Sim. Você assina no site, faz o pagamento e só então cria sua senha.',
  },
  {
    q: 'Isso substitui o painel da equipe do salão?',
    a: 'Não. HairSales é o app individual do profissional. O painel da equipe/salão é outro sistema, separado.',
  },
  {
    q: 'Quais agendas funcionam?',
    a: 'Avec primeiro; Trinks também. O match é pelo nome profissional cadastrado na agenda.',
  },
]

export const CONTATO = {
  title: 'Fale com a gente',
  body: 'Dúvidas sobre como começar, sua agenda ou seu plano — use o e-mail da sua conta ou fale com o suporte.',
  points: [
    'Suporte de produto: pelo e-mail usado no cadastro',
    'Painel da equipe/salão: sistema separado — fale com quem administra sua unidade',
    'Cobrança: gerencie na aba Conectar',
  ],
}

export const SOBRE = {
  title: 'HairSales',
  body: 'HairSales é o app do profissional de beleza: agenda, clientes, metas e ações do dia — com assistente e canais (Telegram no Standard, WhatsApp no Pro).',
  points: [
    'Produto: HairSales',
    'Standard: R$ 29,90/mês',
    'Pro: R$ 199,90/mês',
    'Painel da equipe/salão: sistema separado',
  ],
}

/** Faixa de confiança abaixo dos cards — fatos do produto, sem métricas inventadas. */
export const TRUST_STRIP = {
  headline: 'Integrações reais nos planos',
  bullets: [
    'Agenda Avec e Trinks',
    'Telegram no Standard',
    'WhatsApp no Pro',
  ],
} as const

export const HERO_CARDS = [
  {
    id: 'login' as const,
    title: 'Entrar',
    subtitle: 'Já tenho conta',
    detail: 'Acesse Hoje, Assistente e Ações',
  },
  {
    id: 'standard' as const,
    title: 'Standard',
    subtitle: 'R$ 29,90/mês',
    detail: 'App + Telegram + assistente',
  },
  {
    id: 'pro' as const,
    title: 'Pro',
    subtitle: 'R$ 199,90/mês',
    detail: 'WhatsApp + mais IA',
  },
  {
    id: 'como-funciona' as const,
    title: 'Como funciona',
    subtitle: '4 passos',
    detail: 'Plano → pagamento → conta → agenda',
  },
]
