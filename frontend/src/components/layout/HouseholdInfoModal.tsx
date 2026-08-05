import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Modal from '../ui/Modal'
import { fetchHousehold, updateHousehold } from '../../api/household'
import { useAuth } from '../../stores/auth'

interface Props {
  open: boolean
  onClose: () => void
}

const fieldInputClass =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100'

export default function HouseholdInfoModal({ open, onClose }: Props) {
  const setHouseholdName = useAuth((s) => s.setHouseholdName)
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [budgetInput, setBudgetInput] = useState('')
  const [slogan, setSlogan] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setLoading(true)
    fetchHousehold()
      .then((hh) => {
        setName(hh.name)
        setBudgetInput(
          hh.default_budget != null ? String(hh.default_budget) : '',
        )
        setSlogan(hh.slogan ?? '')
      })
      .catch(() => setError('Không tải được thông tin nhà'))
      .finally(() => setLoading(false))
  }, [open])

  async function save() {
    if (!name.trim()) {
      setError('Tên nhà không được để trống')
      return
    }
    const amount = budgetInput.trim()
      ? Number(budgetInput.replace(/[^\d]/g, ''))
      : null
    setSaving(true)
    setError('')
    try {
      const hh = await updateHousehold(name.trim(), amount, slogan.trim())
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
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}
