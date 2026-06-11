/*
 * Service worker do Kotodama: app 100% offline após a primeira visita.
 *
 * - install: precacheia o shell (HTML das rotas, manifest, ícones, fonte)
 *   e os assets referenciados em cada HTML (JS/CSS com hash).
 * - navegação: network-first com fallback para o cache (ignora search,
 *   então /prompter?id=x cai no HTML cacheado de /prompter).
 * - assets same-origin: cache-first; /assets/ tem hash no nome, é imutável.
 */
const CACHE = 'kotodama-v1'

const SHELL = [
  '/',
  '/editor',
  '/prompter',
  '/entrar',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/fonts/inter-latin.woff2',
]

const ASSET_RE = /(?:src|href)="(\/(?:assets|_build)\/[^"]+)"/g

async function precache() {
  const cache = await caches.open(CACHE)
  const assetUrls = new Set()
  await Promise.all(
    SHELL.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'no-cache' })
        if (!response.ok) return
        if ((response.headers.get('content-type') || '').includes('html')) {
          const html = await response.clone().text()
          for (const match of html.matchAll(ASSET_RE)) {
            assetUrls.add(match[1])
          }
        }
        await cache.put(url, response)
      } catch {
        // offline ou rota indisponível durante o install: segue sem ela
      }
    }),
  )
  await Promise.all(
    [...assetUrls].map(async (url) => {
      if (await cache.match(url)) return
      try {
        const response = await fetch(url)
        if (response.ok) await cache.put(url, response)
      } catch {
        // asset será cacheado em runtime na primeira navegação
      }
    }),
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

async function handleNavigation(request) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request.url, response.clone())
      const html = await response.clone().text()
      for (const match of html.matchAll(ASSET_RE)) {
        const url = match[1]
        if (!(await cache.match(url))) {
          fetch(url)
            .then((r) => r.ok && cache.put(url, r))
            .catch(() => {})
        }
      }
    }
    return response
  } catch {
    const cached =
      (await cache.match(request.url, { ignoreSearch: true })) ||
      (await cache.match('/editor'))
    return cached || Response.error()
  }
}

async function handleAsset(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok && new URL(request.url).origin === self.location.origin) {
    cache.put(request, response.clone())
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  /* auth e APIs nunca passam pelo cache */
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request))
    return
  }
  event.respondWith(handleAsset(request))
})
