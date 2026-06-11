import { useEffect, useRef, useState } from 'react'
import { tokenize } from '../lib/voice'

/* Minimal Web Speech API surface; lib.dom has no SpeechRecognition types */
interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: { transcript: string }
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionErrorEventLike {
  error: string
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognition() !== null
}

export interface UtteranceEvent {
  /** Every token of the utterance recognized so far, oldest first */
  tokens: string[]
  /** The engine committed this utterance; its text will not change again */
  isFinal: boolean
  /** First event of a new utterance (or of a restarted engine) */
  isNew: boolean
}

/**
 * Runs continuous speech recognition while `active`. Each event carries the
 * FULL token list of the current utterance, so the consumer can re-match it
 * from a stable baseline — interim transcripts get revised by the engine
 * ("brow" becomes "brown"), and incremental diffs would lose those fixes.
 * The engine restarts automatically after the silences that end it.
 */
export function useVoiceTracking({
  active,
  lang,
  onUtterance,
  onPermissionDenied,
  onUnavailable,
}: {
  active: boolean
  lang: string
  onUtterance: (event: UtteranceEvent) => void
  onPermissionDenied: () => void
  onUnavailable: () => void
}): void {
  const [supported] = useState(isSpeechRecognitionSupported)
  const onUtteranceRef = useRef(onUtterance)
  const onDeniedRef = useRef(onPermissionDenied)
  const onUnavailableRef = useRef(onUnavailable)
  onUtteranceRef.current = onUtterance
  onDeniedRef.current = onPermissionDenied
  onUnavailableRef.current = onUnavailable

  useEffect(() => {
    if (!active || !supported) return
    const Recognition = getSpeechRecognition()
    if (!Recognition) return

    let stopped = false
    /* Errors since the last result: stop restarting when the engine is
       clearly broken (offline, no speech service) instead of looping */
    let consecutiveErrors = 0
    let restartTimer: ReturnType<typeof setTimeout> | null = null
    /* results index of the utterance currently being recognized; the
       results list resets on every engine (re)start */
    let utteranceIndex = -1
    const recognition = new Recognition()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      const lastIndex = event.results.length - 1
      const last = event.results[lastIndex]
      if (!last) return
      consecutiveErrors = 0
      const isNew = utteranceIndex !== lastIndex
      utteranceIndex = lastIndex
      const tokens = tokenize(last[0].transcript)
      if (tokens.length > 0) {
        onUtteranceRef.current({
          tokens,
          isFinal: Boolean(last.isFinal),
          isNew,
        })
      }
    }

    recognition.onerror = (event) => {
      if (
        event.error === 'not-allowed' ||
        event.error === 'service-not-allowed'
      ) {
        stopped = true
        onDeniedRef.current()
        return
      }
      /* 'no-speech' is routine silence, anything else counts as a failure */
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        consecutiveErrors += 1
      }
    }

    /* Engines stop after a silence; keep listening while active */
    recognition.onend = () => {
      if (stopped) return
      if (consecutiveErrors >= 3) {
        stopped = true
        onUnavailableRef.current()
        return
      }
      utteranceIndex = -1
      restartTimer = setTimeout(() => {
        try {
          recognition.start()
        } catch {
          // already started or shutting down: ignore
        }
      }, 250)
    }

    try {
      recognition.start()
    } catch {
      // start may throw if called twice in a race: ignore
    }

    return () => {
      stopped = true
      if (restartTimer) clearTimeout(restartTimer)
      recognition.onresult = null
      recognition.onend = null
      recognition.onerror = null
      try {
        recognition.stop()
      } catch {
        // already stopped
      }
    }
  }, [active, lang, supported])
}
