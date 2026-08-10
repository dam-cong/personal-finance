import type { ReactElement } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import Avatar from '../ui/Avatar'
import {
  HouseholdOutlineIcon,
  HouseholdFilledIcon,
  FamilyOutlineIcon,
  FamilyFilledIcon,
  StatsOutlineIcon,
  StatsFilledIcon,
  PlusIcon,
} from './BottomNavIcons'

interface Props {
  unreadCount: number
  onOpenAccount: () => void
  accountOpen: boolean
  onOpenInfo: () => void
  infoOpen: boolean
  avatarUrl?: string | null
  nameLabel: string
}

interface TabItemProps {
  to: string
  label: string
  Icon: (props: { className?: string }) => ReactElement
  ActiveIcon: (props: { className?: string }) => ReactElement
  showBadge?: boolean
}

function TabItem({ to, label, Icon, ActiveIcon, showBadge }: TabItemProps) {
  return (
    <NavLink
      to={to}
      className="flex flex-col items-center justify-center gap-0.5 py-2 transition-transform active:scale-90"
    >
      {({ isActive }) => (
        <>
          <span className="relative">
            {isActive ? (
              <ActiveIcon className="h-6 w-6 text-[var(--primary-600)]" />
            ) : (
              <Icon className="h-6 w-6 text-gray-400" />
            )}
            {showBadge && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </span>
          <span className={`text-[10px] font-medium ${isActive ? 'text-[var(--primary-600)]' : 'text-gray-400'}`}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

export default function BottomNav({
  unreadCount,
  onOpenAccount,
  accountOpen,
  onOpenInfo,
  infoOpen,
  avatarUrl,
  nameLabel,
}: Props) {
  const navigate = useNavigate()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="relative grid grid-cols-5 items-end rounded-t-3xl border-t border-gray-100 bg-white px-2 pt-2 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <TabItem
          to="/family-chat"
          label="Gia đình"
          Icon={FamilyOutlineIcon}
          ActiveIcon={FamilyFilledIcon}
          showBadge={unreadCount > 0}
        />
        <button
          onClick={onOpenInfo}
          className="flex flex-col items-center justify-center gap-0.5 py-2 transition-transform active:scale-90"
        >
          {infoOpen ? (
            <HouseholdFilledIcon className="h-6 w-6 text-[var(--primary-600)]" />
          ) : (
            <HouseholdOutlineIcon className="h-6 w-6 text-gray-400" />
          )}
          <span className={`text-[10px] font-medium ${infoOpen ? 'text-[var(--primary-600)]' : 'text-gray-400'}`}>
            Thông tin
          </span>
        </button>
        <div />
        <TabItem to="/dashboard" label="Thống kê" Icon={StatsOutlineIcon} ActiveIcon={StatsFilledIcon} />
        <button
          onClick={onOpenAccount}
          className="flex flex-col items-center justify-center gap-0.5 py-2 transition-transform active:scale-90"
        >
          <Avatar
            avatarUrl={avatarUrl ?? undefined}
            label={nameLabel}
            className={`h-6 w-6 ${accountOpen ? 'ring-2 ring-[var(--primary-500)]' : 'ring-1 ring-gray-200'}`}
          />
          <span className={`text-[10px] font-medium ${accountOpen ? 'text-[var(--primary-600)]' : 'text-gray-400'}`}>
            Cá nhân
          </span>
        </button>

        <button
          onClick={() => navigate('/chat', { state: { focusInput: true, nonce: Date.now() } })}
          aria-label="Ghi giao dịch nhanh"
          className="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] text-white shadow-lg ring-4 ring-white transition-transform active:scale-90"
        >
          <PlusIcon className="h-7 w-7" />
        </button>
      </div>
    </nav>
  )
}
