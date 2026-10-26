import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import { updateDisplayName } from '../../api/profile'
import { useAuth } from '../../stores/auth'

interface Props {
  open: boolean
  onClose: () => void
}

export default function ProfileModal({ open, onClose }: Props) {
  const username = useAuth((s) => s.username) ?? ''
  const storedDisplayName = useAuth((s) => s.displayName)
  const setProfile = useAuth((s) => s.setProfile)

  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setDisplayName(storedDisplayName ?? '')
  }, [open, storedDisplayName])

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await updateDisplayName(displayName.trim())
      setProfile(res.display_name ?? '')
      onClose()
    } catch {
      setError('Lưu thất bại, thử lại sau')
    } finally {
      setSaving(false)
    }
  }

  const initial = (displayName || username || '?').charAt(0).toUpperCase()

  return (
    <Modal
      open={open}
      title="Hồ sơ của tôi"
      onConfirm={save}
      onCancel={onClose}
      confirmVariant="primary"
      confirmLabel={saving ? 'Đang lưu...' : 'Lưu'}
      confirmDisabled={saving}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--primary-600)] text-2xl font-bold text-white">
            {initial}
          </div>
          <p className="text-sm text-gray-500">Ảnh đại diện dùng chữ cái đầu của tên.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Tên hiển thị
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={username}
            maxLength={50}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}
