interface Props {
  avatarUrl?: string
  label: string
  className?: string
}

export default function Avatar({ avatarUrl, label, className = 'h-8 w-8' }: Props) {
  const initial = (label || '?').charAt(0).toUpperCase()
  return avatarUrl ? (
    <img
      src={avatarUrl}
      alt={label}
      className={`flex-shrink-0 rounded-full object-cover ${className}`}
    />
  ) : (
    <span
      className={`flex flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary-600)] text-xs font-semibold text-white ${className}`}
    >
      {initial}
    </span>
  )
}
