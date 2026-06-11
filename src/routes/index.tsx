import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRight,
  FlipHorizontal2,
  Gauge,
  Github,
  Keyboard,
  Lock,
  Mic,
  MonitorSmartphone,
  ShieldCheck,
  Video,
} from 'lucide-react'
import { useEffect } from 'react'
import { Logo } from '../components/Logo'

export const Route = createFileRoute('/')({ component: LandingPage })

const GITHUB_URL = 'https://github.com/leesugano/kotodama'

const DEMO_TEXT = `Hi, I am Kotodama. Paste your script, press play and record. The text scrolls at the pace of your speech, with a font size your eyes will thank you for. Pause with a tap, resume from the same spot, mirror for rigs with a beam splitter. All in the browser, all on your device.`

const FEATURES = [
  {
    icon: Mic,
    title: 'Voice tracking',
    description:
      'Turn on the mic and the script follows your voice: speech recognition matches what you say and scrolls to keep you on the right line, in dozens of languages.',
  },
  {
    icon: Video,
    title: 'Camera self-view',
    description:
      'See yourself behind the text while you read. The front camera becomes the prompter background so you can check your framing without leaving the script.',
  },
  {
    icon: Gauge,
    title: 'Real-time speed',
    description:
      'Adjust the scroll while you speak, from 10 to 200 px/s, with no position jump. The scroll uses delta time and stays smooth on any screen, 60Hz or 120Hz.',
  },
  {
    icon: FlipHorizontal2,
    title: 'Mirroring for rigs',
    description:
      'Horizontal, vertical or both. For physical teleprompter rigs with a mirror in front of the camera.',
  },
  {
    icon: ShieldCheck,
    title: 'Your text is yours',
    description:
      'Scripts stay on your device, in IndexedDB. Nothing goes to the cloud, nothing is tracked, no ad covers the text.',
  },
  {
    icon: Keyboard,
    title: 'Shortcuts and gestures',
    description:
      'Space to play, arrows for speed, M to mirror. On mobile: tap to pause, pinch for font size, two fingers for speed.',
  },
  {
    icon: MonitorSmartphone,
    title: 'Mobile and desktop',
    description:
      'Fullscreen in portrait and landscape, with the screen always on during reading thanks to the wake lock.',
  },
  {
    icon: Github,
    title: 'Open source and free',
    description:
      'Open code under the MIT license. No paywall, no premium plan, no catch. Contributions are welcome.',
  },
]

const SHORTCUTS: Array<[string, string]> = [
  ['Space', 'Play / pause'],
  ['↑ / ↓', 'Speed + / -'],
  ['+ / -', 'Font + / -'],
  ['V', 'Voice tracking'],
  ['C', 'Camera'],
  ['M', 'Mirror horizontally'],
  ['R', 'Back to start'],
  ['F', 'Fullscreen'],
  ['Esc', 'Exit prompter'],
]

const GESTURES: Array<[string, string]> = [
  ['Tap', 'Play / pause'],
  ['Pinch', 'Font size'],
  ['Two fingers vertically', 'Speed'],
  ['Touch the screen', 'Show controls'],
]

