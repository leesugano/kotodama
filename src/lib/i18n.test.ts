import { describe, expect, it } from 'vitest'
import { getLocale, t } from './i18n'

describe('i18n', () => {
  it('uses English as the default locale outside the browser', () => {
    expect(getLocale()).toBe('en')
  })

  it('resolves English strings by default', () => {
    expect(t('editor.start')).toBe('Start prompter')
    expect(t('prompter.notFound')).toBe('Script not found')
    expect(t('settings.countdown')).toBe('Countdown')
  })

  it('interpolates parameters', () => {
    expect(t('time.minutesAgo', { n: 5 })).toBe('5min ago')
    expect(t('time.daysAgo', { n: 3 })).toBe('3 days ago')
  })

  it('exposes theme toggle labels', () => {
    expect(t('theme.toDark')).toBe('Switch to dark mode')
    expect(t('theme.toLight')).toBe('Switch to light mode')
  })
})
