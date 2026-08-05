import { NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../stores/auth'
import { useApp } from '../../stores/app'
import { useState } from 'react'
import { fetchHousehold } from '../../api/household'
import HouseholdInfoModal from './HouseholdInfoModal'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-xl px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-blue-900 text-white' : 'text-blue-100 hover:bg-white/10'
  }`

export default function AppLayout() {
  const username = useAuth((s) => s.username)
  const householdName = useAuth((s) => s.householdName)
  const logout = useAuth((s) => s.logout)
  const appName = useApp((s) => s.appName)
  const [menuOpen, setMenuOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const { data: household } = useQuery({
    queryKey: ['household'],
    queryFn: fetchHousehold,
    staleTime: Infinity,
  })

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-10 flex flex-col items-center rounded-b-3xl bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 px-3 py-2 text-white shadow-sm">
        <div className="min-w-0 text-center">
          <h1 className="truncate text-base font-bold text-white">
            {appName}
          </h1>
          {householdName && (
            <p className="truncate text-xs text-blue-100">
              Nhà {householdName}
            </p>
          )}
          {household?.slogan && (
            <p className="mt-1 inline-block rounded-full bg-white/15 px-3 py-0.5 text-xs font-semibold italic text-white">
              "{household.slogan}"
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <nav className="flex items-center gap-1">
            <NavLink to="/chat" className={navLinkClass}>
              Chat
            </NavLink>
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
          </nav>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-sm font-medium text-white hover:text-blue-100"
            >
              {username} ▾
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5">
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
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
      <HouseholdInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  )
}
