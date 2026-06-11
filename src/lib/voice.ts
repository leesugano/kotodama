/**
 * Voice tracking: pure helpers that match speech recognition transcripts
 * against the script so the prompter can follow the speaker.
 *
 * Matching is intentionally forgiving: recognition output is noisy, so a
 * greedy scan inside a small lookahead window advances the cursor past
 * misrecognized or skipped words without ever jumping far ahead.
 */

/** How many script tokens ahead of the cursor a spoken token may match. */
export const MATCH_LOOKAHEAD = 16

const CJK_RE =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/

/**
 * Normalizes a chunk of text into comparable tokens: lowercased, without
 * diacritics or punctuation. CJK text has no word boundaries, so each CJK
 * character becomes its own token (works for ja/zh/ko transcripts too).
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = []
  for (const raw of text.split(/\s+/)) {
    const cleaned = raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]/gu, '')
    if (!cleaned) continue
    if (CJK_RE.test(cleaned)) {
      for (const char of cleaned) tokens.push(char)
    } else {
      tokens.push(cleaned)
    }
  }
  return tokens
}

export interface ScriptIndex {
  /** Normalized tokens of the whole script, in reading order */
  tokens: string[]
  /** For each token, the index of the rendered word chunk it belongs to */
  tokenToWord: number[]
}

/**
 * Builds the matching index from the word chunks the prompter renders.
 * A chunk may produce zero tokens (pure punctuation) or several (CJK).
 */
export function buildScriptIndex(words: string[]): ScriptIndex {
  const tokens: string[] = []
  const tokenToWord: number[] = []
  words.forEach((word, wordIndex) => {
    for (const token of tokenize(word)) {
      tokens.push(token)
      tokenToWord.push(wordIndex)
    }
  })
  return { tokens, tokenToWord }
}

/**
 * Advances the cursor through the script tokens given newly spoken tokens.
 * Each spoken token may match anywhere inside the lookahead window; matches
 * move the cursor just past the matched token. Unmatched tokens are ignored.
 */
export function advanceCursor(
  scriptTokens: string[],
  cursor: number,
  spokenTokens: string[],
  lookahead: number = MATCH_LOOKAHEAD,
): number {
  let position = cursor
  for (const spoken of spokenTokens) {
    const end = Math.min(position + lookahead, scriptTokens.length)
    for (let i = position; i < end; i++) {
      if (scriptTokens[i] === spoken) {
        position = i + 1
        break
      }
    }
  }
  return position
}

/**
 * Languages offered for speech recognition. Web Speech API engines accept
 * BCP-47 tags; this list covers what Chrome, Edge and Safari support today.
 * Labels are in the language itself, as is standard for language pickers.
 */
export const SPEECH_LANGUAGES: ReadonlyArray<{
  code: string
  label: string
}> = [
  { code: 'af-ZA', label: 'Afrikaans' },
  { code: 'ar-SA', label: 'العربية' },
  { code: 'bg-BG', label: 'Български' },
  { code: 'ca-ES', label: 'Català' },
  { code: 'cs-CZ', label: 'Čeština' },
  { code: 'da-DK', label: 'Dansk' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'el-GR', label: 'Ελληνικά' },
  { code: 'en-AU', label: 'English (Australia)' },
  { code: 'en-CA', label: 'English (Canada)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'en-IN', label: 'English (India)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'es-AR', label: 'Español (Argentina)' },
  { code: 'es-ES', label: 'Español (España)' },
  { code: 'es-MX', label: 'Español (México)' },
  { code: 'es-US', label: 'Español (Estados Unidos)' },
  { code: 'fa-IR', label: 'فارسی' },
  { code: 'fi-FI', label: 'Suomi' },
  { code: 'fil-PH', label: 'Filipino' },
  { code: 'fr-CA', label: 'Français (Canada)' },
  { code: 'fr-FR', label: 'Français (France)' },
  { code: 'he-IL', label: 'עברית' },
  { code: 'hi-IN', label: 'हिन्दी' },
  { code: 'hr-HR', label: 'Hrvatski' },
  { code: 'hu-HU', label: 'Magyar' },
  { code: 'id-ID', label: 'Bahasa Indonesia' },
  { code: 'it-IT', label: 'Italiano' },
  { code: 'ja-JP', label: '日本語' },
  { code: 'ko-KR', label: '한국어' },
  { code: 'lt-LT', label: 'Lietuvių' },
  { code: 'lv-LV', label: 'Latviešu' },
  { code: 'ms-MY', label: 'Bahasa Melayu' },
  { code: 'nb-NO', label: 'Norsk bokmål' },
  { code: 'nl-NL', label: 'Nederlands' },
  { code: 'pl-PL', label: 'Polski' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'pt-PT', label: 'Português (Portugal)' },
  { code: 'ro-RO', label: 'Română' },
  { code: 'ru-RU', label: 'Русский' },
  { code: 'sk-SK', label: 'Slovenčina' },
  { code: 'sl-SI', label: 'Slovenščina' },
  { code: 'sr-RS', label: 'Српски' },
  { code: 'sv-SE', label: 'Svenska' },
  { code: 'th-TH', label: 'ไทย' },
  { code: 'tr-TR', label: 'Türkçe' },
  { code: 'uk-UA', label: 'Українська' },
  { code: 'vi-VN', label: 'Tiếng Việt' },
  { code: 'zh-CN', label: '中文（简体）' },
  { code: 'zh-HK', label: '中文（香港）' },
  { code: 'zh-TW', label: '中文（繁體）' },
]

/** Maps the UI locale to a sensible default speech recognition language. */
export function defaultVoiceLang(locale: string): string {
  if (locale === 'pt-BR') return 'pt-BR'
  if (locale === 'ja') return 'ja-JP'
  return 'en-US'
}
