import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  Check,
  Copy,
  PanelLeft,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { InstallPrompt } from '../components/InstallPrompt'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { authClient } from '../lib/auth/client'
import { t } from '../lib/i18n'
import { getScriptRepository } from '../lib/scripts/repository'
import type { Script } from '../lib/scripts/types'
import { loadCurrentScriptId, saveCurrentScriptId } from '../lib/settings'
import {
  countWords,
  deriveTitle,
  estimateSeconds,
  formatDuration,
  formatModifiedDate,
} from '../lib/text'

export const Route = createFileRoute('/editor')({ component: EditorPage })

const AUTOSAVE_DELAY = 500

function sortByUpdated(list: Script[]): Script[] {
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt)
}

function EditorPage() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const [scripts, setScripts] = useState<Script[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const metaRef = useRef({ createdAt: 0, customTitle: false, title: '' })
  const contentRef = useRef('')
  const currentIdRef = useRef<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  contentRef.current = content
  currentIdRef.current = currentId

  useEffect(() => {
    let cancelled = false
    async function load() {
      const list = await getScriptRepository().list()
      if (cancelled) return
      setScripts(list)
      const savedId = loadCurrentScriptId()
      const current = list.find((s) => s.id === savedId) ?? null
      if (current) {
        setCurrentId(current.id)
        setContent(current.content)
        metaRef.current = {
          createdAt: current.createdAt,
          customTitle: current.customTitle === true,
          title: current.title,
        }
      }
      setLoaded(true)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  /** Persists the current script and keeps the list sorted by modification */
  const persist = useCallback(async (text: string): Promise<string> => {
    let id = currentIdRef.current
    if (!id) {
      id = crypto.randomUUID()
      currentIdRef.current = id
      metaRef.current = { createdAt: Date.now(), customTitle: false, title: '' }
      setCurrentId(id)
      saveCurrentScriptId(id)
    }
    const meta = metaRef.current
    const script: Script = {
      id,
      title: meta.customTitle ? meta.title : deriveTitle(text),
      content: text,
      customTitle: meta.customTitle,
      createdAt: meta.createdAt,
      updatedAt: Date.now(),
    }
    try {
      await getScriptRepository().save(script)
      setSaveStatus('saved')
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
    setScripts((prev) =>
      sortByUpdated([script, ...prev.filter((s) => s.id !== id)]),
    )
    return id
  }, [])

  /** Immediately saves any pending edit before switching scripts */
  const flushPending = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
      await persist(contentRef.current)
    }
  }, [persist])

  const handleChange = useCallback(
    (text: string) => {
      setContent(text)
      setSaveStatus('saving')
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null
        persist(text)
      }, AUTOSAVE_DELAY)
    },
    [persist],
  )

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  const selectScript = useCallback(
    async (script: Script) => {
      await flushPending()
      setCurrentId(script.id)
      setContent(script.content)
      metaRef.current = {
        createdAt: script.createdAt,
        customTitle: script.customTitle === true,
        title: script.title,
      }
      saveCurrentScriptId(script.id)
      setSidebarOpen(false)
      setConfirmDeleteId(null)
      setRenamingId(null)
    },
    [flushPending],
  )

  const newScript = useCallback(async () => {
    await flushPending()
    const script: Script = {
      id: crypto.randomUUID(),
      title: t('editor.untitled'),
      content: '',
      customTitle: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await getScriptRepository().save(script)
    setScripts((prev) => sortByUpdated([script, ...prev]))
    setCurrentId(script.id)
    setContent('')
    metaRef.current = {
      createdAt: script.createdAt,
      customTitle: false,
      title: script.title,
    }
    saveCurrentScriptId(script.id)
    setSidebarOpen(false)
    textareaRef.current?.focus()
  }, [flushPending])

  const duplicateScript = useCallback(async (source: Script) => {
    const copy: Script = {
      ...source,
      id: crypto.randomUUID(),
      title: `${source.title} ${t('editor.copySuffix')}`,
      customTitle: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await getScriptRepository().save(copy)
    setScripts((prev) => sortByUpdated([copy, ...prev]))
  }, [])

  const deleteScript = useCallback(async (id: string) => {
    await getScriptRepository().remove(id)
    setConfirmDeleteId(null)
    setScripts((prev) => {
      const next = prev.filter((s) => s.id !== id)
      if (currentIdRef.current === id) {
        const fallback = next[0] ?? null
        if (fallback) {
          setCurrentId(fallback.id)
          setContent(fallback.content)
          metaRef.current = {
            createdAt: fallback.createdAt,
            customTitle: fallback.customTitle === true,
            title: fallback.title,
          }
          saveCurrentScriptId(fallback.id)
        } else {
          setCurrentId(null)
          setContent('')
          metaRef.current = { createdAt: 0, customTitle: false, title: '' }
          saveCurrentScriptId('')
        }
      }
      return next
    })
  }, [])

  const startRename = useCallback((script: Script) => {
    setRenamingId(script.id)
    setRenameValue(script.title)
    setConfirmDeleteId(null)
  }, [])

  const commitRename = useCallback(
    async (script: Script) => {
      const title = renameValue.trim()
      setRenamingId(null)
      if (!title || title === script.title) return
      const renamed: Script = {
        ...script,
        title,
        customTitle: true,
        updatedAt: Date.now(),
      }
      await getScriptRepository().save(renamed)
      setScripts((prev) =>
        sortByUpdated(prev.map((s) => (s.id === script.id ? renamed : s))),
      )
      if (currentIdRef.current === script.id) {
        metaRef.current = { ...metaRef.current, customTitle: true, title }
      }
    },
    [renameValue],
  )

  const handleStart = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    const id = await persist(contentRef.current)
    navigate({ to: '/prompter', search: { id } })
  }, [persist, navigate])

  const words = countWords(content)
  const duration = formatDuration(estimateSeconds(words))
  const hasText = words > 0

  const sidebar = (
    <>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-medium text-primary">
          {t('editor.scripts')}
        </h2>
        <button
          type="button"
          onClick={newScript}
          aria-label={t('editor.newScript')}
          title={t('editor.newScript')}
          className="rounded-btn p-1.5 text-secondary transition-colors duration-[140ms] hover:bg-surface-raised hover:text-primary"
        >
          <Plus size={18} strokeWidth={1.5} aria-hidden />
        </button>
      </div>
      <ul className="flex-1 overflow-y-auto py-2">
        {scripts.length === 0 && (
          <li className="px-4 py-6 text-sm text-secondary">
            {t('editor.empty')}
          </li>
        )}
        {scripts.map((script) => {
          const isActive = script.id === currentId
          const preview = script.content
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
            .slice(1)
            .join(' ')
          return (
            <li key={script.id} className="group relative px-2">
              {confirmDeleteId === script.id ? (
                <div className="rounded-input px-3 py-3">
                  <p className="text-sm text-primary">
                    {t('editor.deleteConfirm')}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => deleteScript(script.id)}
                      className="rounded-btn bg-primary px-3 py-1.5 text-xs text-surface transition-colors duration-[140ms] hover:opacity-90"
                    >
                      {t('editor.delete')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded-btn px-3 py-1.5 text-xs text-secondary transition-colors duration-[140ms] hover:text-primary"
                    >
                      {t('editor.cancel')}
                    </button>
                  </div>
                </div>
              ) : renamingId === script.id ? (
                <div className="flex items-center gap-1 px-2 py-2">
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(script)
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    // biome-ignore lint/a11y/noAutofocus: the field was just opened by the rename action
                    autoFocus
                    aria-label={t('editor.newTitle')}
                    className="w-full rounded-input border border-line bg-surface px-2 py-1.5 text-sm text-primary outline-none focus:border-ls-blue"
                  />
                  <button
                    type="button"
                    onClick={() => commitRename(script)}
                    aria-label={t('editor.confirmTitle')}
                    className="rounded-btn p-1.5 text-ls-blue"
                  >
                    <Check size={16} strokeWidth={1.5} aria-hidden />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => selectScript(script)}
                    className={`w-full rounded-input px-3 py-2.5 text-left transition-colors duration-[140ms] ${
                      isActive
                        ? 'bg-surface-raised'
                        : 'hover:bg-surface-raised/60'
                    }`}
                  >
                    <span className="block truncate pr-16 text-sm font-medium text-primary">
                      {script.title}
                    </span>
                    {preview && (
                      <span className="mt-0.5 block truncate pr-16 text-xs text-secondary">
                        {preview}
                      </span>
                    )}
                    <span className="mt-1 block text-xs text-secondary">
                      {formatModifiedDate(script.updatedAt)}
                    </span>
                  </button>
                  <div className="absolute top-2.5 right-3 hidden gap-0.5 group-focus-within:flex group-hover:flex">
                    <button
                      type="button"
                      onClick={() => startRename(script)}
                      aria-label={`${t('editor.rename')}: ${script.title}`}
                      title={t('editor.rename')}
                      className="rounded-btn bg-surface p-1.5 text-secondary transition-colors duration-[140ms] hover:text-primary"
                    >
                      <Pencil size={14} strokeWidth={1.5} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateScript(script)}
                      aria-label={`${t('editor.duplicate')}: ${script.title}`}
                      title={t('editor.duplicate')}
                      className="rounded-btn bg-surface p-1.5 text-secondary transition-colors duration-[140ms] hover:text-primary"
                    >
                      <Copy size={14} strokeWidth={1.5} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(script.id)}
                      aria-label={`${t('editor.delete')}: ${script.title}`}
                      title={t('editor.delete')}
                      className="rounded-btn bg-surface p-1.5 text-secondary transition-colors duration-[140ms] hover:text-primary"
                    >
                      <Trash2 size={14} strokeWidth={1.5} aria-hidden />
                    </button>
                  </div>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )

  return (
    <div className="flex h-dvh bg-surface">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-line md:flex">
        {sidebar}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label={t('editor.closeList')}
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-ls-black/20"
          />
          <aside className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col border-r border-line bg-surface">
            <div className="flex justify-end px-2 pt-2">
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label={t('editor.close')}
                className="rounded-btn p-2 text-secondary"
              >
                <X size={18} strokeWidth={1.5} aria-hidden />
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label={t('editor.openList')}
            className="rounded-btn p-1.5 text-secondary transition-colors duration-[140ms] hover:text-primary md:hidden"
          >
            <PanelLeft size={20} strokeWidth={1.5} aria-hidden />
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 text-primary"
            aria-label="Kotodama"
          >
            <Logo size={22} />
            <span className="display text-lg">Kotodama</span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            {session?.user ? (
              <>
                <span className="hidden max-w-[160px] truncate text-sm text-secondary sm:block">
                  {session.user.name}
                </span>
                <button
                  type="button"
                  onClick={() => authClient.signOut()}
                  className="rounded-btn px-3 py-1.5 text-sm text-secondary transition-colors duration-[140ms] hover:text-primary"
                >
                  {t('editor.signOut')}
                </button>
              </>
            ) : (
              <Link
                to="/sign-in"
                className="rounded-btn px-3 py-1.5 text-sm text-secondary transition-colors duration-[140ms] hover:text-primary"
              >
                {t('editor.signIn')}
              </Link>
            )}
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-[900px] flex-1 flex-col px-4 md:px-6">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={loaded ? t('editor.placeholder') : ''}
            aria-label={t('editor.scriptLabel')}
            className="flex-1 resize-none border-0 bg-transparent py-6 text-lg leading-relaxed text-primary outline-none placeholder:text-secondary"
          />
        </main>

        <footer className="border-t border-line bg-surface">
          <div className="mx-auto flex w-full max-w-[900px] items-center justify-between gap-4 px-4 py-4 md:px-6">
            <p className="flex items-center gap-2 text-sm text-secondary">
              {hasText ? (
                <>
                  {words} {words === 1 ? t('editor.word') : t('editor.words')}
                  <span className="px-2 text-line">|</span>
                  {duration} {t('editor.wpmSuffix')}
                </>
              ) : (
                t('editor.startHint')
              )}
              {saveStatus === 'saving' && (
                <span className="text-secondary">· {t('editor.saving')}</span>
              )}
              {saveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1 text-secondary">
                  · <Check size={13} strokeWidth={1.5} aria-hidden />{' '}
                  {t('editor.saved')}
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-ls-blue">· {t('editor.saveError')}</span>
              )}
            </p>
            <button
              type="button"
              onClick={handleStart}
              disabled={!hasText}
              className="inline-flex items-center gap-2 rounded-btn bg-ls-blue px-5 py-2.5 text-sm font-medium text-ls-white transition-colors duration-[140ms] hover:bg-ls-blue-pressed active:bg-ls-blue-pressed disabled:cursor-default disabled:bg-surface-raised disabled:text-secondary"
            >
              {t('editor.start')}
              <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        </footer>
      </div>

      <InstallPrompt />
    </div>
  )
}
