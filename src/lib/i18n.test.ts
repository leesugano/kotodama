import { describe, expect, it } from 'vitest'
import { getLocale, t } from './i18n'

describe('i18n', () => {
  it('usa pt-BR como locale padrão fora do browser', () => {
    expect(getLocale()).toBe('pt-BR')
  })

  it('resolve strings em pt-BR por padrão', () => {
    expect(t('editor.start')).toBe('Iniciar prompter')
    expect(t('prompter.notFound')).toBe('Roteiro não encontrado')
    expect(t('settings.countdown')).toBe('Contagem regressiva')
  })
})
