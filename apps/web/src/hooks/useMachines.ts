'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'

export interface Machine {
  id: string
  serialNumber: string
  name: string
  location: string | null
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE'
  stockLevel: number
  lastHeartbeat: string | null
  createdAt: string
}

const PAGE_SIZE = 6
const API_ENDPOINT = '/api/machines'
const SOCKET_EVENT = 'machine_updated'

export const MACHINES_QUERY_KEY = ['machines'] as const

export function useMachines(enabled = true) {
  const queryClient = useQueryClient()

  const params = new URLSearchParams({ limit: String(PAGE_SIZE) })

  const query = useQuery<Machine[]>({
    queryKey: MACHINES_QUERY_KEY,
    queryFn: async () => {
      const { data } = await api.get(`${API_ENDPOINT}?${params}`)
      return data
    },
    enabled,
  })

  useEffect(() => {
    const socket = getSocket()

    const handleMachineUpdated = ({ machine }: { machine: Machine }) => {
      queryClient.setQueryData<Machine[]>(MACHINES_QUERY_KEY, (prev) => {
        if (!prev) return prev
        return prev.map((m) => (m.id === machine.id ? { ...m, ...machine } : m))
      })
    }

    socket.on(SOCKET_EVENT, handleMachineUpdated)

    return () => {
      socket.off(SOCKET_EVENT, handleMachineUpdated)
    }
  }, [queryClient])

  return query
}
