import { NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../stores/auth'
import { useApp } from '../../stores/app'
import { useMemo, useState, type CSSProperties } from 'react'
import { fetchHousehold } from '../../api/household'
import { fetchUnreadCount } from '../../api/messages'
import HouseholdInfoModal from './HouseholdInfoModal'
import ProfileModal from './ProfileModal'
import BottomNav from './BottomNav'
import AccountSheet from './AccountSheet'
import BottomSheet from '../ui/BottomSheet'
import { useKeyboardOpen } from '../../hooks/useKeyboardOpen'
import { DEFAULT_PRIMARY_COLOR, hexToShades } from '../../lib/theme'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `relative rounded-xl px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-[var(--primary-900)] text-white' : 'text-[var(--primary-100)] hover:bg-white/10'
  }`

export default function AppLayout() {
  const username = useAuth((s) => s.username)
  const householdName = useAuth((s) => s.householdName)
  const displayName = useAuth((s) => s.displayName)
  const avatarUrl = useAuth((s) => s.avatarUrl)
  const logout = useAuth((s) => s.logout)
  const appName = useApp((s) => s.appName)
  const [menuOpen, setMenuOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [accountSheetOpen, setAccountSheetOpen] = useState(false)
  const keyboardOpen = useKeyboardOpen()
  const nameLabel = displayName || username || ''
  const avatarInitial = nameLabel.charAt(0).toUpperCase()
  const { data: household } = useQuery({
    queryKey: ['household'],
    queryFn: fetchHousehold,
    staleTime: Infinity,
  })
  const { data: unreadCount } = useQuery({
    queryKey: ['unread-messages'],
    queryFn: fetchUnreadCount,
    refetchInterval: 5000,
  })
  const themeStyle = useMemo(() => {
    const shades = hexToShades(household?.primary_color || DEFAULT_PRIMARY_COLOR)
    return Object.fromEntries(
      Object.entries(shades).map(([key, value]) => [`--primary-${key}`, value]),
    ) as CSSProperties
  }, [household?.primary_color])

  return (
    <div className="flex h-screen flex-col bg-gray-50" style={themeStyle}>
      <header className="sticky top-0 z-10 flex flex-col items-center rounded-b-3xl bg-gradient-to-r from-[var(--primary-500)] via-[var(--primary-600)] to-[var(--primary-700)] px-3 py-2 text-white shadow-sm">
        <div className="flex w-full min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {household?.image_url && (
              <img
                src={household.image_url}
                alt="Ảnh nhà"
                className="h-7 w-7 flex-shrink-0 rounded-full object-cover ring-2 ring-white/40"
              />
            )}
            <h1 className="truncate text-base font-bold text-white">
              {appName}
            </h1>
          </div>
          <div className="flex min-w-0 flex-col items-end">
            {householdName && (
              <p className="max-w-full truncate text-xs text-[var(--primary-100)]">
                Nhà {householdName}
              </p>
            )}
            {household?.slogan && (
              <p className="mt-0.5 max-w-full truncate rounded-full bg-white/15 px-3 py-0.5 text-xs font-semibold italic text-white">
                "{household.slogan}"
              </p>
            )}
          </div>
        </div>
        <div className="relative mt-1 hidden w-full items-center justify-center md:flex">
          <nav className="flex items-center gap-1">
            <NavLink to="/chat" className={navLinkClass}>
              Chat
            </NavLink>
            <NavLink to="/family-chat" className={navLinkClass}>
              Trò chuyện
              {(unreadCount ?? 0) > 0 && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[var(--primary-600)]" />
              )}
            </NavLink>
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
          </nav>

          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu tài khoản"
              className="block h-8 w-8 overflow-hidden rounded-full ring-2 ring-white/40 hover:ring-white/70"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-white/20 text-sm font-semibold text-white">
                  {avatarInitial}
                </span>
              )}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5">
                <p className="truncate px-4 py-2 text-sm font-medium text-gray-900">
                  {nameLabel}
                </p>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    setProfileOpen(true)
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Hồ sơ của tôi
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    setInfoOpen(true)
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Thông tin
                </button>
                <a
                  href="/login"
                  onClick={(e) => {
                    e.preventDefault()
                    logout()
                  }}
                  className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Đăng xuất
                </a>
              </div>
            )}
          </div>
        </div>
      </header>
      <main
        className={`min-h-0 flex-1 overflow-hidden md:pb-0 ${
          keyboardOpen ? '' : 'pb-[calc(6rem+env(safe-area-inset-bottom))]'
        }`}
      >
        <Outlet />
      </main>
      {!keyboardOpen && (
        <BottomNav
          unreadCount={unreadCount ?? 0}
          onOpenAccount={() => setAccountSheetOpen(true)}
          accountOpen={accountSheetOpen}
          onOpenInfo={() => setInfoOpen(true)}
          infoOpen={infoOpen}
          avatarUrl={avatarUrl}
          nameLabel={nameLabel}
        />
      )}
      <BottomSheet open={accountSheetOpen} onClose={() => setAccountSheetOpen(false)}>
        <AccountSheet
          nameLabel={nameLabel}
          avatarUrl={avatarUrl}
          onProfile={() => {
            setAccountSheetOpen(false)
            setProfileOpen(true)
          }}
          onLogout={() => {
            setAccountSheetOpen(false)
            logout()
          }}
        />
      </BottomSheet>
      <HouseholdInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  )
}
