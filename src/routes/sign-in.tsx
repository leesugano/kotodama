import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Info } from 'lucide-react'
import { useState } from 'react'
import { Logo } from '../components/Logo'
import { authClient } from '../lib/auth/client'

export const Route = createFileRoute('/sign-in')({ component: SignInPage })

type Mode = 'signin' | 'signup'

function SignInPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result =
        mode === 'signin'
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ name, email, password })
      if (result.error) {
        setError(
          mode === 'signin'
            ? 'Could not sign in. Check your email and password.'
            : 'Could not create the account. Try another email or a password with at least 8 characters.',
        )
      } else {
        navigate({ to: '/editor' })
      }
    } catch {
      setError('Connection failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ls-white">
      <header className="mx-auto w-full max-w-[1200px] px-6 py-4">
        <Link
          to="/"
          className="flex w-fit items-center gap-2 text-ls-black"
          aria-label="Kotodama"
        >
          <Logo size={24} />
          <span className="display text-xl">Kotodama</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-20">
        <div className="w-full max-w-[380px]">
          <h1 className="display text-3xl text-ls-black">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ls-gray-500">
            An account is optional: Kotodama works without one. In the future it
            will sync your scripts across devices.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            {mode === 'signup' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm text-ls-gray-900">Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="rounded-input border border-ls-line px-3.5 py-2.5 text-sm text-ls-gray-900 outline-none transition-colors duration-[140ms] focus:border-ls-blue"
                />
              </label>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-ls-gray-900">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="rounded-input border border-ls-line px-3.5 py-2.5 text-sm text-ls-gray-900 outline-none transition-colors duration-[140ms] focus:border-ls-blue"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-ls-gray-900">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={
                  mode === 'signin' ? 'current-password' : 'new-password'
                }
                className="rounded-input border border-ls-line px-3.5 py-2.5 text-sm text-ls-gray-900 outline-none transition-colors duration-[140ms] focus:border-ls-blue"
              />
            </label>

            {error && (
              <p className="flex items-start gap-2 text-sm text-ls-gray-500">
                <Info
                  size={16}
                  strokeWidth={1.5}
                  className="mt-0.5 shrink-0"
                  aria-hidden
                />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-btn bg-ls-blue px-5 py-2.5 text-sm font-medium text-ls-white transition-colors duration-[140ms] hover:bg-ls-blue-pressed disabled:bg-ls-gray-50 disabled:text-ls-gray-500"
            >
              {loading
                ? 'Please wait'
                : mode === 'signin'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin')
                setError(null)
              }}
              className="text-sm text-ls-blue transition-colors duration-[140ms] hover:text-ls-blue-pressed"
            >
              {mode === 'signin'
                ? 'No account? Create one'
                : 'Already have an account? Sign in'}
            </button>
            <Link
              to="/editor"
              className="text-sm text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-gray-900"
            >
              Continue without an account →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
