'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Machine, MACHINES_QUERY_KEY } from '@/hooks/useMachines'

const API_ENDPOINT = '/api/machines'
const FULL_STOCK_LEVEL = 100

type MachineStatus = Machine['status']

export function useMachineActions() {
  const queryClient = useQueryClient()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const patch = async (id: string, data: { status?: MachineStatus; stockLevel?: number }) => {
    setLoadingId(id)
    try {
      const { data: updated } = await api.patch<Machine>(`${API_ENDPOINT}/${id}`, data)
      queryClient.setQueryData<Machine[]>(MACHINES_QUERY_KEY, (prev) => {
        if (!prev) return prev
        return prev.map((m) => (m.id === id ? updated : m))
      })
    } finally {
      setLoadingId(null)
    }
  }

  const restock = (id: string) => patch(id, { stockLevel: FULL_STOCK_LEVEL })
  const setStatus = (id: string, status: MachineStatus) => patch(id, { status })

  return { restock, setStatus, loadingId }
}
