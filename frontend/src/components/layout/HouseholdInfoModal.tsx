import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Modal from '../ui/Modal'
import Avatar from '../ui/Avatar'
import {
  fetchHousehold,
  updateHousehold,
  uploadHouseholdImage,
} from '../../api/household'
import { useAuth } from '../../stores/auth'
import { DEFAULT_PRIMARY_COLOR } from '../../lib/theme'

interface Props {
  open: boolean
  onClose: () => void
}

const fieldInputClass =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]'

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

const MAX_IMAGE_SIZE = 2 * 1024 * 1024

export default function HouseholdInfoModal({ open, onClose }: Props) {
  const setHouseholdName = useAuth((s) => s.setHouseholdName)
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [budgetInput, setBudgetInput] = useState('')
  const [slogan, setSlogan] = useState('')
  const [colorHex, setColorHex] = useState(DEFAULT_PRIMARY_COLOR)
  const [currentImageUrl, setCurrentImageUrl] = useState('')
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError('')
    setLoading(true)
    setPendingImageFile(null)
    setPreviewImageUrl(null)
    fetchHousehold()
      .then((hh) => {
        setName(hh.name)
        setBudgetInput(
          hh.default_budget != null ? String(hh.default_budget) : '',
        )
        setSlogan(hh.slogan ?? '')
        setColorHex(hh.primary_color || DEFAULT_PRIMARY_COLOR)
        setCurrentImageUrl(hh.image_url ?? '')
      })
      .catch(() => setError('Không tải được thông tin nhà'))
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    return () => {
      if (previewImageUrl) URL.revokeObjectURL(previewImageUrl)
    }
  }, [previewImageUrl])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_IMAGE_SIZE) {
      setError('Ảnh tối đa 2MB')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Chỉ hỗ trợ JPG, PNG, WEBP')
      return
    }
    setError('')
    if (previewImageUrl) URL.revokeObjectURL(previewImageUrl)
    setPendingImageFile(file)
    setPreviewImageUrl(URL.createObjectURL(file))
  }

  async function save() {
    if (!name.trim()) {
      setError('Tên nhà không được để trống')
      return
    }
    if (colorHex && !HEX_COLOR_PATTERN.test(colorHex)) {
      setError('Mã màu không hợp lệ, dùng định dạng #RRGGBB')
      return
    }
    const amount = budgetInput.trim()
      ? Number(budgetInput.replace(/[^\d]/g, ''))
      : null
    setSaving(true)
    setError('')
    try {
      if (pendingImageFile) {
        await uploadHouseholdImage(pendingImageFile)
      }
      const hh = await updateHousehold(name.trim(), amount, slogan.trim(), colorHex)
      setHouseholdName(hh.name)
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      await queryClient.invalidateQueries({ queryKey: ['household'] })
      onClose()
    } catch {
      setError('Lưu thất bại, thử lại sau')
    } finally {
      setSaving(false)
    }
  }

  const avatarSrc = previewImageUrl ?? currentImageUrl

  return (
    <Modal
      open={open}
      title="Thông tin nhà"
      onConfirm={save}
      onCancel={onClose}
      confirmVariant="primary"
      confirmLabel={saving ? 'Đang lưu...' : 'Lưu'}
      confirmDisabled={saving || loading}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar avatarUrl={avatarSrc || undefined} label={name} className="h-16 w-16" />
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
              disabled={loading}
              className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Chọn ảnh
            </button>
            <p className="mt-1 text-xs text-gray-400">JPG, PNG, WEBP — tối đa 2MB</p>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Tên nhà
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            className={fieldInputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Hạn mức mặc định
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            disabled={loading}
            placeholder="Để trống = dùng mặc định hệ thống"
            className={fieldInputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Câu khẩu hiệu / lời động viên
          </label>
          <input
            type="text"
            value={slogan}
            onChange={(e) => setSlogan(e.target.value)}
            disabled={loading}
            maxLength={100}
            placeholder="VD: Tiết kiệm hôm nay, an nhiên ngày mai!"
            className={fieldInputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Màu chủ đạo
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value.toUpperCase())}
              disabled={loading}
              className="h-10 w-10 flex-shrink-0 cursor-pointer rounded-xl border border-gray-200 bg-gray-50 p-1"
            />
            <input
              type="text"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value.toUpperCase())}
              disabled={loading}
              placeholder={DEFAULT_PRIMARY_COLOR}
              maxLength={7}
              className={`${fieldInputClass} flex-1 font-mono uppercase`}
            />
            <span
              className="h-10 w-10 flex-shrink-0 rounded-full border border-gray-200 shadow-sm"
              style={{ backgroundColor: HEX_COLOR_PATTERN.test(colorHex) ? colorHex : undefined }}
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}
