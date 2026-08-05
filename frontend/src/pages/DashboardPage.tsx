import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import PeriodSelector from '../components/dashboard/PeriodSelector'
import SummaryCards from '../components/dashboard/SummaryCards'
import SpendingChart from '../components/dashboard/SpendingChart'
import TransactionList from '../components/dashboard/TransactionList'
import BudgetCard from '../components/dashboard/BudgetCard'
import Modal from '../components/ui/Modal'
import { fetchDashboard } from '../api/dashboard'
import { deleteTransaction } from '../api/transactions'
import { deleteBudget, setBudget } from '../api/budgets'
import { useAuth } from '../stores/auth'
import type { Period, Transaction } from '../types'

export default function DashboardPage() {
  const now = new Date()
  const [period, setPeriod] = useState<Period>('month')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1)
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null)
  const queryClient = useQueryClient()
  const currentUsername = useAuth((s) => s.username) ?? ''

  const params =
    period === 'month'
      ? { year, month }
      : period === 'quarter'
        ? { year, quarter }
        : { year }

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', period, year, month, quarter],
    queryFn: () => fetchDashboard(period, params),
  })

  async function confirmDelete() {
    if (!pendingDelete) return
    const id = pendingDelete.id
    setPendingDelete(null)
    try {
      await deleteTransaction(id)
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      await queryClient.invalidateQueries({ queryKey: ['transactions'] })
    } catch {
      // bỏ qua; dữ liệu nhất quán khi tải lại
    }
  }

  async function saveBudget(amount: number) {
    const monthKey = `${year}-${String(month).padStart(2, '0')}`
    await setBudget(monthKey, amount)
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  async function removeBudget() {
    const monthKey = `${year}-${String(month).padStart(2, '0')}`
    await deleteBudget(monthKey)
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const buckets = period === 'month' ? data?.daily ?? [] : data?.monthly ?? []
  const memberCount = data?.members?.length ?? 0

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <PeriodSelector
          period={period}
          onPeriodChange={setPeriod}
          year={year}
          onYearChange={setYear}
          month={month}
          onMonthChange={setMonth}
          quarter={quarter}
          onQuarterChange={setQuarter}
        />

        {data?.household && (
          <div className="rounded-xl bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
            Dashboard chung của nhà <b>{data.household}</b>
            {memberCount > 0 && ` — ${memberCount} thành viên`}. Chỉ chủ giao
            dịch mới xóa được.
          </div>
        )}

        {period === 'month' && (
          <BudgetCard
            budget={data?.budget}
            monthLabel={`${month}/${year}`}
            monthKey={`${year}-${String(month).padStart(2, '0')}`}
            onSave={saveBudget}
            onDelete={removeBudget}
          />
        )}

        {isLoading ? (
          <p className="py-10 text-center text-sm text-gray-400">
            Đang tải dữ liệu...
          </p>
        ) : (
          <>
            <SummaryCards total={data?.total ?? 0} count={data?.count ?? 0} />
            <SpendingChart period={period} buckets={buckets} />
            <TransactionList
              key={`${period}-${year}-${month}-${quarter}`}
              transactions={data?.transactions ?? []}
              currentUsername={currentUsername}
              onDelete={(id) => {
                const t = data?.transactions.find((x) => x.id === id)
                if (t) setPendingDelete(t)
              }}
            />
          </>
        )}
      </div>

      <Modal
        open={pendingDelete != null}
        title="Xóa giao dịch"
        message={`Bạn có chắc muốn xóa "${pendingDelete?.content}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
