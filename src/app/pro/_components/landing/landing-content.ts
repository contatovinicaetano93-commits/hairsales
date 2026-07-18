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
  { id: 'sobre', label: 'Quem é o Vitrini' },
]

export const PRODUCT_TABS: ProductTab[] = [
  {
    id: 'free',
    label: 'Plano Free',
    description:
      'App + Telegram para o profissional individual. Só os seus dados da agenda entram.',
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
          'Respostas só com os seus dados',
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
          'Sem misturar dados da unidade',
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
          'Token só seu, criptografado',
          'Match pelo nome profissional',
          'Nada de visão salon-wide',
        ],
      },
      {
        title: 'Clientes',
        accent: 'Sua base filtrada',
        points: [
          'Histórico do que é seu',
          'Quem reativar e quem retornar',
          'Sem cruzar dados de outros pros',
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
      badge: 'Privacidade',
      title: 'Só os seus dados',
      body: 'O Assistente Vitrini é do profissional individual — não é o painel da unidade (ROM).',
    },
  },
]

export const COMO_FUNCIONA_STEPS = [
  {
    step: '01',
    title: 'Crie sua conta',
    body: 'E-mail e senha do profissional. Sem acesso à operação da unidade.',
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
    body: 'App, Telegram (Free) ou WhatsApp Cloud (Pro) com os seus dados.',
  },
]

export const DUVIDAS = [
  {
    q: 'Isso substitui o painel do salão?',
    a: 'Não. O ROM continua para a equipe da unidade. O Assistente Vitrini é o app do profissional individual.',
  },
  {
    q: 'Quem vê meus dados?',
    a: 'Só você. Conectamos a agenda no seu nome e filtramos clientes, agenda e ações para o seu perfil.',
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
  title: 'Gabriel Vitrini',
  body: 'Assistente Vitrini é o produto B2C do profissional — empilhado na marca Gabriel Vitrini, sem apagar o ROM da operação.',
  points: [
    'Marca: Gabriel Vitrini',
    'Produto: Assistente Vitrini',
    'Foco: agenda, clientes, metas e ações do dia',
    'Princípio: um assinante = um profissional',
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
    detail: 'App + Telegram · só seus dados',
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
