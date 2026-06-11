import { useEffect } from 'react'

/**
 * Mantém a tela acesa enquanto o componente está montado.
 * Fallback silencioso: browsers sem Wake Lock API seguem normalmente.
 */
export function useWakeLock(): void {
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null
    let released = false

    async function request() {
      try {
        if (
          !released &&
          'wakeLock' in navigator &&
          document.visibilityState === 'visible'
        ) {
          sentinel = await navigator.wakeLock.request('screen')
        }
      } catch {
        // sem suporte ou sem permissão: segue sem wake lock
      }
    }

    /* O lock é liberado pelo sistema ao trocar de aba; readquire ao voltar */
    const onVisibility = () => {
      if (document.visibilityState === 'visible') request()
    }

    request()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisibility)
      sentinel?.release().catch(() => {})
    }
  }, [])
}
