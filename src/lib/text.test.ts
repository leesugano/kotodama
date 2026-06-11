import { describe, expect, it } from 'vitest'
import {
  countWords,
  deriveTitle,
  estimateSeconds,
  formatDuration,
  formatModifiedDate,
} from './text'

describe('countWords', () => {
  it('conta palavras separadas por espaços e quebras de linha', () => {
    expect(countWords('um dois três')).toBe(3)
    expect(countWords('um\ndois\n\ntrês  quatro')).toBe(4)
  })

  it('retorna 0 para texto vazio ou só espaços', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   \n  ')).toBe(0)
  })
})

describe('estimateSeconds', () => {
  it('estima a duração com o wpm padrão de 140', () => {
    expect(estimateSeconds(140)).toBe(60)
    expect(estimateSeconds(70)).toBe(30)
  })

  it('retorna 0 sem palavras', () => {
    expect(estimateSeconds(0)).toBe(0)
  })
})

describe('formatDuration', () => {
  it('formata segundos e minutos', () => {
    expect(formatDuration(45)).toBe('45s')
    expect(formatDuration(60)).toBe('1min 00s')
    expect(formatDuration(125)).toBe('2min 05s')
  })
})

describe('deriveTitle', () => {
  it('usa a primeira linha não vazia', () => {
    expect(deriveTitle('\n\nMeu roteiro\nresto')).toBe('Meu roteiro')
  })

  it('trunca títulos longos em 80 caracteres', () => {
    const long = 'a'.repeat(100)
    expect(deriveTitle(long)).toBe(`${'a'.repeat(80)}...`)
  })

  it('cai no padrão quando não há texto', () => {
    expect(deriveTitle('')).toBe('Sem título')
  })
})

describe('formatModifiedDate', () => {
  const now = Date.UTC(2026, 5, 12, 12, 0, 0)

  it('formata intervalos relativos', () => {
    expect(formatModifiedDate(now - 30_000, now)).toBe('agora')
    expect(formatModifiedDate(now - 5 * 60_000, now)).toBe('há 5min')
    expect(formatModifiedDate(now - 3 * 3_600_000, now)).toBe('há 3h')
    expect(formatModifiedDate(now - 24 * 3_600_000, now)).toBe('ontem')
    expect(formatModifiedDate(now - 3 * 86_400_000, now)).toBe('há 3 dias')
  })
})
