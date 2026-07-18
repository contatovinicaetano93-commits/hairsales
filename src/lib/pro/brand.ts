/** Marca do app do profissional (B2C) — independente do painel da unidade. */
export interface ProBrand {
  name: string
  shortName: string
  tagline: string
  productLine: string
}

export const PRO_BRAND: ProBrand = {
  name: 'HairSales',
  shortName: 'hairsales',
  tagline: 'Agenda, clientes, metas e ações — só os seus dados.',
  productLine: 'App do profissional',
}

export function getProBrand(): ProBrand {
  return PRO_BRAND
}
