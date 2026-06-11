import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getScriptRepository } from '../lib/scripts/repository'
import type { Script } from '../lib/scripts/types'
import { loadCurrentScriptId, saveCurrentScriptId } from '../lib/settings'
import {
  countWords,
  deriveTitle,
  estimateSeconds,
  formatDuration,
} from '../lib/text'

export const Route = createFileRoute('/')({ component: EditorPage })

const AUTOSAVE_DELAY = 500

function EditorPage() {
  const navigate = useNavigate()
  const [content, setContent] = useState('')
  const [loaded, setLoaded] = useState(false)
  const scriptIdRef = useRef<string | null>(null)
  const scriptCreatedAtRef = useRef<number>(0)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadDraft() {
      const id = loadCurrentScriptId()
      if (id) {
        const script = await getScriptRepository().get(id)
        if (cancelled) return
        if (script) {
          scriptIdRef.current = script.id
          scriptCreatedAtRef.current = script.createdAt
          setContent(script.content)
        }
      }
      setLoaded(true)
    }
    loadDraft()
    return () => {
      cancelled = true
    }
  }, [])

  const persist = useCallback(async (text: string): Promise<string> => {
    let id = scriptIdRef.current
    if (!id) {
      id = crypto.randomUUID()
      scriptIdRef.current = id
      scriptCreatedAtRef.current = Date.now()
      saveCurrentScriptId(id)
    }
    const script: Script = {
      id,
      title: deriveTitle(text),
      content: text,
      createdAt: scriptCreatedAtRef.current,
      updatedAt: Date.now(),
    }
    await getScriptRepository().save(script)
    return id
  }, [])

  const handleChange = useCallback(
    (text: string) => {
      setContent(text)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        persist(text)
      }, AUTOSAVE_DELAY)
    },
    [persist],
  )

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const handleStart = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    const id = await persist(content)
    navigate({ to: '/prompter', search: { id } })
  }, [content, persist, navigate])

  const words = countWords(content)
  const duration = formatDuration(estimateSeconds(words))
  const hasText = words > 0

  return (
    <div className="flex h-dvh flex-col bg-ls-white">
      <header className="mx-auto w-full max-w-[1200px] px-6 pt-8 pb-4">
        <h1 className="display text-xl text-ls-black">Kotodama</h1>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-6">
        <textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={loaded ? 'Cole ou digite seu roteiro' : ''}
          aria-label="Roteiro"
          // biome-ignore lint/a11y/noAutofocus: a página é o editor; foco imediato é o fluxo principal (play em menos de 30s)
          autoFocus
          className="flex-1 resize-none border-0 bg-transparent py-6 text-lg leading-relaxed text-ls-gray-900 outline-none placeholder:text-ls-gray-500"
        />
      </main>

      <footer className="border-t border-ls-line bg-ls-white">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-6 py-4">
          <p className="text-sm text-ls-gray-500">
            {hasText ? (
              <>
                {words} {words === 1 ? 'palavra' : 'palavras'}
                <span className="px-2 text-ls-line">|</span>
                {duration} a 140 wpm
              </>
            ) : (
              'Comece colando seu texto'
            )}
          </p>
          <button
            type="button"
            onClick={handleStart}
            disabled={!hasText}
            className="inline-flex items-center gap-2 rounded-btn bg-ls-blue px-5 py-2.5 text-sm font-medium text-ls-white transition-colors duration-[140ms] hover:bg-ls-blue-pressed active:bg-ls-blue-pressed disabled:cursor-default disabled:bg-ls-gray-50 disabled:text-ls-gray-500"
          >
            Iniciar prompter
            <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      </footer>
    </div>
  )
}
