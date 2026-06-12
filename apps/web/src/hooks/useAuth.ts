'use client'

import { useSyncExternalStore } from 'react'
import { api } from '@/lib/api'
import { TOKEN_KEY } from '@/lib/constants'

const listeners = new Set<() => void>()

function subscribe(callback: () => void) {
  listeners.add(callback)
  window.addEventListener('storage', callback)
  return () => {
    listeners.delete(callback)
    window.removeEventListener('storage', callback)
  }
}

export function useAuth() {
  const token = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(TOKEN_KEY),
    () => null,
  )

  const login = async (email: string, password: string): Promise<void> => {
    const { data } = await api.post('/api/auth/login', { email, password })
    localStorage.setItem(TOKEN_KEY, data.token)
    listeners.forEach(l => l())
  }

  const logout = (): void => {
    localStorage.removeItem(TOKEN_KEY)
    listeners.forEach(l => l())
  }

  return { token, login, logout, isAuthenticated: !!token }
}
