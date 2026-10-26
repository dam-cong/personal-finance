import type { ReactElement } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import Avatar from '../ui/Avatar'
import {
  HouseholdOutlineIcon,
  HouseholdFilledIcon,
  ChatOutlineIcon,
  ChatFilledIcon,
  StatsOutlineIcon,
  StatsFilledIcon,
  PlusIcon,
} from './BottomNavIcons'

interface Props {
  onOpenAccount: () => void
  accountOpen: boolean
  onOpenInfo: () => void
  infoOpen: boolean
  nameLabel: string
}

interface TabItemProps {
  to: string
  label: string
  Icon: (props: { className?: string }) => ReactElement
  ActiveIcon: (props: { className?: string }) => ReactElement
}

function TabItem({ to, label, Icon, ActiveIcon }: TabItemProps) {
  return (
    <NavLink
      to={to}
      className="flex flex-col items-center justify-center gap-0.5 py-1.5 transition-transform active:scale-90"
    >
      {({ isActive }) => (
        <>
          <span className="relative">
            {isActive ? (
              <ActiveIcon className="h-6 w-6 text-[var(--primary-600)]" />
            ) : (
              <Icon className="h-6 w-6 text-gray-400" />
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
  onOpenAccount,
  accountOpen,
  onOpenInfo,
  infoOpen,
  nameLabel,
}: Props) {
  const navigate = useNavigate()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 md:hidden">
      <div className="relative grid grid-cols-5 items-end rounded-t-3xl border-t border-gray-100 bg-white px-2 pt-1.5 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <TabItem to="/chat" label="Chat" Icon={ChatOutlineIcon} ActiveIcon={ChatFilledIcon} />
        <button
          onClick={onOpenInfo}
          className="flex flex-col items-center justify-center gap-0.5 py-1.5 transition-transform active:scale-90"
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
          className="flex flex-col items-center justify-center gap-0.5 py-1.5 transition-transform active:scale-90"
        >
          <Avatar
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
          className="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-5 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] text-white shadow-lg ring-4 ring-white transition-transform active:scale-90"
        >
          <PlusIcon className="h-7 w-7" />
        </button>
      </div>
    </nav>
  )
}
