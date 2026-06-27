import { describe, expect, it } from 'vitest'
import {
  cleanText,
  countWords,
  deriveTitle,
  estimateSeconds,
  formatClock,
  formatDuration,
  formatModifiedDate,
} from './text'

describe('cleanText', () => {
  it('normalizes whitespace from pasted content', () => {
    expect(cleanText('a b')).toBe('a b')
    expect(cleanText('a\r\nb\rc')).toBe('a\nb\nc')
    expect(cleanText('a   \nb')).toBe('a\nb')
    expect(cleanText('a\n\n\n\n\nb')).toBe('a\n\nb')
  })
})

describe('countWords', () => {
  it('counts words separated by spaces and line breaks', () => {
    expect(countWords('one two three')).toBe(3)
    expect(countWords('one\ntwo\n\nthree  four')).toBe(4)
  })

  it('returns 0 for empty or whitespace-only text', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   \n  ')).toBe(0)
  })
})

describe('estimateSeconds', () => {
  it('estimates the duration with the default 140 wpm', () => {
    expect(estimateSeconds(140)).toBe(60)
    expect(estimateSeconds(70)).toBe(30)
  })

  it('returns 0 without words', () => {
    expect(estimateSeconds(0)).toBe(0)
  })
})

describe('formatDuration', () => {
  it('formats seconds and minutes', () => {
    expect(formatDuration(45)).toBe('45s')
    expect(formatDuration(60)).toBe('1min 00s')
    expect(formatDuration(125)).toBe('2min 05s')
  })
})

describe('deriveTitle', () => {
  it('uses the first non-empty line', () => {
    expect(deriveTitle('\n\nMy script\nrest')).toBe('My script')
  })

  it('truncates long titles at 80 characters', () => {
    const long = 'a'.repeat(100)
    expect(deriveTitle(long)).toBe(`${'a'.repeat(80)}...`)
  })

  it('falls back to the default when there is no text', () => {
    expect(deriveTitle('')).toBe('Untitled')
  })
})

describe('formatModifiedDate', () => {
  const now = Date.UTC(2026, 5, 12, 12, 0, 0)

  it('formats relative intervals', () => {
    expect(formatModifiedDate(now - 30_000, now)).toBe('now')
    expect(formatModifiedDate(now - 5 * 60_000, now)).toBe('5min ago')
    expect(formatModifiedDate(now - 3 * 3_600_000, now)).toBe('3h ago')
    expect(formatModifiedDate(now - 24 * 3_600_000, now)).toBe('yesterday')
    expect(formatModifiedDate(now - 3 * 86_400_000, now)).toBe('3 days ago')
  })
})

describe('formatClock', () => {
  it('formats seconds as m:ss', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(9)).toBe('0:09')
    expect(formatClock(65)).toBe('1:05')
    expect(formatClock(600)).toBe('10:00')
    expect(formatClock(3725)).toBe('62:05')
  })
  it('clamps invalid input to 0:00', () => {
    expect(formatClock(-5)).toBe('0:00')
    expect(formatClock(Number.NaN)).toBe('0:00')
  })
})
