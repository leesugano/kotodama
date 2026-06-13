import { describe, expect, it } from 'vitest'
import {
  loadThemePreference,
  parseStoredTheme,
  resolveTheme,
  systemPrefersDark,
} from './theme'

describe('parseStoredTheme', () => {
  it('accepts the two explicit values', () => {
    expect(parseStoredTheme('light')).toBe('light')
    expect(parseStoredTheme('dark')).toBe('dark')
  })

  it('treats null, empty, and garbage as "no preference"', () => {
    expect(parseStoredTheme(null)).toBeNull()
    expect(parseStoredTheme('')).toBeNull()
    expect(parseStoredTheme('system')).toBeNull()
    expect(parseStoredTheme('DARK')).toBeNull()
  })
})

describe('resolveTheme', () => {
  it('uses the explicit preference when set, ignoring the OS', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('follows the OS when there is no preference', () => {
    expect(resolveTheme(null, true)).toBe('dark')
    expect(resolveTheme(null, false)).toBe('light')
  })
})

describe('SSR safety', () => {
  it('returns null preference outside the browser', () => {
    expect(loadThemePreference()).toBeNull()
  })

  it('reports light when matchMedia is unavailable (SSR)', () => {
    expect(systemPrefersDark()).toBe(false)
  })
})
