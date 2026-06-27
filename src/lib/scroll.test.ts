import { describe, expect, it } from 'vitest'
import { scrubRatioToPos } from './scroll'

describe('scrubRatioToPos', () => {
  it('maps a clamped ratio onto the scroll range', () => {
    expect(scrubRatioToPos(0, 1000)).toBe(0)
    expect(scrubRatioToPos(1, 1000)).toBe(1000)
    expect(scrubRatioToPos(0.5, 1000)).toBe(500)
    expect(scrubRatioToPos(-1, 1000)).toBe(0)
    expect(scrubRatioToPos(2, 1000)).toBe(1000)
  })
})
