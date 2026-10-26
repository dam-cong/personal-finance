import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import AppLayout from './components/layout/AppLayout'
import { useAuth } from './stores/auth'
import { useApp } from './stores/app'

const ChatPage = lazy(() => import('./pages/ChatPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))

function RequireAuth() {
  const token = useAuth((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <Outlet />
}

export default function App() {
  const loadConfig = useApp((s) => s.load)

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-sm text-gray-400">
          Đang tải...
        </div>
      }
    >
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
