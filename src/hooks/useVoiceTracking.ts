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

/**
 * Runs continuous speech recognition while `active`, emitting newly spoken
 * tokens through `onTokens`. Interim results are diffed per utterance so the
 * same words are never emitted twice; the engine is restarted automatically
 * when it stops after a silence.
 */
export function useVoiceTracking({
  active,
  lang,
  onTokens,
  onPermissionDenied,
}: {
  active: boolean
  lang: string
  onTokens: (tokens: string[]) => void
  onPermissionDenied: () => void
}): void {
  const [supported] = useState(isSpeechRecognitionSupported)
  const onTokensRef = useRef(onTokens)
  const onDeniedRef = useRef(onPermissionDenied)
  onTokensRef.current = onTokens
  onDeniedRef.current = onPermissionDenied

  useEffect(() => {
    if (!active || !supported) return
    const Recognition = getSpeechRecognition()
    if (!Recognition) return

    let stopped = false
    /* Tokens already emitted for the utterance currently being recognized */
    let utterance = { resultIndex: -1, emitted: 0 }
    const recognition = new Recognition()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      const lastIndex = event.results.length - 1
      const last = event.results[lastIndex]
      if (!last) return
      if (utterance.resultIndex !== lastIndex) {
        utterance = { resultIndex: lastIndex, emitted: 0 }
      }
      const tokens = tokenize(last[0].transcript)
      if (tokens.length > utterance.emitted) {
        onTokensRef.current(tokens.slice(utterance.emitted))
        utterance.emitted = tokens.length
      }
    }

    recognition.onerror = (event) => {
      if (
        event.error === 'not-allowed' ||
        event.error === 'service-not-allowed'
      ) {
        stopped = true
        onDeniedRef.current()
      }
    }

    /* Engines stop after a silence; keep listening while active */
    recognition.onend = () => {
      if (stopped) return
      try {
        recognition.start()
      } catch {
        // already started or shutting down: ignore
      }
    }

    try {
      recognition.start()
    } catch {
      // start may throw if called twice in a race: ignore
    }

    return () => {
      stopped = true
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
