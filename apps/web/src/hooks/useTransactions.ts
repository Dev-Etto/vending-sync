'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'

export interface Transaction {
  id: string
  machineId: string
  machineName: string
  amount: string
  paymentMethod: 'PIX' | 'CREDIT' | 'DEBIT'
  status: 'PENDING' | 'APPROVED' | 'FAILED'
  createdAt: string
}

const PAGE_SIZE = 6
const API_ENDPOINT = '/api/transactions'
const SOCKET_EVENT = 'new_transaction'
const HIGHLIGHT_DURATION_MS = 2000

const QUERY_KEY = 'transactions'

export function useTransactions(enabled = true) {
  const queryClient = useQueryClient()
  const [newTransactionId, setNewTransactionId] = useState<string | null>(null)
  const [cursors, setCursors] = useState<(string | null)[]>([null])
  const [pageIndex, setPageIndex] = useState(0)

  const cursor = cursors[pageIndex] ?? null

  const query = useQuery<Transaction[]>({
    queryKey: [QUERY_KEY, cursor],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) })
      if (cursor) params.set('before', cursor)
      const { data } = await api.get<Transaction[]>(`${API_ENDPOINT}?${params}`)
      return data
    },
    enabled,
  })

  const nextPage = () => {
    const current = query.data ?? []
    if (current.length < PAGE_SIZE) return
    const nextCursor = current[current.length - 1].createdAt
    setCursors((prev) => {
      const updated = [...prev]
      updated[pageIndex + 1] = nextCursor
      return updated
    })
    setPageIndex((prev) => prev + 1)
  }

  const prevPage = () => {
    if (pageIndex === 0) return
    setPageIndex((prev) => prev - 1)
  }

  useEffect(() => {
    const socket = getSocket()

    const handleNewTransaction = ({ transaction }: { transaction: Transaction }) => {
      if (pageIndex === 0) {
        queryClient.setQueryData<Transaction[]>([QUERY_KEY, null], (prev) =>
          [transaction, ...(prev ?? []).slice(0, PAGE_SIZE - 1)]
        )
        setCursors([null])
      }
      setNewTransactionId(transaction.id)
      setTimeout(() => setNewTransactionId(null), HIGHLIGHT_DURATION_MS)
    }

    socket.on(SOCKET_EVENT, handleNewTransaction)
    return () => { socket.off(SOCKET_EVENT, handleNewTransaction) }
  }, [queryClient, pageIndex])

  return {
    ...query,
    newTransactionId,
    nextPage,
    prevPage,
    hasPrev: pageIndex > 0,
    hasNext: (query.data?.length ?? 0) === PAGE_SIZE,
    pageIndex,
  }
}
