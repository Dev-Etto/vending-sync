'use client'

import { Transaction } from '@/hooks/useTransactions'
import { TransactionFeed } from './TransactionFeed'
import { Pagination } from './Pagination'

const PANEL_TITLE = 'Transações recentes'
const SKELETON_COUNT = 8

interface TransactionsPanelProps {
  transactions: Transaction[]
  isLoading: boolean
  newTransactionId: string | null
  hasPrev: boolean
  hasNext: boolean
  pageIndex: number
  onPrev: () => void
  onNext: () => void
}

export function TransactionsPanel({
  transactions,
  isLoading,
  newTransactionId,
  hasPrev,
  hasNext,
  pageIndex,
  onPrev,
  onNext,
}: TransactionsPanelProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">{PANEL_TITLE}</h2>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(SKELETON_COUNT)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-100 p-3 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <TransactionFeed transactions={transactions} newTransactionId={newTransactionId} />
      )}

      {!isLoading && (hasPrev || hasNext) && (
        <Pagination
          onPrev={onPrev}
          onNext={onNext}
          hasPrev={hasPrev}
          hasNext={hasNext}
          label={`Pág. ${pageIndex + 1}`}
        />
      )}
    </div>
  )
}
