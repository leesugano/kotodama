import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import { useEffect } from 'react'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { title: 'Kotodama' },
      {
        name: 'description',
        content:
          'Professional teleprompter for the web. Paste your text, press play, record. Works offline on mobile and desktop.',
      },
      { name: 'theme-color', content: '#000000' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black' },
      { name: 'apple-mobile-web-app-title', content: 'Kotodama' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.json' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
      { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
    ],
  }),
  shellComponent: RootDocument,
})

const CANONICAL_HOST = 'kotodama.leesugano.com'

function RootDocument({ children }: { children: React.ReactNode }) {
  /* Canonical domain: workers.dev stays up but redirects here */
  useEffect(() => {
    if (window.location.hostname === 'kotodama.leesugano.workers.dev') {
      window.location.replace(
        `https://${CANONICAL_HOST}${window.location.pathname}${window.location.search}`,
      )
    }
  }, [])

  /* PWA: register the service worker in production only, without blocking the load */
  useEffect(() => {
    if (!import.meta.env.PROD) return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
