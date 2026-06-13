import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  FlipHorizontal2,
  FlipVertical2,
  Maximize,
  Mic,
  Minimize,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Video,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCamera } from '../hooks/useCamera'
import {
  isSpeechRecognitionSupported,
  type UtteranceEvent,
  useVoiceTracking,
} from '../hooks/useVoiceTracking'
import { useWakeLock } from '../hooks/useWakeLock'
import { t } from '../lib/i18n'
import { getScriptRepository } from '../lib/scripts/repository'
import type { Script } from '../lib/scripts/types'
import {
  COUNTDOWN_MAX,
  COUNTDOWN_MIN,
  clampCountdown,
  clampEyeLinePosition,
  clampFontSize,
  clampMargin,
  clampSpeed,
  EYELINE_MAX,
  EYELINE_MIN,
  FONT_STEP,
  loadSettings,
  MARGIN_MAX,
  MARGIN_MIN,
  SPEED_MAX,
  SPEED_MIN,
  SPEED_PRESETS,
  SPEED_STEP,
  saveSettings,
} from '../lib/settings'
import {
  alignCursor,
  buildScriptIndex,
  resolveSpeechLang,
  SPEECH_LANGUAGES,
} from '../lib/voice'

export const Route = createFileRoute('/prompter')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === 'string' ? search.id : '',
  }),
  component: PrompterPage,
})

const CONTROLS_HIDE_DELAY = 3000
/* Max delta per frame: avoids a jump when returning from a background tab */
const MAX_FRAME_DELTA = 0.1
/* A standalone line with 3+ hyphens splits the script into sections */
const SECTION_BREAK = /^[\t ]*-{3,}[\t ]*$/m
/* Where the spoken word should sit on screen when voice tracking scrolls */
const VOICE_ANCHOR = 0.4
/* How fast the scroll converges on the voice target (per second) */
const VOICE_EASE = 2.5
const NOTICE_HIDE_DELAY = 4000

const PRESET_LABELS = {
  calm: 'preset.calm',
  natural: 'preset.natural',
  fast: 'preset.fast',
} as const

function PrompterPage() {
  const { id } = Route.useSearch()
  const [script, setScript] = useState<Script | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    if (!id) {
      setScript(null)
      return
    }
    getScriptRepository()
      .get(id)
      .then((result) => {
        if (!cancelled) setScript(result)
      })
      .catch(() => {
        if (!cancelled) setScript(null)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (script === undefined) {
    return <div className="fixed inset-0 bg-ls-black" />
  }

  if (script === null) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-ls-black px-6">
        <p className="text-ls-white">{t('prompter.notFound')}</p>
        <Link to="/editor" className="text-sm text-ls-blue">
          {t('prompter.backToEditor')}
        </Link>
      </div>
    )
  }

  return <Prompter script={script} />
}

/* A section rendered as alternating word and whitespace chunks; words carry
   a global index so voice tracking can map a match back to a DOM node */
interface SectionChunks {
  chunks: Array<{ text: string; wordIndex: number | null }>
}

function splitSections(content: string): {
  sections: SectionChunks[]
  words: string[]
} {
  const words: string[] = []
  const sections = content
    .split(SECTION_BREAK)
    .map((part) => part.replace(/^\n+|\n+$/g, ''))
    .filter((part) => part.length > 0)
    .map((part) => {
      const chunks = part.split(/(\s+)/).map((text) => {
        if (!text || /^\s+$/.test(text)) {
          return { text, wordIndex: null }
        }
        words.push(text)
        return { text, wordIndex: words.length - 1 }
      })
      return { chunks }
    })
  return { sections, words }
}

