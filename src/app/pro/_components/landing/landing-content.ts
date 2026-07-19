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
    id: 'free',
    label: 'Plano Free',
    description:
      'App + Telegram para o profissional individual.',
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
        accent: 'Canal grátis incluso',
        points: [
          'Vínculo com código no app',
          'Briefing e alertas no celular',
          'Sem WhatsApp Cloud no Free',
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
      badge: 'Comece agora',
      title: 'Crie a conta e conecte Avec ou Trinks',
      body: 'Validamos o seu nome na agenda. Um assinante = um profissional.',
    },
  },
  {
    id: 'pro',
    label: 'Plano Pro',
    description:
      'Tudo do Free com WhatsApp Cloud, mais cota de IA e packs de marketing.',
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
        accent: 'Stripe Checkout + Portal',
        points: [
          'Upgrade na aba Conectar',
          'Cancelamento e faturas no Portal',
          'Gestão da assinatura no app',
        ],
      },
    ],
    footer: {
      badge: 'Pro',
      title: 'WhatsApp Cloud liberado após o upgrade',
      body: 'Free continua com App + Telegram. Pro adiciona o canal oficial da Meta.',
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
          'Conta → agenda → meta',
          'Telegram opcional',
          'Pro + WhatsApp quando quiser',
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
    title: 'Crie sua conta',
    body: 'E-mail e senha do profissional.',
  },
  {
    step: '02',
    title: 'Conecte a agenda',
    body: 'Cole o token Avec (ou Trinks) e confirme o nome como está no sistema.',
  },
  {
    step: '03',
    title: 'Defina a meta',
    body: 'Meta diária e semanal — o Hoje mostra o quanto falta.',
  },
  {
    step: '04',
    title: 'Use a assistente',
    body: 'App, Telegram (Free) ou WhatsApp Cloud (Pro).',
  },
]

export const DUVIDAS = [
  {
    q: 'Quem vê meus dados?',
    a: 'Só você. A agenda conecta no seu nome e o app mostra clientes, horários e ações do seu perfil.',
  },
  {
    q: 'Isso substitui o painel da unidade?',
    a: 'Não. HairSales é o app do profissional. O painel da equipe da unidade continua em /login.',
  },
  {
    q: 'Preciso do Pro para começar?',
    a: 'Não. Free inclui App + Telegram + assistente com cota diária. Pro libera WhatsApp Cloud e mais IA.',
  },
  {
    q: 'Quais agendas funcionam?',
    a: 'Avec primeiro; Trinks também. O match é pelo nome profissional cadastrado na agenda.',
  },
  {
    q: 'E o WhatsApp?',
    a: 'No Free você usa Telegram. WhatsApp Cloud (API oficial Meta) está no Plano Pro, com token por assinante.',
  },
]

export const CONTATO = {
  title: 'Fale com a gente',
  body: 'Dúvidas de onboarding, agenda ou plano Pro — use o e-mail da sua conta ou o suporte do projeto.',
  points: [
    'Suporte de produto: pelo e-mail usado no cadastro',
    'Painel da unidade (equipe): acesse /login',
    'Cobrança Pro: Stripe Customer Portal na aba Conectar',
  ],
}

export const SOBRE = {
  title: 'HairSales',
  body: 'HairSales é o app do profissional de beleza: agenda, clientes, metas e ações do dia — com assistente e canais (Telegram no Free, WhatsApp Cloud no Pro).',
  points: [
    'Produto: HairSales',
    'Foco: profissional individual',
    'Princípio: um assinante = um profissional',
    'Canais: App, Telegram e WhatsApp Cloud (Pro)',
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
    id: 'register' as const,
    title: 'Criar conta',
    subtitle: 'Começar no Free',
    detail: 'App + Telegram no Free',
  },
  {
    id: 'produtos' as const,
    title: 'Planos',
    subtitle: 'Free e Pro',
    detail: 'Compare cotas e WhatsApp Cloud',
  },
  {
    id: 'como-funciona' as const,
    title: 'Como funciona',
    subtitle: '4 passos',
    detail: 'Conta → agenda → meta → assistente',
  },
]
