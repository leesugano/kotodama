import { describe, expect, it } from 'vitest'
import {
  advanceCursor,
  buildScriptIndex,
  matchSpeechLang,
  resolveSpeechLang,
  SPEECH_LANGUAGES,
  tokenize,
  tokensMatch,
} from './voice'

describe('tokenize', () => {
  it('lowercases and strips punctuation and diacritics', () => {
    expect(tokenize('Hello, World!')).toEqual(['hello', 'world'])
    expect(tokenize('Coração — não é fácil.')).toEqual([
      'coracao',
      'nao',
      'e',
      'facil',
    ])
  })

  it('splits CJK text into single characters', () => {
    expect(tokenize('こんにちは')).toEqual(['こ', 'ん', 'に', 'ち', 'は'])
    expect(tokenize('日本語のテスト')).toEqual([
      '日',
      '本',
      '語',
      'の',
      'テ',
      'ス',
      'ト',
    ])
  })

  it('ignores pure punctuation and empty chunks', () => {
    expect(tokenize('--- ... !!')).toEqual([])
    expect(tokenize('')).toEqual([])
  })

  it('keeps numbers', () => {
    expect(tokenize('Take 2 begins')).toEqual(['take', '2', 'begins'])
  })
})

describe('buildScriptIndex', () => {
  it('maps every token back to its rendered word', () => {
    const { tokens, tokenToWord } = buildScriptIndex(['Hello,', 'world!'])
    expect(tokens).toEqual(['hello', 'world'])
    expect(tokenToWord).toEqual([0, 1])
  })

  it('maps several CJK tokens to the same word chunk', () => {
    const { tokens, tokenToWord } = buildScriptIndex(['日本語', 'test'])
    expect(tokens).toEqual(['日', '本', '語', 'test'])
    expect(tokenToWord).toEqual([0, 0, 0, 1])
  })

  it('skips punctuation-only chunks without breaking the mapping', () => {
    const { tokens, tokenToWord } = buildScriptIndex(['a', '...', 'b'])
    expect(tokens).toEqual(['a', 'b'])
    expect(tokenToWord).toEqual([0, 2])
  })
})

describe('tokensMatch', () => {
  it('matches exact tokens', () => {
    expect(tokensMatch('hello', 'hello')).toBe(true)
    expect(tokensMatch('a', 'a')).toBe(true)
  })

  it('matches interim prefixes of longer words', () => {
    expect(tokensMatch('brown', 'brow')).toBe(true)
    expect(tokensMatch('gravando', 'grava')).toBe(true)
  })

  it('forgives a single-letter slip in longer words', () => {
    expect(tokensMatch('quick', 'quack')).toBe(true)
    expect(tokensMatch('velocidade', 'velocidades')).toBe(true)
  })

  it('rejects different words', () => {
    expect(tokensMatch('cat', 'car')).toBe(false)
    expect(tokensMatch('banana', 'window')).toBe(false)
  })
})

describe('advanceCursor', () => {
  const script = tokenize('the quick brown fox jumps over the lazy dog')

  it('advances through correctly recognized words', () => {
    expect(advanceCursor(script, 0, ['the', 'quick', 'brown'])).toBe(3)
  })

  it('skips misrecognized words and recovers on the next match', () => {
    expect(advanceCursor(script, 0, ['the', 'banana', 'brown'])).toBe(3)
  })

  it('re-matching a revised utterance from its baseline is stable', () => {
    /* interim "the quick brow" then revised "the quick brown fox" */
    const first = advanceCursor(script, 0, ['the', 'quick', 'brow'])
    expect(first).toBe(3)
    const revised = advanceCursor(script, 0, ['the', 'quick', 'brown', 'fox'])
    expect(revised).toBe(4)
  })

  it('jumps ahead when the speaker skips words', () => {
    expect(advanceCursor(script, 0, ['fox', 'jumps'])).toBe(5)
  })

  it('never advances past the lookahead window', () => {
    expect(advanceCursor(script, 0, ['dog'], 4)).toBe(0)
  })

  it('ignores tokens that match nothing', () => {
    expect(advanceCursor(script, 2, ['banana'])).toBe(2)
  })

  it('stops at the end of the script', () => {
    expect(advanceCursor(script, 7, ['lazy', 'dog', 'extra'])).toBe(9)
  })
})

describe('SPEECH_LANGUAGES', () => {
  it('offers a broad set of unique BCP-47 tags', () => {
    expect(SPEECH_LANGUAGES.length).toBeGreaterThanOrEqual(50)
    const codes = SPEECH_LANGUAGES.map((l) => l.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})

describe('matchSpeechLang', () => {
  it('matches exact BCP-47 tags case-insensitively', () => {
    expect(matchSpeechLang('pt-br')).toBe('pt-BR')
    expect(matchSpeechLang('ja-JP')).toBe('ja-JP')
  })

  it('falls back to a regional default for primary subtags', () => {
    expect(matchSpeechLang('en')).toBe('en-US')
    expect(matchSpeechLang('pt')).toBe('pt-BR')
    expect(matchSpeechLang('es')).toBe('es-ES')
    expect(matchSpeechLang('de')).toBe('de-DE')
    expect(matchSpeechLang('ja')).toBe('ja-JP')
  })

  it('returns null for unknown languages', () => {
    expect(matchSpeechLang('xx-XX')).toBe(null)
    expect(matchSpeechLang('')).toBe(null)
  })
})

describe('resolveSpeechLang', () => {
  it('prefers the explicit user choice', () => {
    expect(resolveSpeechLang('ja-JP')).toBe('ja-JP')
  })

  it('falls back to en-US outside the browser', () => {
    expect(resolveSpeechLang('')).toBe('en-US')
  })
})