function Prompter({ script }: { script: Script }) {
  const navigate = useNavigate()
  const initialSettings = useRef(loadSettings()).current

  const stageRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const posRef = useRef(0)
  const playingRef = useRef(false)
  const speedRef = useRef(initialSettings.speed)
  const countdownRef = useRef(initialSettings.countdown)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(initialSettings.speed)
  const [fontSize, setFontSize] = useState(initialSettings.fontSize)
  const [mirrorX, setMirrorX] = useState(initialSettings.mirrorX)
  const [mirrorY, setMirrorY] = useState(initialSettings.mirrorY)
  const [countdown, setCountdown] = useState(initialSettings.countdown)
  const [eyeLine, setEyeLine] = useState(initialSettings.eyeLine)
  const [eyeLinePosition, setEyeLinePosition] = useState(
    initialSettings.eyeLinePosition,
  )
  const [margin, setMargin] = useState(initialSettings.margin)
  const [camera, setCamera] = useState(initialSettings.camera)
  const [voice, setVoice] = useState(initialSettings.voice)
  const [voiceLang, setVoiceLang] = useState(initialSettings.speechLang)
  const [countdownLeft, setCountdownLeft] = useState<number | null>(null)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const voiceSupported = useMemo(isSpeechRecognitionSupported, [])

  playingRef.current = playing
  speedRef.current = speed
  countdownRef.current = countdown

  useWakeLock()

  useEffect(() => {
    saveSettings({
      speed,
      fontSize,
      mirrorX,
      mirrorY,
      countdown,
      eyeLine,
      eyeLinePosition,
      margin,
      camera,
      voice,
      speechLang: voiceLang,
    })
  }, [
    speed,
    fontSize,
    mirrorX,
    mirrorY,
    countdown,
    eyeLine,
    eyeLinePosition,
    margin,
    camera,
    voice,
    voiceLang,
  ])

  /* Sections: `---` lines become visual separators instead of text. Words
     are indexed so speech matches can be mapped back to a pixel position. */
  const { sections, words } = useMemo(
    () => splitSections(script.content),
    [script.content],
  )
  const scriptIndex = useMemo(() => buildScriptIndex(words), [words])
  const scriptIndexRef = useRef(scriptIndex)
  scriptIndexRef.current = scriptIndex

  /* Cache word spans by index for O(1) dimming and reset the spoken boundary
     whenever the rendered script changes. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when the rendered script changes; the effect reads the DOM, not sections directly
  useEffect(() => {
    const content = contentRef.current
    if (!content) return
    const arr: HTMLElement[] = []
    for (const el of content.querySelectorAll<HTMLElement>('[data-wi]')) {
      arr[Number(el.dataset.wi)] = el
    }
    wordSpansRef.current = arr
    spokenWordRef.current = -1
  }, [sections])

  const showNotice = useCallback((message: string) => {
    setNotice(message)
    setControlsVisible(true)
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = setTimeout(
      () => setNotice(null),
      NOTICE_HIDE_DELAY,
    )
  }, [])

  /* Camera self-view: stream lives behind the text with a dark scrim */
  const {
    videoRef,
    ready: cameraReady,
    denied: cameraDenied,
  } = useCamera(camera)

  useEffect(() => {
    if (camera && cameraDenied) {
      setCamera(false)
      showNotice(t('prompter.cameraDenied'))
    }
  }, [camera, cameraDenied, showNotice])

  /* Voice tracking state: the cursor walks the token list monotonically, the
     target is the scroll position that puts the last matched word on the
     anchor line. */
  const voiceCursorRef = useRef(0)
  const voiceTargetRef = useRef<number | null>(null)
  const voiceActiveRef = useRef(false)
  const wordSpansRef = useRef<HTMLElement[]>([])
  const spokenWordRef = useRef(-1)
  const eyeLineRef = useRef(eyeLine)
  const eyeLinePositionRef = useRef(eyeLinePosition)
  eyeLineRef.current = eyeLine
  eyeLinePositionRef.current = eyeLinePosition

  const voiceAnchor = useCallback(
    () =>
      eyeLineRef.current ? eyeLinePositionRef.current / 100 : VOICE_ANCHOR,
    [],
  )

  /* Dims every word up to `wordIndex` (inclusive) and un-dims the rest.
     Idempotent and direction-aware so re-syncing backward clears stale dimming.
     Uses the cached span array to avoid a React re-render every utterance. */
  const setSpokenBoundary = useCallback((wordIndex: number) => {
    const spans = wordSpansRef.current
    const prev = spokenWordRef.current
    if (wordIndex > prev) {
      for (let i = prev + 1; i <= wordIndex; i++) {
        spans[i]?.classList.add('spoken')
      }
    } else if (wordIndex < prev) {
      for (let i = wordIndex + 1; i <= prev; i++) {
        spans[i]?.classList.remove('spoken')
      }
    }
    spokenWordRef.current = wordIndex
  }, [])

  /* When voice tracking starts mid-script, align the cursor with whatever
     word currently sits on the anchor line instead of matching from the top */
  const syncVoiceCursor = useCallback(() => {
    const stage = stageRef.current
    const content = contentRef.current
    if (!stage || !content) return
    const anchorY = posRef.current + stage.clientHeight * voiceAnchor()
    const contentTop = content.getBoundingClientRect().top
    const spans = content.querySelectorAll<HTMLElement>('[data-wi]')
    let wordIndex = 0
    for (const span of spans) {
      const offset = span.getBoundingClientRect().top - contentTop
      if (offset >= anchorY) break
      wordIndex = Number(span.dataset.wi)
    }
    const index = scriptIndexRef.current
    let cursor = index.tokens.length
    for (let i = 0; i < index.tokenToWord.length; i++) {
      if (index.tokenToWord[i] >= wordIndex) {
        cursor = i
        break
      }
    }
    voiceCursorRef.current = cursor
    voiceTargetRef.current = null
    setSpokenBoundary(cursor > 0 ? index.tokenToWord[cursor - 1] : -1)
  }, [voiceAnchor, setSpokenBoundary])

  const handleUtterance = useCallback(
    ({ tokens }: UtteranceEvent) => {
      const index = scriptIndexRef.current
      const next = alignCursor(index.tokens, voiceCursorRef.current, tokens)
      if (next === voiceCursorRef.current) return
      voiceCursorRef.current = next
      const wordIndex = index.tokenToWord[next - 1]
      if (wordIndex !== undefined) setSpokenBoundary(wordIndex)
      const stage = stageRef.current
      const content = contentRef.current
      const span = content?.querySelector<HTMLElement>(
        `[data-wi="${wordIndex}"]`,
      )
      if (!stage || !content || !span) return
      const offset =
        span.getBoundingClientRect().top - content.getBoundingClientRect().top
      voiceTargetRef.current = offset - stage.clientHeight * voiceAnchor()
    },
    [voiceAnchor, setSpokenBoundary],
  )

  const voiceListening = voice && voiceSupported && playing
  /* Explicit choice wins; otherwise the browser language decides */
  const resolvedVoiceLang = useMemo(
    () => resolveSpeechLang(voiceLang),
    [voiceLang],
  )

  useEffect(() => {
    voiceActiveRef.current = voiceListening
    if (voiceListening) syncVoiceCursor()
  }, [voiceListening, syncVoiceCursor])

  useVoiceTracking({
    active: voiceListening,
    lang: resolvedVoiceLang,
    onUtterance: handleUtterance,
    onPermissionDenied: useCallback(() => {
      setVoice(false)
      showNotice(t('prompter.micDenied'))
    }, [showNotice]),
    onUnavailable: useCallback(() => {
      setVoice(false)
      showNotice(t('prompter.voiceUnavailable'))
    }, [showNotice]),
  })

  /* Scroll loop: requestAnimationFrame with delta time. In constant mode the
     speed is px/s independent of the framerate; in voice mode the position
     eases toward the last matched word instead. */
  useEffect(() => {
    let raf = 0
    let lastTs: number | null = null
    const tick = (ts: number) => {
      const dt =
        lastTs === null ? 0 : Math.min((ts - lastTs) / 1000, MAX_FRAME_DELTA)
      lastTs = ts
      const stage = stageRef.current
      const content = contentRef.current
      if (stage && content) {
        const max = Math.max(0, content.scrollHeight - stage.clientHeight)
        if (playingRef.current) {
          if (voiceActiveRef.current) {
            const target = voiceTargetRef.current
            if (target !== null) {
              const delta = target - posRef.current
              posRef.current += delta * Math.min(1, dt * VOICE_EASE)
            }
          } else {
            posRef.current += speedRef.current * dt
          }
        }
        posRef.current = Math.min(max, Math.max(0, posRef.current))
        content.style.transform = `translate3d(0, ${-posRef.current}px, 0)`
        if (progressRef.current) {
          const progress = max > 0 ? posRef.current / max : 0
          progressRef.current.style.transform = `scaleX(${progress})`
        }
        if (
          playingRef.current &&
          !voiceActiveRef.current &&
          max > 0 &&
          posRef.current >= max
        ) {
          setPlaying(false)
          setControlsVisible(true)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      if (playingRef.current) {
        setControlsVisible(false)
        setSettingsOpen(false)
      }
    }, CONTROLS_HIDE_DELAY)
  }, [])

  const showControls = useCallback(() => {
    setControlsVisible(true)
    scheduleHide()
  }, [scheduleHide])

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    }
  }, [])

  const cancelCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
    setCountdownLeft(null)
  }, [])

  /* Play goes through the countdown when configured; a tap during the
     countdown cancels and returns to the paused state */
  const startPlayback = useCallback(() => {
    setSettingsOpen(false)
    if (countdownRef.current > 0) {
      setCountdownLeft(countdownRef.current)
      setControlsVisible(false)
      countdownTimerRef.current = setInterval(() => {
        setCountdownLeft((prev) => {
          if (prev === null || prev <= 1) {
            if (countdownTimerRef.current) {
              clearInterval(countdownTimerRef.current)
              countdownTimerRef.current = null
            }
            setPlaying(true)
            scheduleHide()
            return null
          }
          return prev - 1
        })
      }, 1000)
    } else {
      setPlaying(true)
      scheduleHide()
    }
  }, [scheduleHide])

  const togglePlay = useCallback(() => {
    if (countdownTimerRef.current) {
      cancelCountdown()
      setControlsVisible(true)
      return
    }
    if (playingRef.current) {
      setPlaying(false)
      setControlsVisible(true)
    } else {
      startPlayback()
    }
  }, [cancelCountdown, startPlayback])

  const restart = useCallback(() => {
    posRef.current = 0
    voiceCursorRef.current = 0
    voiceTargetRef.current = null
    setSpokenBoundary(-1)
    showControls()
  }, [showControls, setSpokenBoundary])

  const changeSpeed = useCallback(
    (delta: number) => {
      setSpeed((prev) => clampSpeed(prev + delta))
      showControls()
    },
    [showControls],
  )

  const changeFontSize = useCallback(
    (delta: number) => {
      setFontSize((prev) => clampFontSize(prev + delta))
      showControls()
    },
    [showControls],
  )

  const toggleVoice = useCallback(() => {
    if (!voiceSupported) {
      showNotice(t('settings.voiceUnsupported'))
      return
    }
    setVoice((prev) => !prev)
    showControls()
  }, [voiceSupported, showNotice, showControls])

  const toggleCamera = useCallback(() => {
    setCamera((prev) => !prev)
    showControls()
  }, [showControls])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      document.documentElement.requestFullscreen().catch(() => {})
    }
  }, [])

  const exit = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
    navigate({ to: '/editor' })
  }, [navigate])

  /* Two-finger gestures: pinch adjusts the font, vertical swipe adjusts the
     speed. The dominant gesture wins to avoid accidental adjustments. */
  const gestureRef = useRef<{
    startDist: number
    startMidY: number
    startFontSize: number
    startSpeed: number
  } | null>(null)
  const lastGestureEndRef = useRef(0)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const measure = (touches: TouchList) => {
      const [a, b] = [touches[0], touches[1]]
      return {
        dist: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
        midY: (a.clientY + b.clientY) / 2,
      }
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const { dist, midY } = measure(e.touches)
        gestureRef.current = {
          startDist: dist,
          startMidY: midY,
          startFontSize: 0,
          startSpeed: 0,
        }
        /* read current values without recreating listeners on every change */
        setFontSize((current) => {
          if (gestureRef.current) gestureRef.current.startFontSize = current
          return current
        })
        setSpeed((current) => {
          if (gestureRef.current) gestureRef.current.startSpeed = current
          return current
        })
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      const gesture = gestureRef.current
      if (!gesture || e.touches.length !== 2) return
      e.preventDefault()
      const { dist, midY } = measure(e.touches)
      const distDelta = Math.abs(dist - gesture.startDist)
      const midDelta = Math.abs(midY - gesture.startMidY)
      if (distDelta >= midDelta) {
        const scale = dist / gesture.startDist
        setFontSize(clampFontSize(Math.round(gesture.startFontSize * scale)))
      } else {
        /* swiping up speeds up, down slows down */
        const deltaY = gesture.startMidY - midY
        setSpeed(clampSpeed(Math.round(gesture.startSpeed + deltaY * 0.4)))
      }
      setControlsVisible(true)
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (gestureRef.current && e.touches.length < 2) {
        gestureRef.current = null
        lastGestureEndRef.current = performance.now()
      }
    }

    stage.addEventListener('touchstart', onTouchStart, { passive: true })
    stage.addEventListener('touchmove', onTouchMove, { passive: false })
    stage.addEventListener('touchend', onTouchEnd, { passive: true })
    stage.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      stage.removeEventListener('touchstart', onTouchStart)
      stage.removeEventListener('touchmove', onTouchMove)
      stage.removeEventListener('touchend', onTouchEnd)
      stage.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  /* Tap toggles play, but not right after a two-finger gesture */
  const handleStageClick = useCallback(() => {
    if (performance.now() - lastGestureEndRef.current < 400) return
    togglePlay()
  }, [togglePlay])

  /* Try fullscreen on entry; fail silently if the browser requires a gesture */
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowUp':
          e.preventDefault()
          changeSpeed(SPEED_STEP)
          break
        case 'ArrowDown':
          e.preventDefault()
          changeSpeed(-SPEED_STEP)
          break
        case '+':
        case '=':
          changeFontSize(FONT_STEP)
          break
        case '-':
        case '_':
          changeFontSize(-FONT_STEP)
          break
        case 'r':
        case 'R':
          restart()
          break
        case 'm':
        case 'M':
          setMirrorX((prev) => !prev)
          showControls()
          break
        case 'v':
        case 'V':
          toggleVoice()
          break
        case 'c':
        case 'C':
          toggleCamera()
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        case 'Escape':
          /* With fullscreen active Esc exits fullscreen; without it, exits the prompter */
          if (!document.fullscreenElement) exit()
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    togglePlay,
    changeSpeed,
    changeFontSize,
    restart,
    toggleVoice,
    toggleCamera,
    toggleFullscreen,
    exit,
    showControls,
  ])

  const cameraVisible = camera && cameraReady

  return (
    /* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard control happens via global shortcuts */
    /* biome-ignore lint/a11y/noStaticElementInteractions: tap anywhere is the P0 play/pause gesture */
    <div
      ref={stageRef}
      className="fixed inset-0 cursor-default touch-none overflow-hidden bg-ls-black"
      onClick={handleStageClick}
      onPointerMove={showControls}
    >
      {/* Camera self-view: mirrored like a selfie, under a dark scrim */}
      {camera && (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
      )}
      {cameraVisible && (
        <div aria-hidden className="absolute inset-0 bg-ls-black/55" />
      )}

      {/* Progress bar: hairline at the top */}
      <div className="absolute inset-x-0 top-0 z-20 h-0.5 bg-ls-white/10">
        <div
          ref={progressRef}
          className="h-full w-full origin-left bg-ls-blue"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>

      {/* Mirroring for physical teleprompter rigs: applied to the whole stage */}
      <div
        className="relative h-full w-full"
        style={{
          transform: `scale(${mirrorX ? -1 : 1}, ${mirrorY ? -1 : 1})`,
        }}
      >
        <div ref={contentRef} className="will-change-transform">
          <div
            className="mx-auto max-w-[900px] pt-[55vh] pb-[55vh] text-center font-normal leading-[1.45] text-ls-white"
            style={{
              fontSize: `${fontSize}px`,
              paddingLeft: `${margin}vw`,
              paddingRight: `${margin}vw`,
              textShadow: cameraVisible ? '0 1px 8px rgba(0,0,0,0.8)' : 'none',
            }}
          >
            {sections.map((section, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: sections derive from the text and only change together
              <div key={index}>
                {index > 0 && (
                  <div
                    aria-hidden
                    className="mx-auto my-[1.6em] h-px w-[36%] bg-ls-white/20"
                  />
                )}
                <p className="whitespace-pre-wrap">
                  {section.chunks.map((chunk, chunkIndex) =>
                    chunk.wordIndex === null ? (
                      chunk.text
                    ) : (
                      <span
                        // biome-ignore lint/suspicious/noArrayIndexKey: chunks derive from the text and only change together
                        key={chunkIndex}
                        data-wi={chunk.wordIndex}
                      >
                        {chunk.text}
                      </span>
                    ),
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Eye line: keeps the gaze fixed near the camera */}
        {eyeLine && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 z-10"
            style={{ top: `${eyeLinePosition}%` }}
          >
            <div className="h-0.5 w-full bg-ls-blue opacity-30" />
          </div>
        )}

        {/* Countdown before the scroll starts */}
        {countdownLeft !== null && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-ls-black/70">
            <span
              key={countdownLeft}
              className="display countdown-pop text-[22vmin] tabular-nums text-ls-white"
            >
              {countdownLeft}
            </span>
          </div>
        )}
      </div>

      {/* Controls overlay: appears on touch or mouse, hides after 3s of scrolling */}
      <div
        className={`fade-overlay absolute inset-x-0 bottom-0 z-30 ${
          controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="toolbar"
        aria-label={t('prompter.controls')}
        tabIndex={-1}
      >
        {/* Transient notices: mic or camera permission problems */}
        {notice && (
          <p className="mx-auto mb-2 w-fit max-w-[calc(100vw-2rem)] rounded-card bg-ls-gray-900/95 px-4 py-2 text-sm text-ls-white">
            {notice}
          </p>
        )}

        {/* Settings panel: presets, countdown, eye line, margins, voice language */}
        {settingsOpen && (
          <div className="mx-auto mb-2 w-fit max-w-[calc(100vw-2rem)] rounded-card bg-ls-gray-900/95 px-5 py-4">
            <div className="flex w-64 flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-ls-gray-500">
                  {t('settings.presets')}
                </span>
                <div className="flex gap-1">
                  {SPEED_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSpeed(preset.speed)
                        showControls()
                      }}
                      aria-pressed={speed === preset.speed}
                      className={`rounded-btn px-2.5 py-1 text-xs transition-colors duration-[140ms] ${
                        speed === preset.speed
                          ? 'bg-ls-blue text-ls-white'
                          : 'text-ls-gray-500 hover:text-ls-white'
                      }`}
                    >
                      {t(PRESET_LABELS[preset.id])}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="countdown-range"
                  className="text-xs text-ls-gray-500"
                >
                  {t('settings.countdown')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="countdown-range"
                    type="range"
                    min={COUNTDOWN_MIN}
                    max={COUNTDOWN_MAX}
                    step={1}
                    value={countdown}
                    onChange={(e) =>
                      setCountdown(clampCountdown(Number(e.target.value)))
                    }
                    className="h-1 w-20 cursor-pointer accent-[var(--ls-blue)]"
                  />
                  <span className="w-14 text-right text-xs tabular-nums text-ls-gray-500">
                    {countdown === 0
                      ? t('settings.countdownOff')
                      : `${countdown}s`}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-ls-gray-500">
                  {t('settings.eyeLine')}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={eyeLine}
                  aria-label={t('settings.eyeLine')}
                  onClick={() => setEyeLine((prev) => !prev)}
                  className={`relative h-5 w-9 rounded-full transition-colors duration-[140ms] ${
                    eyeLine ? 'bg-ls-blue' : 'bg-ls-gray-500/40'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-ls-white transition-transform duration-[140ms] ${
                      eyeLine ? 'translate-x-4' : ''
                    }`}
                  />
                </button>
              </div>

              {eyeLine && (
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="eyeline-range"
                    className="text-xs text-ls-gray-500"
                  >
                    {t('settings.eyeLinePosition')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="eyeline-range"
                      type="range"
                      min={EYELINE_MIN}
                      max={EYELINE_MAX}
                      step={1}
                      value={eyeLinePosition}
                      onChange={(e) =>
                        setEyeLinePosition(
                          clampEyeLinePosition(Number(e.target.value)),
                        )
                      }
                      className="h-1 w-20 cursor-pointer accent-[var(--ls-blue)]"
                    />
                    <span className="w-14 text-right text-xs tabular-nums text-ls-gray-500">
                      {eyeLinePosition}%
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="margin-range"
                  className="text-xs text-ls-gray-500"
                >
                  {t('settings.margin')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="margin-range"
                    type="range"
                    min={MARGIN_MIN}
                    max={MARGIN_MAX}
                    step={1}
                    value={margin}
                    onChange={(e) =>
                      setMargin(clampMargin(Number(e.target.value)))
                    }
                    className="h-1 w-20 cursor-pointer accent-[var(--ls-blue)]"
                  />
                  <span className="w-14 text-right text-xs tabular-nums text-ls-gray-500">
                    {margin}%
                  </span>
                </div>
              </div>

              {voiceSupported ? (
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="voice-lang"
                    className="text-xs text-ls-gray-500"
                  >
                    {t('settings.voiceLang')}
                  </label>
                  <select
                    id="voice-lang"
                    value={voiceLang}
                    onChange={(e) => setVoiceLang(e.target.value)}
                    className="w-36 rounded-btn bg-ls-black/40 px-2 py-1.5 text-xs text-ls-white outline-none"
                  >
                    <option value="">
                      {t('settings.voiceLangAuto', {
                        lang:
                          SPEECH_LANGUAGES.find(
                            (l) => l.code === resolveSpeechLang(''),
                          )?.label ?? resolveSpeechLang(''),
                      })}
                    </option>
                    {SPEECH_LANGUAGES.map((language) => (
                      <option key={language.code} value={language.code}>
                        {language.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-xs text-ls-gray-500">
                  {t('settings.voiceUnsupported')}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mx-auto mb-6 flex w-fit max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-1 rounded-card bg-ls-gray-900/95 px-3 py-2">
          <button
            type="button"
            onClick={restart}
            aria-label={t('prompter.restart')}
            title={`${t('prompter.restart')} (R)`}
            className="rounded-btn p-2.5 text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-white"
          >
            <RotateCcw size={20} strokeWidth={1.5} aria-hidden />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? t('prompter.pause') : t('prompter.play')}
            title={`${playing ? t('prompter.pause') : t('prompter.play')} (${t('prompter.space')})`}
            className="rounded-btn p-2.5 text-ls-white transition-colors duration-[140ms] hover:text-ls-blue"
          >
            {playing ? (
              <Pause size={24} strokeWidth={1.5} aria-hidden />
            ) : (
              <Play size={24} strokeWidth={1.5} aria-hidden />
            )}
          </button>

          <div className="mx-2 h-6 w-px bg-ls-white/10" aria-hidden />

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => changeSpeed(-SPEED_STEP)}
              aria-label={t('prompter.speedDown')}
              title={`${t('prompter.speedDown')} (${t('prompter.speedDownHint')})`}
              className="rounded-btn p-2.5 text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-white"
            >
              <Minus size={18} strokeWidth={1.5} aria-hidden />
            </button>
            <input
              type="range"
              min={SPEED_MIN}
              max={SPEED_MAX}
              step={SPEED_STEP}
              value={speed}
              onChange={(e) => {
                setSpeed(clampSpeed(Number(e.target.value)))
                showControls()
              }}
              aria-label={t('prompter.speedLabel')}
              className="h-1 w-24 cursor-pointer accent-[var(--ls-blue)]"
            />
            <button
              type="button"
              onClick={() => changeSpeed(SPEED_STEP)}
              aria-label={t('prompter.speedUp')}
              title={`${t('prompter.speedUp')} (${t('prompter.speedUpHint')})`}
              className="rounded-btn p-2.5 text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-white"
            >
              <Plus size={18} strokeWidth={1.5} aria-hidden />
            </button>
            <span className="w-16 text-center text-xs tabular-nums text-ls-gray-500">
              {speed} px/s
            </span>
          </div>

          <div className="mx-2 h-6 w-px bg-ls-white/10" aria-hidden />

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => changeFontSize(-FONT_STEP)}
              aria-label={t('prompter.fontDown')}
              title={`${t('prompter.fontDown')} (-)`}
              className="rounded-btn p-2.5 text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-white"
            >
              <span className="text-sm leading-none">A</span>
            </button>
            <button
              type="button"
              onClick={() => changeFontSize(FONT_STEP)}
              aria-label={t('prompter.fontUp')}
              title={`${t('prompter.fontUp')} (+)`}
              className="rounded-btn p-2.5 text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-white"
            >
              <span className="text-lg leading-none">A</span>
            </button>
            <span className="w-10 text-center text-xs tabular-nums text-ls-gray-500">
              {fontSize}
            </span>
          </div>

          <div className="mx-2 h-6 w-px bg-ls-white/10" aria-hidden />

          {voiceSupported && (
            <button
              type="button"
              onClick={toggleVoice}
              aria-label={t('prompter.voice')}
              aria-pressed={voice}
              title={`${t('prompter.voice')} (V)`}
              className={`rounded-btn p-2.5 transition-colors duration-[140ms] hover:text-ls-white ${
                voice ? 'text-ls-blue' : 'text-ls-gray-500'
              }`}
            >
              <Mic
                size={20}
                strokeWidth={1.5}
                aria-hidden
                className={voiceListening ? 'voice-live' : undefined}
              />
            </button>
          )}

          <button
            type="button"
            onClick={toggleCamera}
            aria-label={t('prompter.camera')}
            aria-pressed={camera}
            title={`${t('prompter.camera')} (C)`}
            className={`rounded-btn p-2.5 transition-colors duration-[140ms] hover:text-ls-white ${
              camera ? 'text-ls-blue' : 'text-ls-gray-500'
            }`}
          >
            <Video size={20} strokeWidth={1.5} aria-hidden />
          </button>

          <div className="mx-2 h-6 w-px bg-ls-white/10" aria-hidden />

          <button
            type="button"
            onClick={() => {
              setMirrorX((prev) => !prev)
              showControls()
            }}
            aria-label={t('prompter.mirrorH')}
            aria-pressed={mirrorX}
            title={`${t('prompter.mirrorH')} (M)`}
            className={`rounded-btn p-2.5 transition-colors duration-[140ms] hover:text-ls-white ${
              mirrorX ? 'text-ls-blue' : 'text-ls-gray-500'
            }`}
          >
            <FlipHorizontal2 size={20} strokeWidth={1.5} aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => {
              setMirrorY((prev) => !prev)
              showControls()
            }}
            aria-label={t('prompter.mirrorV')}
            aria-pressed={mirrorY}
            title={t('prompter.mirrorV')}
            className={`rounded-btn p-2.5 transition-colors duration-[140ms] hover:text-ls-white ${
              mirrorY ? 'text-ls-blue' : 'text-ls-gray-500'
            }`}
          >
            <FlipVertical2 size={20} strokeWidth={1.5} aria-hidden />
          </button>

          <div className="mx-2 h-6 w-px bg-ls-white/10" aria-hidden />

          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            aria-label={t('prompter.settings')}
            aria-expanded={settingsOpen}
            title={t('prompter.settings')}
            className={`rounded-btn p-2.5 transition-colors duration-[140ms] hover:text-ls-white ${
              settingsOpen ? 'text-ls-blue' : 'text-ls-gray-500'
            }`}
          >
            <SlidersHorizontal size={20} strokeWidth={1.5} aria-hidden />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={
              isFullscreen
                ? t('prompter.exitFullscreen')
                : t('prompter.fullscreen')
            }
            title={`${isFullscreen ? t('prompter.exitFullscreen') : t('prompter.fullscreen')} (F)`}
            className="rounded-btn p-2.5 text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-white"
          >
            {isFullscreen ? (
              <Minimize size={20} strokeWidth={1.5} aria-hidden />
            ) : (
              <Maximize size={20} strokeWidth={1.5} aria-hidden />
            )}
          </button>

          <button
            type="button"
            onClick={exit}
            aria-label={t('prompter.exit')}
            title={`${t('prompter.exit')} (Esc)`}
            className="rounded-btn p-2.5 text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-white"
          >
            <X size={20} strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
