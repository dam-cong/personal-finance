import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { api } from '../lib/api'
import { useAuth } from '../stores/auth'
import { useApp } from '../stores/app'
import type { LoginResponse } from '../types'

type Mode = 'login' | 'register'

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100'

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  )
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.6A10.8 10.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a13.6 13.6 0 0 1-3.1 3.9M6.7 6.7C4.1 8.4 2.5 12 2.5 12S6 18.5 12 18.5a9.9 9.9 0 0 0 4.2-.9" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  )
}

export default function LoginPage() {
  const setAuth = useAuth((s) => s.setAuth)
  const navigate = useNavigate()
  const appName = useApp((s) => s.appName)
  const householdName = useApp((s) => s.householdName)
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setPassword('')
    setConfirm('')
    setShowPassword(false)
    setShowConfirm(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (mode === 'register') {
      if (password.length < 6) {
        setError('Mật khẩu phải có ít nhất 6 ký tự')
        return
      }
      if (password !== confirm) {
        setError('Xác nhận mật khẩu không khớp')
        return
      }
    }
    setLoading(true)
    try {
      const { data } = await api.post<LoginResponse>(
        mode === 'login' ? '/auth/login' : '/auth/register',
        { username, password },
      )
      setAuth(data.token, data.username, data.household_name)
      navigate('/', { replace: true })
    } catch (err) {
      setError(axiosErrorMessage(err, mode))
    } finally {
      setLoading(false)
    }
  }

  const description =
    mode === 'login' ? (
      <>
        Đăng nhập để quản lý chi tiêu
        <br className="md:hidden" />
        {' '}
        nhà {householdName}
      </>
    ) : (
      'Tạo tài khoản mới — dữ liệu dùng chung cho cả nhà'
    )

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-3xl shadow-2xl">
        {/* Panel trái: trang trí + branding, chỉ hiện ở desktop */}
        <div className="relative hidden w-1/2 flex-col justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 p-10 text-white md:flex">
          <div className="absolute -bottom-10 -left-10 h-56 w-56 rounded-full bg-blue-400/30" />
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-blue-300/20" />
          <div className="absolute bottom-1/3 right-10 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative">
            <p className="mb-2 text-sm font-medium uppercase tracking-wide text-blue-200">
              Chào mừng đến với
            </p>
            <h1 className="text-3xl font-bold md:text-4xl">{appName}</h1>
            <p className="mt-4 italic text-blue-100">{description}</p>
          </div>
        </div>

        {/* Panel phải: form, luôn hiện */}
        <div className="flex w-full flex-col justify-center bg-white p-8 sm:p-10 md:w-1/2">
          <div className="mb-6 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 p-4 text-center md:hidden">
            <h1 className="text-xl font-bold text-white">{appName}</h1>
            <p className="mt-1 text-sm italic text-blue-100">{description}</p>
          </div>

          <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">
            {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </h2>

          <div className="mb-6 flex rounded-full bg-gray-100 p-1">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  mode === m
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {m === 'login' ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
                placeholder="Tên đăng nhập"
                required
                autoFocus
              />
            </div>
            <div className="relative">
              <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pr-10`}
                placeholder="Mật khẩu"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
            {mode === 'register' && (
              <div className="relative">
                <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={`${inputClass} pr-10`}
                  placeholder="Xác nhận mật khẩu"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showConfirm ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            )}
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading
                ? 'Đang xử lý...'
                : mode === 'login'
                  ? 'Đăng nhập'
                  : 'Đăng ký'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function axiosErrorMessage(err: unknown, mode: Mode): string {
  if (axios.isAxiosError(err)) {
    return (
      err.response?.data?.error ??
      (mode === 'login' ? 'Đăng nhập thất bại' : 'Đăng ký thất bại')
    )
  }
  return mode === 'login' ? 'Đăng nhập thất bại' : 'Đăng ký thất bại'
}
