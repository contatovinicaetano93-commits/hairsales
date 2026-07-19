import { describe, expect, it } from 'vitest'
import { AI_UNIT_COST } from './quotas'

describe('AI_UNIT_COST', () => {
  it('mantém custos do plano Standard/Pro', () => {
    expect(AI_UNIT_COST.question).toBe(1)
    expect(AI_UNIT_COST.client_brief).toBe(2)
    expect(AI_UNIT_COST.briefing).toBe(5)
  })
})
