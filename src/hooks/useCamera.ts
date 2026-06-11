import { useEffect, useRef, useState } from 'react'

/**
 * Manages a front-camera self-view stream while `enabled`. The returned
 * `videoRef` must be attached to a muted, inline `<video>` element.
 * `denied` turns true when permission is refused or no camera exists.
 */
export function useCamera(enabled: boolean): {
  videoRef: React.RefObject<HTMLVideoElement | null>
  ready: boolean
  denied: boolean
} {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [ready, setReady] = useState(false)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setReady(false)
      setDenied(false)
      return
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setDenied(true)
      return
    }

    let cancelled = false
    let stream: MediaStream | null = null

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((result) => {
        if (cancelled) {
          for (const track of result.getTracks()) track.stop()
          return
        }
        stream = result
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setDenied(true)
      })

    return () => {
      cancelled = true
      if (stream) {
        for (const track of stream.getTracks()) track.stop()
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      setReady(false)
    }
  }, [enabled])

  return { videoRef, ready, denied }
}
