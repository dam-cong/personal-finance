import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../stores/auth'
import { useApp } from '../../stores/app'
import { useState } from 'react'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
  }`

export default function AppLayout() {
  const username = useAuth((s) => s.username)
  const householdName = useAuth((s) => s.householdName)
  const logout = useAuth((s) => s.logout)
  const appName = useApp((s) => s.appName)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      <header className="sticky top-0 z-10 flex flex-col items-center bg-white px-3 py-2 shadow-sm">
        <div className="min-w-0 text-center">
          <h1 className="truncate text-base font-bold text-gray-900">
            {appName}
          </h1>
          {householdName && (
            <p className="truncate text-xs text-gray-500">
              Nhà {householdName}
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
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {username} ▾
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5">
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
    </div>
  )
}
