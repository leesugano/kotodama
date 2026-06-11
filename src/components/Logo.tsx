/**
 * Marca do Kotodama: três linhas de texto num prompter, com a linha
 * ativa em --ls-blue. Mesma arte do favicon e dos ícones PWA.
 */
export function Logo({
  size = 20,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="presentation"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="16"
        y="20"
        width="32"
        height="6"
        rx="3"
        fill="currentColor"
        opacity="0.55"
      />
      <rect x="12" y="29" width="40" height="6" rx="3" fill="var(--ls-blue)" />
      <rect
        x="16"
        y="38"
        width="26"
        height="6"
        rx="3"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  )
}