function LandingPage() {
  /* Reveal on scroll: each [data-reveal] appears when it enters the viewport */
  useEffect(() => {
    const elements = document.querySelectorAll('[data-reveal]')
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.15 },
    )
    for (const el of elements) observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="bg-ls-white text-ls-gray-900">
      <header className="sticky top-0 z-40 border-b border-ls-line bg-ls-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-ls-black"
            aria-label="Kotodama"
          >
            <Logo size={24} />
            <span className="display text-xl">Kotodama</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <a
              href="#how-it-works"
              className="hidden rounded-btn px-3 py-2 text-sm text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-gray-900 sm:block"
            >
              How it works
            </a>
            <a
              href="#shortcuts"
              className="hidden rounded-btn px-3 py-2 text-sm text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-gray-900 sm:block"
            >
              Shortcuts
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View on GitHub"
              className="rounded-btn p-2 text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-gray-900"
            >
              <Github size={18} strokeWidth={1.5} aria-hidden />
            </a>
            <Link
              to="/sign-in"
              className="rounded-btn px-3 py-2 text-sm text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-gray-900"
            >
              Sign in
            </Link>
            <Link
              to="/editor"
              className="rounded-btn bg-ls-blue px-4 py-2 text-sm font-medium text-ls-white transition-colors duration-[140ms] hover:bg-ls-blue-pressed"
            >
              Open editor
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-[1200px] px-6 pt-20 pb-16 sm:pt-28">
          <div className="mx-auto max-w-[760px] text-center">
            <p
              className="rise text-sm font-medium text-ls-blue"
              style={{ animationDelay: '0ms' }}
            >
              Open source, free, no account required
            </p>
            <h1
              className="display rise mt-4 text-5xl leading-[1.05] text-ls-black sm:text-6xl"
              style={{ animationDelay: '80ms' }}
            >
              The teleprompter that lives in your browser
            </h1>
            <p
              className="rise mx-auto mt-6 max-w-[560px] text-lg leading-relaxed text-ls-gray-500"
              style={{ animationDelay: '160ms' }}
            >
              Paste the text, press play, record. Works on mobile and desktop,
              nothing to install and no ad covering your script.
            </p>
            <div
              className="rise mt-9 flex flex-wrap items-center justify-center gap-3"
              style={{ animationDelay: '240ms' }}
            >
              <Link
                to="/editor"
                className="inline-flex items-center gap-2 rounded-btn bg-ls-blue px-6 py-3 text-sm font-medium text-ls-white transition-colors duration-[140ms] hover:bg-ls-blue-pressed"
              >
                Start now
                <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
              </Link>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-btn border border-ls-line px-6 py-3 text-sm font-medium text-ls-gray-900 transition-colors duration-[140ms] hover:bg-ls-gray-50"
              >
                <Github size={16} strokeWidth={1.5} aria-hidden />
                View on GitHub
              </a>
            </div>
          </div>

          {/* Prompter demo */}
          <div
            className="rise mx-auto mt-16 max-w-[820px]"
            style={{ animationDelay: '320ms' }}
          >
            <div
              className="relative h-[320px] overflow-hidden rounded-card bg-ls-black sm:h-[380px]"
              aria-hidden
            >
              <div className="absolute inset-x-0 top-0 z-10 h-0.5 bg-ls-white/10">
                <div className="h-full w-1/3 bg-ls-blue" />
              </div>
              <div className="demo-scroll px-10 pt-[300px] text-center sm:px-20">
                <p className="whitespace-pre-wrap text-[26px] leading-[1.5] text-ls-white sm:text-[32px]">
                  {DEMO_TEXT}
                </p>
                <p className="mt-24 whitespace-pre-wrap text-[26px] leading-[1.5] text-ls-white sm:text-[32px]">
                  {DEMO_TEXT}
                </p>
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-ls-black to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ls-black to-transparent" />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t border-ls-line">
          <div className="mx-auto max-w-[1200px] px-6 py-20">
            <div className="reveal" data-reveal>
              <h2 className="display text-3xl text-ls-black sm:text-4xl">
                From text to take in three steps
              </h2>
              <p className="mt-3 max-w-[520px] text-ls-gray-500">
                The idea is simple: from first visit to text scrolling on screen
                in under 30 seconds.
              </p>
            </div>
            <ol className="mt-12 grid gap-8 sm:grid-cols-3">
              {[
                [
                  '1',
                  'Paste the script',
                  'Open the editor and paste your text. It is saved automatically on your device while you type.',
                ],
                [
                  '2',
                  'Tune it to your pace',
                  'Speed, font size and mirroring. See the estimated duration before recording.',
                ],
                [
                  '3',
                  'Record with confidence',
                  'Black fullscreen, gaze near the camera, pause and resume without losing your place.',
                ],
              ].map(([step, title, description]) => (
                <li key={step} className="reveal" data-reveal>
                  <span className="flex h-10 w-10 items-center justify-center rounded-btn bg-ls-gray-50 text-sm font-medium text-ls-blue">
                    {step}
                  </span>
                  <h3 className="mt-4 text-lg font-medium text-ls-gray-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ls-gray-500">
                    {description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-ls-line bg-ls-gray-50">
          <div className="mx-auto max-w-[1200px] px-6 py-20">
            <div className="reveal" data-reveal>
              <h2 className="display text-3xl text-ls-black sm:text-4xl">
                Built for people who actually record
              </h2>
              <p className="mt-3 max-w-[520px] text-ls-gray-500">
                Content creators, teachers, presenters. Everything a
                teleprompter needs, nothing that gets in the way.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="reveal rounded-card border border-ls-line bg-ls-white p-6"
                  data-reveal
                >
                  <feature.icon
                    size={22}
                    strokeWidth={1.5}
                    className="text-ls-blue"
                    aria-hidden
                  />
                  <h3 className="mt-4 font-medium text-ls-gray-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ls-gray-500">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Shortcuts */}
        <section id="shortcuts" className="border-t border-ls-line">
          <div className="mx-auto max-w-[1200px] px-6 py-20">
            <div className="reveal" data-reveal>
              <h2 className="display text-3xl text-ls-black sm:text-4xl">
                Full control without taking your eyes off the text
              </h2>
            </div>
            <div className="mt-12 grid gap-10 md:grid-cols-2">
              <div className="reveal" data-reveal>
                <h3 className="flex items-center gap-2 text-sm font-medium text-ls-gray-500">
                  <Keyboard size={16} strokeWidth={1.5} aria-hidden />
                  On desktop
                </h3>
                <ul className="mt-4 divide-y divide-ls-line border-y border-ls-line">
                  {SHORTCUTS.map(([key, action]) => (
                    <li
                      key={key}
                      className="flex items-center justify-between py-3"
                    >
                      <span className="text-sm text-ls-gray-500">{action}</span>
                      <kbd className="rounded-btn border border-ls-line bg-ls-gray-50 px-2.5 py-1 font-sans text-xs text-ls-gray-900">
                        {key}
                      </kbd>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="reveal" data-reveal>
                <h3 className="flex items-center gap-2 text-sm font-medium text-ls-gray-500">
                  <MonitorSmartphone size={16} strokeWidth={1.5} aria-hidden />
                  On mobile
                </h3>
                <ul className="mt-4 divide-y divide-ls-line border-y border-ls-line">
                  {GESTURES.map(([gesture, action]) => (
                    <li
                      key={gesture}
                      className="flex items-center justify-between py-3"
                    >
                      <span className="text-sm text-ls-gray-500">{action}</span>
                      <span className="text-sm text-ls-gray-900">
                        {gesture}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy and open source */}
        <section className="border-t border-ls-line">
          <div className="mx-auto max-w-[760px] px-6 py-20 text-center">
            <div className="reveal" data-reveal>
              <Lock
                size={22}
                strokeWidth={1.5}
                className="mx-auto text-ls-blue"
                aria-hidden
              />
              <h2 className="display mt-4 text-3xl text-ls-black sm:text-4xl">
                Private by architecture
              </h2>
              <p className="mx-auto mt-4 max-w-[560px] leading-relaxed text-ls-gray-500">
                Kotodama has no script database in the cloud: what you write
                stays in your browser storage. The account is optional and
                exists only to sync scripts across devices in the future. The
                code is open for anyone to audit.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/editor"
                  className="inline-flex items-center gap-2 rounded-btn bg-ls-blue px-6 py-3 text-sm font-medium text-ls-white transition-colors duration-[140ms] hover:bg-ls-blue-pressed"
                >
                  Try Kotodama
                  <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-ls-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-8">
          <p className="text-sm text-ls-gray-500">
            Kotodama. Made by Lee Sugano, open to everyone.
          </p>
          <div className="flex items-center gap-4">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-gray-900"
            >
              GitHub
            </a>
            <span className="text-sm text-ls-gray-500">MIT license</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
