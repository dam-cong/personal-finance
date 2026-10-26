interface Props {
  label: string
  className?: string
}

export default function Avatar({ label, className = 'h-8 w-8' }: Props) {
  const initial = (label || '?').charAt(0).toUpperCase()
  return (
    <span
      className={`flex flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary-600)] text-xs font-semibold text-white ${className}`}
    >
      {initial}
    </span>
  )
}
