'use client'

import { Transaction } from '@/hooks/useTransactions'

const METHOD_LABELS = { PIX: 'Pix', CREDIT: 'Crédito', DEBIT: 'Débito' } as const
const METHOD_COLORS = {
  PIX:    'bg-teal-100 text-teal-700',
  CREDIT: 'bg-blue-100 text-blue-700',
  DEBIT:  'bg-purple-100 text-purple-700',
} as const
const STATUS_LABELS = { APPROVED: 'Aprovado', PENDING: 'Pendente', FAILED: 'Falhou' } as const
const STATUS_COLORS = {
  APPROVED: 'text-green-600',
  PENDING:  'text-yellow-600',
  FAILED:   'text-red-600',
} as const

const EMPTY_STATE = {
  message: 'Nenhuma transação ainda.',
  hint:    'Simule um pagamento para começar.',
} as const

interface TransactionFeedProps {
  transactions: Transaction[]
  newTransactionId: string | null
}

export function TransactionFeed({ transactions, newTransactionId }: TransactionFeedProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        {EMPTY_STATE.message}<br />{EMPTY_STATE.hint}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className={`bg-white rounded-lg border p-3 transition-all duration-500 ${
            tx.id === newTransactionId
              ? 'border-green-400 bg-green-50 scale-[1.02] shadow-sm'
              : 'border-gray-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                R$ {parseFloat(tx.amount).toFixed(2).replace('.', ',')}
              </p>
              <p className="text-xs text-gray-500 truncate">{tx.machineName}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${METHOD_COLORS[tx.paymentMethod]}`}>
                {METHOD_LABELS[tx.paymentMethod]}
              </span>
              <span className={`text-xs font-medium ${STATUS_COLORS[tx.status]}`}>
                {STATUS_LABELS[tx.status]}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(tx.createdAt).toLocaleTimeString('pt-BR', { hour12: false })}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
