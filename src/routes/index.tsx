import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRight,
  FlipHorizontal2,
  Gauge,
  Github,
  Keyboard,
  Lock,
  MonitorSmartphone,
  ShieldCheck,
} from 'lucide-react'
import { useEffect } from 'react'
import { Logo } from '../components/Logo'

export const Route = createFileRoute('/')({ component: LandingPage })

const GITHUB_URL = 'https://github.com/leesugano/kotodama'

const DEMO_TEXT = `Olá, eu sou o Kotodama. Cola o teu roteiro, aperta play e grava. O texto rola na velocidade do teu ritmo de fala, com a fonte do tamanho que os teus olhos pedem. Pausa com um toque, retoma do mesmo ponto, espelha para rigs com espelho. Tudo no navegador, tudo no teu dispositivo.`

const FEATURES = [
  {
    icon: Gauge,
    title: 'Velocidade em tempo real',
    description:
      'Ajuste a rolagem enquanto fala, de 10 a 200 px/s, sem salto de posição. O scroll usa delta time e fica suave em qualquer tela, 60Hz ou 120Hz.',
  },
  {
    icon: FlipHorizontal2,
    title: 'Espelhamento para rigs',
    description:
      'Horizontal, vertical ou ambos. Para quem usa teleprompter físico com espelho na frente da câmera.',
  },
  {
    icon: ShieldCheck,
    title: 'Seu texto é seu',
    description:
      'Roteiros ficam no seu dispositivo, em IndexedDB. Nada vai para a nuvem, nada é rastreado, nenhum anúncio cobre o texto.',
  },
  {
    icon: Keyboard,
    title: 'Atalhos e gestos',
    description:
      'Espaço para play, setas para velocidade, M para espelhar. No celular: tap para pausar, pinch para a fonte, dois dedos para a velocidade.',
  },
  {
    icon: MonitorSmartphone,
    title: 'Celular e desktop',
    description:
      'Fullscreen na vertical e na horizontal, com a tela sempre acesa durante a leitura graças ao wake lock.',
  },
  {
    icon: Github,
    title: 'Open source e gratuito',
    description:
      'Código aberto sob licença MIT. Sem paywall, sem plano premium, sem pegadinha. Contribuições são bem-vindas.',
  },
]

const SHORTCUTS: Array<[string, string]> = [
  ['Espaço', 'Play / pause'],
  ['↑ / ↓', 'Velocidade + / -'],
  ['+ / -', 'Fonte + / -'],
  ['M', 'Espelhar horizontal'],
  ['R', 'Voltar ao início'],
  ['F', 'Fullscreen'],
  ['Esc', 'Sair do prompter'],
]

const GESTURES: Array<[string, string]> = [
  ['Tap', 'Play / pause'],
  ['Pinch', 'Tamanho da fonte'],
  ['Dois dedos na vertical', 'Velocidade'],
  ['Toque na tela', 'Mostrar controles'],
]

