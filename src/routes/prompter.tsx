import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  FlipHorizontal2,
  FlipVertical2,
  Maximize,
  Minimize,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useWakeLock } from '../hooks/useWakeLock'
import { getScriptRepository } from '../lib/scripts/repository'
import type { Script } from '../lib/scripts/types'
import {
  clampFontSize,
  clampSpeed,
  FONT_STEP,
  loadSettings,
  SPEED_MAX,
  SPEED_MIN,
  SPEED_STEP,
  saveSettings,
} from '../lib/settings'

export const Route = createFileRoute('/prompter')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === 'string' ? search.id : '',
  }),
  component: PrompterPage,
})

const CONTROLS_HIDE_DELAY = 3000
/* Delta máximo por frame: evita salto ao voltar de aba em segundo plano */
const MAX_FRAME_DELTA = 0.1

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
        <p className="text-ls-white">Roteiro não encontrado</p>
        <Link to="/" className="text-sm text-ls-blue">
          Voltar ao editor →
        </Link>
      </div>
    )
  }

  return <Prompter script={script} />
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
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(initialSettings.speed)
  const [fontSize, setFontSize] = useState(initialSettings.fontSize)
  const [mirrorX, setMirrorX] = useState(initialSettings.mirrorX)
  const [mirrorY, setMirrorY] = useState(initialSettings.mirrorY)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  playingRef.current = playing
  speedRef.current = speed

  useWakeLock()

  useEffect(() => {
    saveSettings({ speed, fontSize, mirrorX, mirrorY })
  }, [speed, fontSize, mirrorX, mirrorY])

  /* Loop de scroll: requestAnimationFrame com delta time, velocidade em px/s
     independente do framerate (60Hz e 120Hz rolam na mesma velocidade real) */
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
          posRef.current += speedRef.current * dt
        }
        posRef.current = Math.min(max, Math.max(0, posRef.current))
        content.style.transform = `translate3d(0, ${-posRef.current}px, 0)`
        if (progressRef.current) {
          const progress = max > 0 ? posRef.current / max : 0
          progressRef.current.style.transform = `scaleX(${progress})`
        }
        if (playingRef.current && max > 0 && posRef.current >= max) {
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
      if (playingRef.current) setControlsVisible(false)
    }, CONTROLS_HIDE_DELAY)
  }, [])

  const showControls = useCallback(() => {
    setControlsVisible(true)
    scheduleHide()
  }, [scheduleHide])

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  const togglePlay = useCallback(() => {
    setPlaying((prev) => {
      const next = !prev
      if (next) {
        scheduleHide()
      } else {
        setControlsVisible(true)
      }
      return next
    })
  }, [scheduleHide])

  const restart = useCallback(() => {
    posRef.current = 0
    showControls()
  }, [showControls])

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
    navigate({ to: '/' })
  }, [navigate])

  /* Gestos de dois dedos: pinch ajusta a fonte, deslize vertical ajusta a
     velocidade. O gesto dominante vence para evitar ajustes acidentais. */
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
        /* lê os valores atuais sem recriar os listeners a cada mudança */
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
        /* deslizar para cima acelera, para baixo desacelera */
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

  /* Tap toggla play, mas não logo após um gesto de dois dedos */
  const handleStageClick = useCallback(() => {
    if (performance.now() - lastGestureEndRef.current < 400) return
    togglePlay()
  }, [togglePlay])

  /* Tenta fullscreen ao entrar; falha silenciosa se o browser exigir gesto */
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
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        case 'Escape':
          /* Com fullscreen ativo o Esc sai do fullscreen; sem ele, sai do prompter */
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
    toggleFullscreen,
    exit,
    showControls,
  ])

  return (
    /* biome-ignore lint/a11y/useKeyWithClickEvents: o teclado controla via atalhos globais */
    /* biome-ignore lint/a11y/noStaticElementInteractions: tap em qualquer área é o gesto P0 de play/pause */
    <div
      ref={stageRef}
      className="fixed inset-0 cursor-default touch-none overflow-hidden bg-ls-black"
      onClick={handleStageClick}
      onPointerMove={showControls}
    >
      {/* Barra de progresso: hairline no topo */}
      <div className="absolute inset-x-0 top-0 z-20 h-0.5 bg-ls-white/10">
        <div
          ref={progressRef}
          className="h-full w-full origin-left bg-ls-blue"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>

      {/* Espelhamento para teleprompter físico: aplica no palco inteiro */}
      <div
        className="h-full w-full"
        style={{
          transform: `scale(${mirrorX ? -1 : 1}, ${mirrorY ? -1 : 1})`,
        }}
      >
        <div ref={contentRef} className="will-change-transform">
          <div
            className="mx-auto max-w-[900px] whitespace-pre-wrap px-[7vw] pt-[55vh] pb-[55vh] text-center font-normal leading-[1.45] text-ls-white md:px-12"
            style={{ fontSize: `${fontSize}px` }}
          >
            {script.content}
          </div>
        </div>
      </div>

      {/* Overlay de controles: aparece com toque ou mouse, some após 3s rolando */}
      <div
        className={`fade-overlay absolute inset-x-0 bottom-0 z-30 ${
          controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="toolbar"
        aria-label="Controles do prompter"
        tabIndex={-1}
      >
        <div className="mx-auto mb-6 flex w-fit max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-1 rounded-card bg-ls-gray-900/95 px-3 py-2">
          <button
            type="button"
            onClick={restart}
            aria-label="Voltar ao início"
            title="Voltar ao início (R)"
            className="rounded-btn p-2.5 text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-white"
          >
            <RotateCcw size={20} strokeWidth={1.5} aria-hidden />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? 'Pausar' : 'Reproduzir'}
            title={playing ? 'Pausar (espaço)' : 'Reproduzir (espaço)'}
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
              aria-label="Diminuir velocidade"
              title="Diminuir velocidade (seta para baixo)"
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
              aria-label="Velocidade do scroll"
              className="h-1 w-24 cursor-pointer accent-[var(--ls-blue)]"
            />
            <button
              type="button"
              onClick={() => changeSpeed(SPEED_STEP)}
              aria-label="Aumentar velocidade"
              title="Aumentar velocidade (seta para cima)"
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
              aria-label="Diminuir fonte"
              title="Diminuir fonte (-)"
              className="rounded-btn p-2.5 text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-white"
            >
              <span className="text-sm leading-none">A</span>
            </button>
            <button
              type="button"
              onClick={() => changeFontSize(FONT_STEP)}
              aria-label="Aumentar fonte"
              title="Aumentar fonte (+)"
              className="rounded-btn p-2.5 text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-white"
            >
              <span className="text-lg leading-none">A</span>
            </button>
            <span className="w-10 text-center text-xs tabular-nums text-ls-gray-500">
              {fontSize}
            </span>
          </div>

          <div className="mx-2 h-6 w-px bg-ls-white/10" aria-hidden />

          <button
            type="button"
            onClick={() => {
              setMirrorX((prev) => !prev)
              showControls()
            }}
            aria-label="Espelhar horizontal"
            aria-pressed={mirrorX}
            title="Espelhar horizontal (M)"
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
            aria-label="Espelhar vertical"
            aria-pressed={mirrorY}
            title="Espelhar vertical"
            className={`rounded-btn p-2.5 transition-colors duration-[140ms] hover:text-ls-white ${
              mirrorY ? 'text-ls-blue' : 'text-ls-gray-500'
            }`}
          >
            <FlipVertical2 size={20} strokeWidth={1.5} aria-hidden />
          </button>

          <div className="mx-2 h-6 w-px bg-ls-white/10" aria-hidden />

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Sair de tela cheia' : 'Tela cheia'}
            title={isFullscreen ? 'Sair de tela cheia (F)' : 'Tela cheia (F)'}
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
            aria-label="Sair do prompter"
            title="Sair do prompter (Esc)"
            className="rounded-btn p-2.5 text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-white"
          >
            <X size={20} strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
