import { describe, expect, it } from 'vitest'
import {
  clampCountdown,
  clampEyeLinePosition,
  clampFontSize,
  clampMargin,
  clampSpeed,
  DEFAULT_SETTINGS,
  loadSettings,
  SPEED_PRESETS,
} from './settings'

describe('clamps', () => {
  it('mantém a velocidade entre 10 e 200 px/s', () => {
    expect(clampSpeed(5)).toBe(10)
    expect(clampSpeed(60)).toBe(60)
    expect(clampSpeed(999)).toBe(200)
  })

  it('mantém a fonte entre 24 e 96px', () => {
    expect(clampFontSize(10)).toBe(24)
    expect(clampFontSize(48)).toBe(48)
    expect(clampFontSize(200)).toBe(96)
  })

  it('mantém o countdown entre 0 e 10s', () => {
    expect(clampCountdown(-1)).toBe(0)
    expect(clampCountdown(3)).toBe(3)
    expect(clampCountdown(99)).toBe(10)
  })

  it('mantém a linha-guia entre 15% e 85%', () => {
    expect(clampEyeLinePosition(0)).toBe(15)
    expect(clampEyeLinePosition(33)).toBe(33)
    expect(clampEyeLinePosition(100)).toBe(85)
  })

  it('mantém as margens entre 0% e 25%', () => {
    expect(clampMargin(-5)).toBe(0)
    expect(clampMargin(7)).toBe(7)
    expect(clampMargin(50)).toBe(25)
  })
})

describe('loadSettings', () => {
  it('retorna os padrões fora do browser (SSR)', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
})

describe('SPEED_PRESETS', () => {
  it('todos os presets ficam dentro dos limites de velocidade', () => {
    for (const preset of SPEED_PRESETS) {
      expect(clampSpeed(preset.speed)).toBe(preset.speed)
    }
  })
})
