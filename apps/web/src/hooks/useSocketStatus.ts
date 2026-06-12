'use client'

import { useState, useEffect } from 'react'
import { getSocket } from '@/lib/socket'

export function useSocketStatus(enabled: boolean) {
  const [connected, setConnected] = useState(() => enabled ? getSocket().connected : false)

  useEffect(() => {
    if (!enabled) return
    const socket = getSocket()
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [enabled])

  return connected
}
