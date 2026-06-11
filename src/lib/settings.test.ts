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
  it('keeps the speed between 10 and 200 px/s', () => {
    expect(clampSpeed(5)).toBe(10)
    expect(clampSpeed(60)).toBe(60)
    expect(clampSpeed(999)).toBe(200)
  })

  it('keeps the font size between 24 and 96px', () => {
    expect(clampFontSize(10)).toBe(24)
    expect(clampFontSize(48)).toBe(48)
    expect(clampFontSize(200)).toBe(96)
  })

  it('keeps the countdown between 0 and 10s', () => {
    expect(clampCountdown(-1)).toBe(0)
    expect(clampCountdown(3)).toBe(3)
    expect(clampCountdown(99)).toBe(10)
  })

  it('keeps the eye line between 15% and 85%', () => {
    expect(clampEyeLinePosition(0)).toBe(15)
    expect(clampEyeLinePosition(33)).toBe(33)
    expect(clampEyeLinePosition(100)).toBe(85)
  })

  it('keeps the margins between 0% and 25%', () => {
    expect(clampMargin(-5)).toBe(0)
    expect(clampMargin(7)).toBe(7)
    expect(clampMargin(50)).toBe(25)
  })
})

describe('loadSettings', () => {
  it('returns the defaults outside the browser (SSR)', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('ships voice and camera off by default', () => {
    expect(DEFAULT_SETTINGS.voice).toBe(false)
    expect(DEFAULT_SETTINGS.camera).toBe(false)
    expect(DEFAULT_SETTINGS.voiceLang).toBe('en-US')
  })
})

describe('SPEED_PRESETS', () => {
  it('keeps every preset inside the speed limits', () => {
    for (const preset of SPEED_PRESETS) {
      expect(clampSpeed(preset.speed)).toBe(preset.speed)
    }
  })
})
