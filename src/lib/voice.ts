/**
 * Voice tracking: pure helpers that match speech recognition transcripts
 * against the script so the prompter can follow the speaker.
 *
 * Matching is intentionally forgiving: recognition output is noisy, so a
 * greedy scan inside a small lookahead window advances the cursor past
 * misrecognized or skipped words without ever jumping far ahead.
 */

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

/** True when a and b differ by at most one edit (substitution, insert, delete). */
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++
      j++
      continue
    }
    if (++edits > 1) return false
    if (a.length > b.length) i++
    else if (b.length > a.length) j++
    else {
      i++
      j++
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}

/**
 * Forgiving comparison between a script token and a spoken token. Interim
 * transcripts often carry truncated words ("brow" for "brown") and engines
 * miss inflections, so prefixes and single-letter slips count as a match.
 */
export function tokensMatch(script: string, spoken: string): boolean {
  if (script === spoken) return true
  const min = Math.min(script.length, spoken.length)
  if (
    min >= 4 &&
    Math.abs(script.length - spoken.length) <= 3 &&
    (script.startsWith(spoken) || spoken.startsWith(script))
  ) {
    return true
  }
  if (min >= 5) return withinOneEdit(script, spoken)
  return false
}

/** Number of trailing spoken tokens used as the alignment anchor. */
export const RECENT_TAIL = 8
/** Distance (in tokens) at or below which a 2-word run is enough to advance. */
export const NEAR = 16
/** How far ahead of the cursor alignment will look for a confident match. */
export const ALIGN_LOOKAHEAD = 60
/** Matched-token runs required to accept a near advance vs. a far jump. */
export const NEAR_MIN_RUN = 2
/** Matched-token run required to accept an advance beyond the near window. */
export const FAR_MIN_RUN = 3

/**
 * Aligns the tail of recognized speech against the script ahead of the cursor.
 *
 * Speech engines rewrite interim transcripts constantly, so re-matching the
 * whole utterance is unstable. Instead we look only at the last few spoken
 * tokens ("what is being said now") and find the script position where that
 * short run best fits. The cursor is monotonic — it only ever moves forward —
 * and a move is accepted only on a confident run (≥2 tokens nearby, ≥3 for a
 * long jump), so a lone common word or a noisy revision never drags the
 * prompter around.
 */
export function alignCursor(
  scriptTokens: string[],
  committed: number,
  spokenTokens: string[],
  opts?: { lookahead?: number; recentTail?: number },
): number {
  const lookahead = opts?.lookahead ?? ALIGN_LOOKAHEAD
  const recentTail = opts?.recentTail ?? RECENT_TAIL
  const tail = spokenTokens.slice(-recentTail)
  if (tail.length === 0) return committed

  const limit = Math.min(committed + lookahead, scriptTokens.length)
  let bestEnd = committed
  let bestScore = 0

  /* For each candidate end position, walk backward counting how many of the
     tail tokens match the script ending there, tolerating one skipped script
     token. The nearest position wins ties (strict >), keeping moves small. */
  for (let candidate = committed + 1; candidate <= limit; candidate++) {
    let score = 0
    let gaps = 0
    let s = candidate - 1
    let t = tail.length - 1
    while (s >= committed && t >= 0) {
      if (tokensMatch(scriptTokens[s], tail[t])) {
        score++
        s--
        t--
      } else {
        if (++gaps > 1) break
        s--
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestEnd = candidate
    }
  }

  if (bestEnd <= committed) return committed
  const minRun = bestEnd - committed > NEAR ? FAR_MIN_RUN : NEAR_MIN_RUN
  return bestScore >= minRun ? bestEnd : committed
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

/* Sensible regional defaults when only the primary language subtag matches */
const PRIMARY_DEFAULTS: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
  fr: 'fr-FR',
  zh: 'zh-CN',
}

/** Finds the closest entry in SPEECH_LANGUAGES for a BCP-47 tag, if any. */
export function matchSpeechLang(tag: string): string | null {
  if (!tag) return null
  const lower = tag.toLowerCase()
  const exact = SPEECH_LANGUAGES.find((l) => l.code.toLowerCase() === lower)
  if (exact) return exact.code
  const primary = lower.split('-')[0]
  if (PRIMARY_DEFAULTS[primary]) return PRIMARY_DEFAULTS[primary]
  const prefixed = SPEECH_LANGUAGES.find((l) =>
    l.code.toLowerCase().startsWith(`${primary}-`),
  )
  return prefixed?.code ?? null
}

/**
 * Resolves the speech recognition language: an explicit user choice wins;
 * otherwise the browser language decides (the Web Speech API cannot detect
 * the spoken language by itself, so this is the closest thing to automatic).
 */
export function resolveSpeechLang(stored: string): string {
  if (stored) return stored
  const browserTag =
    typeof navigator !== 'undefined' ? (navigator.language ?? '') : ''
  return matchSpeechLang(browserTag) ?? 'en-US'
}
