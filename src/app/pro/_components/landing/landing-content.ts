export type LandingModalId =
  | 'como-funciona'
  | 'produtos'
  | 'contato'
  | 'duvidas'
  | 'sobre'

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

export const PRODUCT_TABS: ProductTab[] = [
  {
    id: 'standard',
    label: 'Standard · R$ 29,90',
    description: 'App + Telegram para o profissional individual. Assinatura mensal.',
    cards: [
      {
        title: 'App Hoje',
        accent: 'KPIs do seu dia',
        points: [
          'Faturamento, ticket e agenda',
          'Meta diária e semanal',
          'Ocupação e leads quentes',
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
          'Sem WhatsApp Cloud',
        ],
      },
      {
        title: 'Ações',
        accent: 'Reativação e retorno',
        points: [
          'Clientes sumidos há 45+ dias',
          'Sugestões de upsell / retorno',
          'Lista clara para agir no dia',
        ],
      },
    ],
    footer: {
      badge: 'R$ 29,90/mês',
      title: 'Pague e depois complete o cadastro',
      body: 'Checkout Stripe → criar senha e conectar Avec ou Trinks.',
    },
  },
  {
    id: 'pro',
    label: 'Pro · R$ 199,90',
    description: 'Tudo do Standard + WhatsApp Cloud, mais cota de IA e packs de marketing.',
    cards: [
      {
        title: 'WhatsApp Cloud',
        accent: 'Só no Pro',
        points: [
          'Token por assinante (Conectar)',
          'Embedded Signup Meta (quando ativo)',
          'Utility incluso + marketing sob demanda',
        ],
      },
      {
        title: 'Mais IA',
        accent: '150 unidades / dia',
        points: [
          'Até 4.000 unidades / mês',
          'Briefing e perguntas com folga',
          'KPIs seguem mesmo se a cota zerar',
        ],
      },
      {
        title: 'Packs marketing',
        accent: '50 · 100 · 250 msgs',
        points: [
          'Compra via Stripe Checkout',
          'Créditos no seu WhatsApp Cloud',
          'Portal do cliente para gerenciar',
        ],
      },
      {
        title: 'Assinatura',
        accent: 'R$ 199,90/mês',
        points: [
          'Checkout antes do cadastro',
          'Upgrade a partir do Standard',
          'Portal Stripe para faturas e cancelamento',
        ],
      },
    ],
    footer: {
      badge: 'Pro',
      title: 'WhatsApp Cloud incluso na mensalidade',
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
          'Token criptografado',
          'Match pelo nome profissional',
          'Sync da sua agenda',
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
        title: 'Onboarding',
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
    body: 'Cole o token Avec (ou Trinks) e confirme o match do nome.',
  },
  {
    step: '04',
    title: 'Use a assistente',
    body: 'App e Telegram no Standard; WhatsApp Cloud no Pro.',
  },
]

export const DUVIDAS = [
  {
    q: 'Quem vê meus dados?',
    a: 'Só você. A agenda conecta no seu nome e o app mostra clientes, horários e ações do seu perfil.',
  },
  {
    q: 'Qual a diferença entre Standard e Pro?',
    a: 'Standard (R$ 29,90): App + Telegram + IA. Pro (R$ 199,90): tudo isso + WhatsApp Cloud, mais cota de IA e packs de marketing.',
  },
  {
    q: 'Preciso pagar antes de criar a conta?',
    a: 'Sim, no app do profissional. Você assina na landing, paga no Stripe e só então conclui nome e senha.',
  },
  {
    q: 'Isso substitui o painel da unidade?',
    a: 'Não. HairSales é o app do profissional. O painel da equipe da unidade continua em /login, com acesso normal.',
  },
  {
    q: 'Quais agendas funcionam?',
    a: 'Avec primeiro; Trinks também. O match é pelo nome profissional cadastrado na agenda.',
  },
]

export const CONTATO = {
  title: 'Fale com a gente',
  body: 'Dúvidas de onboarding, agenda ou plano — use o e-mail da sua conta ou o suporte do projeto.',
  points: [
    'Suporte de produto: pelo e-mail usado no cadastro',
    'Painel da unidade (equipe): acesse /login',
    'Cobrança: Stripe Customer Portal na aba Conectar',
  ],
}

export const SOBRE = {
  title: 'HairSales',
  body: 'HairSales é o app do profissional de beleza: agenda, clientes, metas e ações do dia — com assistente e canais (Telegram no Standard, WhatsApp Cloud no Pro).',
  points: [
    'Produto: HairSales',
    'Standard: R$ 29,90/mês',
    'Pro: R$ 199,90/mês',
    'Painel da equipe: acesso separado em /login',
  ],
}

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
    detail: 'WhatsApp Cloud + mais IA',
  },
  {
    id: 'como-funciona' as const,
    title: 'Como funciona',
    subtitle: '4 passos',
    detail: 'Plano → pagamento → conta → agenda',
  },
]
