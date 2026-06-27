/** Maps a scrubber ratio (0..1) onto a pixel scroll position. */
export function scrubRatioToPos(ratio: number, max: number): number {
  const clamped = Math.max(0, Math.min(1, ratio))
  return clamped * max
}