function LandingPage() {
  /* Reveal ao rolar: cada [data-reveal] aparece quando entra na viewport */
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
              href="#como-funciona"
              className="hidden rounded-btn px-3 py-2 text-sm text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-gray-900 sm:block"
            >
              Como funciona
            </a>
            <a
              href="#atalhos"
              className="hidden rounded-btn px-3 py-2 text-sm text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-gray-900 sm:block"
            >
              Atalhos
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ver no GitHub"
              className="rounded-btn p-2 text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-gray-900"
            >
              <Github size={18} strokeWidth={1.5} aria-hidden />
            </a>
            <Link
              to="/entrar"
              className="rounded-btn px-3 py-2 text-sm text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-gray-900"
            >
              Entrar
            </Link>
            <Link
              to="/editor"
              className="rounded-btn bg-ls-blue px-4 py-2 text-sm font-medium text-ls-white transition-colors duration-[140ms] hover:bg-ls-blue-pressed"
            >
              Abrir editor
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
              Open source, gratuito, sem conta obrigatória
            </p>
            <h1
              className="display rise mt-4 text-5xl leading-[1.05] text-ls-black sm:text-6xl"
              style={{ animationDelay: '80ms' }}
            >
              O teleprompter que vive no seu navegador
            </h1>
            <p
              className="rise mx-auto mt-6 max-w-[560px] text-lg leading-relaxed text-ls-gray-500"
              style={{ animationDelay: '160ms' }}
            >
              Cola o texto, aperta play, grava. Funciona no celular e no
              desktop, sem instalar nada e sem anúncio cobrindo o roteiro.
            </p>
            <div
              className="rise mt-9 flex flex-wrap items-center justify-center gap-3"
              style={{ animationDelay: '240ms' }}
            >
              <Link
                to="/editor"
                className="inline-flex items-center gap-2 rounded-btn bg-ls-blue px-6 py-3 text-sm font-medium text-ls-white transition-colors duration-[140ms] hover:bg-ls-blue-pressed"
              >
                Começar agora
                <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
              </Link>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-btn border border-ls-line px-6 py-3 text-sm font-medium text-ls-gray-900 transition-colors duration-[140ms] hover:bg-ls-gray-50"
              >
                <Github size={16} strokeWidth={1.5} aria-hidden />
                Ver no GitHub
              </a>
            </div>
          </div>

          {/* Demo do prompter */}
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

        {/* Como funciona */}
        <section id="como-funciona" className="border-t border-ls-line">
          <div className="mx-auto max-w-[1200px] px-6 py-20">
            <div className="reveal" data-reveal>
              <h2 className="display text-3xl text-ls-black sm:text-4xl">
                Do texto ao take em três passos
              </h2>
              <p className="mt-3 max-w-[520px] text-ls-gray-500">
                A ideia é simples: do primeiro acesso ao texto rolando na tela
                em menos de 30 segundos.
              </p>
            </div>
            <ol className="mt-12 grid gap-8 sm:grid-cols-3">
              {[
                [
                  '1',
                  'Cole o roteiro',
                  'Abra o editor e cole o texto. Ele é salvo automaticamente no seu dispositivo enquanto você digita.',
                ],
                [
                  '2',
                  'Ajuste ao seu ritmo',
                  'Velocidade, tamanho da fonte e espelhamento. Veja a duração estimada antes de gravar.',
                ],
                [
                  '3',
                  'Grave com confiança',
                  'Fullscreen preto, olhar perto da câmera, pausa e retomada sem perder o ponto.',
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
                Feito para quem grava de verdade
              </h2>
              <p className="mt-3 max-w-[520px] text-ls-gray-500">
                Criadores de conteúdo, professores, apresentadores. Tudo que um
                teleprompter precisa ter, nada do que atrapalha.
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

        {/* Atalhos */}
        <section id="atalhos" className="border-t border-ls-line">
          <div className="mx-auto max-w-[1200px] px-6 py-20">
            <div className="reveal" data-reveal>
              <h2 className="display text-3xl text-ls-black sm:text-4xl">
                Controle total, sem tirar o olho do texto
              </h2>
            </div>
            <div className="mt-12 grid gap-10 md:grid-cols-2">
              <div className="reveal" data-reveal>
                <h3 className="flex items-center gap-2 text-sm font-medium text-ls-gray-500">
                  <Keyboard size={16} strokeWidth={1.5} aria-hidden />
                  No desktop
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
                  No celular
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

        {/* Privacidade e open source */}
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
                Privado por arquitetura
              </h2>
              <p className="mx-auto mt-4 max-w-[560px] leading-relaxed text-ls-gray-500">
                O Kotodama não tem banco de roteiros na nuvem: o que você
                escreve fica no armazenamento do seu navegador. A conta é
                opcional e serve apenas para, no futuro, sincronizar roteiros
                entre dispositivos. O código é aberto para qualquer pessoa
                auditar.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/editor"
                  className="inline-flex items-center gap-2 rounded-btn bg-ls-blue px-6 py-3 text-sm font-medium text-ls-white transition-colors duration-[140ms] hover:bg-ls-blue-pressed"
                >
                  Experimentar o Kotodama
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
            Kotodama. Feito por Lee Sugano, aberto para todos.
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
            <span className="text-sm text-ls-gray-500">Licença MIT</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
