interface IconProps {
  className?: string
}

export function HouseholdOutlineIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" className={className}>
      <path d="M4 11.5 12 4l8 7.5" strokeLinecap="round" />
      <path d="M6 10v8.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10" />
      <path d="M10 19.5v-5h4v5" />
    </svg>
  )
}

export function HouseholdFilledIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 3.2 3 11.3l1.3 1.5L6 11.3V19a1 1 0 0 0 1 1h3.5v-5.5h3V20H17a1 1 0 0 0 1-1v-7.7l1.7 1.5L21 11.3Z" />
    </svg>
  )
}

export function ChatOutlineIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" className={className}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v8a1.5 1.5 0 0 1-1.5 1.5H10l-6 4V5.5Z" />
      <path d="M8 8.5h8M8 12h5" strokeLinecap="round" />
    </svg>
  )
}

export function ChatFilledIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v8a1.5 1.5 0 0 1-1.5 1.5H10l-6 4V5.5Z" />
    </svg>
  )
}

export function StatsOutlineIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <rect x="4" y="12" width="4" height="7" rx="1" />
      <rect x="10" y="8" width="4" height="11" rx="1" />
      <rect x="16" y="4" width="4" height="15" rx="1" />
    </svg>
  )
}

export function StatsFilledIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="4" y="12" width="4" height="7" rx="1" />
      <rect x="10" y="8" width="4" height="11" rx="1" />
      <rect x="16" y="4" width="4" height="15" rx="1" />
    </svg>
  )
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
