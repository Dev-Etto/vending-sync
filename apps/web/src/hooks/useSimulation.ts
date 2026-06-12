'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'

const TOGGLE_ENDPOINT = '/api/simulate/toggle'

const SOCKET_EVENTS = {
  action:  'simulation_action',
  started: 'simulation_started',
  stopped: 'simulation_stopped',
} as const

export function useSimulation() {
  const [running, setRunning] = useState(false)
  const [lastAction, setLastAction] = useState<string | null>(null)

  useEffect(() => {
    const socket = getSocket()

    const onAction  = ({ message }: { message: string }) => setLastAction(message)
    const onStarted = () => setRunning(true)
    const onStopped = () => { setRunning(false); setLastAction(null) }

    socket.on(SOCKET_EVENTS.action,  onAction)
    socket.on(SOCKET_EVENTS.started, onStarted)
    socket.on(SOCKET_EVENTS.stopped, onStopped)

    return () => {
      socket.off(SOCKET_EVENTS.action,  onAction)
      socket.off(SOCKET_EVENTS.started, onStarted)
      socket.off(SOCKET_EVENTS.stopped, onStopped)
    }
  }, [])

  const toggle = useCallback(async () => {
    const { data } = await api.post<{ running: boolean }>(TOGGLE_ENDPOINT)
    setRunning(data.running)
    if (!data.running) setLastAction(null)
  }, [])

  return { running, lastAction, toggle }
}
