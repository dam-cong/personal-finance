import { useEffect, useRef, useState } from 'react'
import Modal from '../ui/Modal'
import { updateDisplayName, uploadAvatar } from '../../api/profile'
import { useAuth } from '../../stores/auth'

interface Props {
  open: boolean
  onClose: () => void
}

const MAX_AVATAR_SIZE = 2 * 1024 * 1024

export default function ProfileModal({ open, onClose }: Props) {
  const username = useAuth((s) => s.username) ?? ''
  const storedDisplayName = useAuth((s) => s.displayName)
  const storedAvatarUrl = useAuth((s) => s.avatarUrl)
  const setProfile = useAuth((s) => s.setProfile)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setPendingFile(null)
    setPreviewUrl(null)
    setDisplayName(storedDisplayName ?? '')
  }, [open, storedDisplayName])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_AVATAR_SIZE) {
      setError('Ảnh tối đa 2MB')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Chỉ hỗ trợ JPG, PNG, WEBP')
      return
    }
    setError('')
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPendingFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      let newDisplayName = storedDisplayName ?? ''
      let newAvatarUrl = storedAvatarUrl ?? ''
      if (pendingFile) {
        const res = await uploadAvatar(pendingFile)
        newAvatarUrl = res.avatar_url ?? ''
        newDisplayName = res.display_name ?? newDisplayName
      }
      if (displayName.trim() !== (storedDisplayName ?? '')) {
        const res = await updateDisplayName(displayName.trim())
        newDisplayName = res.display_name ?? ''
        newAvatarUrl = res.avatar_url ?? newAvatarUrl
      }
      setProfile(newDisplayName, newAvatarUrl)
      onClose()
    } catch {
      setError('Lưu thất bại, thử lại sau')
    } finally {
      setSaving(false)
    }
  }

  const avatarSrc = previewUrl ?? storedAvatarUrl ?? ''
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
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="Avatar"
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--primary-600)] text-2xl font-bold text-white">
              {initial}
            </div>
          )}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Chọn ảnh
            </button>
            <p className="mt-1 text-xs text-gray-400">JPG, PNG, WEBP — tối đa 2MB</p>
          </div>
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
