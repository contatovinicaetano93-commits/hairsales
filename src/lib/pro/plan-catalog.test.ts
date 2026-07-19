import { describe, expect, it } from 'vitest'
import {
  getProPlanOffer,
  labelForDbPlan,
  listProPlanOffers,
  publicPlanFromDb,
} from '@/lib/pro/plan-catalog'

describe('plan-catalog', () => {
  it('expõe Standard 29,90 e Pro 199,90', () => {
    const plans = listProPlanOffers()
    expect(plans).toHaveLength(2)
    expect(getProPlanOffer('standard')?.amountCents).toBe(2990)
    expect(getProPlanOffer('pro')?.amountCents).toBe(19990)
  })

  it('mapeia free do banco para Standard na UI', () => {
    expect(publicPlanFromDb('free')).toBe('standard')
    expect(labelForDbPlan('free')).toBe('Standard')
    expect(getProPlanOffer('free')?.id).toBe('standard')
  })
})
