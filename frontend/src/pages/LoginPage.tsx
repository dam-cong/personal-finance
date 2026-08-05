import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { api } from '../lib/api'
import { useAuth } from '../stores/auth'
import { useApp } from '../stores/app'
import type { LoginResponse } from '../types'

type Mode = 'login' | 'register'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none'

export default function LoginPage() {
  const setAuth = useAuth((s) => s.setAuth)
  const navigate = useNavigate()
  const appName = useApp((s) => s.appName)
  const householdName = useApp((s) => s.householdName)
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setPassword('')
    setConfirm('')
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
        <h1 className="mb-1 text-center text-2xl font-bold text-gray-900">{appName}</h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          {mode === 'login' ? (
            <>
              Đăng nhập để quản lý chi tiêu
              <br />
              nhà {householdName}
            </>
          ) : (
            'Tạo tài khoản mới — dữ liệu dùng chung cho cả nhà'
          )}
        </p>

        <div className="mb-6 flex rounded-lg bg-gray-100 p-1">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
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
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tên đăng nhập
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClass}
              placeholder="VD: trangdt"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••"
              required
            />
          </div>
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
                placeholder="••••••"
                required
              />
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
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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
