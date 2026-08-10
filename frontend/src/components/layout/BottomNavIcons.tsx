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

export function FamilyOutlineIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <circle cx="9" cy="8" r="2.6" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" strokeLinecap="round" />
      <circle cx="16" cy="9" r="2" />
      <path d="M14.8 14.3c2.3.3 3.9 2 3.9 4.7" strokeLinecap="round" />
    </svg>
  )
}

export function FamilyFilledIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="9" cy="8" r="2.6" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5Z" />
      <circle cx="16" cy="9" r="2" />
      <path d="M14.8 14.3c2.3.3 3.9 2 3.9 4.7h-3.1c0-1.9-.7-3.5-1.9-4.5.3-.1.66-.2 1-.2Z" />
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
