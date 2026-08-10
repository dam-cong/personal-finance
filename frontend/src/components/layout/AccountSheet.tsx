import Avatar from '../ui/Avatar'

interface Props {
  nameLabel: string
  avatarUrl?: string | null
  onProfile: () => void
  onLogout: () => void
}

export default function AccountSheet({
  nameLabel,
  avatarUrl,
  onProfile,
  onLogout,
}: Props) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 px-3 pb-2">
        <Avatar avatarUrl={avatarUrl ?? undefined} label={nameLabel} className="h-11 w-11" />
        <p className="truncate text-sm font-semibold text-gray-900">{nameLabel}</p>
      </div>
      <button
        onClick={onProfile}
        className="block w-full rounded-xl px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
      >
        Hồ sơ của tôi
      </button>
      <button
        onClick={onLogout}
        className="block w-full rounded-xl px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
      >
        Đăng xuất
      </button>
    </div>
  )
}
