import { useEffect } from 'react'

/**
 * Keeps the screen awake while the component is mounted.
 * Silent fallback: browsers without the Wake Lock API continue normally.
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
        // unsupported or not allowed: continue without the wake lock
      }
    }

    /* The system releases the lock when switching tabs; reacquire on return */
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
