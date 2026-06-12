'use client'

import { useAuth } from '@/hooks/useAuth'
import { useMachines } from '@/hooks/useMachines'
import { useTransactions } from '@/hooks/useTransactions'
import { useSocketStatus } from '@/hooks/useSocketStatus'
import { useSimulation } from '@/hooks/useSimulation'
import { Header } from '@/components/Header'
import { StatCard } from '@/components/StatCard'
import { MachinesGrid } from '@/components/MachinesGrid'
import { TransactionsPanel } from '@/components/TransactionsPanel'
import { LoginForm } from '@/components/LoginForm'

const LOW_STOCK_THRESHOLD = 20

const STAT_LABELS = {
  online:      'Online',
  offline:     'Offline',
  maintenance: 'Manutenção',
  lowStock:    'Estoque crítico',
} as const

const STAT_COLORS = {
  online:            'text-green-600',
  offline:           'text-red-500',
  maintenanceActive: 'text-yellow-500',
  lowStockActive:    'text-orange-500',
  inactive:          'text-gray-400',
} as const

const SIMULATION_BAR_LABEL = 'Demo ao vivo'

export default function DashboardPage() {
  const { isAuthenticated, login, logout } = useAuth()
  const { data: machines = [], isLoading: machinesLoading } = useMachines(isAuthenticated)
  const { data: transactions = [], isLoading: txLoading, newTransactionId, nextPage, prevPage, hasPrev, hasNext, pageIndex } = useTransactions(isAuthenticated)
  const socketConnected = useSocketStatus(isAuthenticated)
  const { running: simRunning, lastAction, toggle: toggleSim } = useSimulation()

  if (!isAuthenticated) return <LoginForm onLogin={login} />

  const onlineCount      = machines.filter((m) => m.status === 'ONLINE').length
  const offlineCount     = machines.filter((m) => m.status === 'OFFLINE').length
  const maintenanceCount = machines.filter((m) => m.status === 'MAINTENANCE').length
  const lowStockCount    = machines.filter((m) => m.stockLevel <= LOW_STOCK_THRESHOLD).length

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        socketConnected={socketConnected}
        onLogout={logout}
        simulationRunning={simRunning}
        onSimulationToggle={toggleSim}
      />

      {simRunning && (
        <div className="bg-indigo-50 border-b border-indigo-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse flex-shrink-0" />
            <span className="text-xs font-medium text-indigo-700">{SIMULATION_BAR_LABEL}</span>
            {lastAction && (
              <>
                <span className="text-indigo-300 text-xs select-none">·</span>
                <span className="text-xs text-indigo-600 truncate">{lastAction}</span>
              </>
            )}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard value={onlineCount}      label={STAT_LABELS.online}      colorClass={STAT_COLORS.online} />
          <StatCard value={offlineCount}     label={STAT_LABELS.offline}     colorClass={STAT_COLORS.offline} />
          <StatCard
            value={maintenanceCount}
            label={STAT_LABELS.maintenance}
            colorClass={maintenanceCount > 0 ? STAT_COLORS.maintenanceActive : STAT_COLORS.inactive}
          />
          <StatCard
            value={lowStockCount}
            label={STAT_LABELS.lowStock}
            colorClass={lowStockCount > 0 ? STAT_COLORS.lowStockActive : STAT_COLORS.inactive}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <MachinesGrid machines={machines} isLoading={machinesLoading} />
          <TransactionsPanel
            transactions={transactions}
            isLoading={txLoading}
            newTransactionId={newTransactionId}
            hasPrev={hasPrev}
            hasNext={hasNext}
            pageIndex={pageIndex}
            onPrev={prevPage}
            onNext={nextPage}
          />
        </div>
      </main>
    </div>
  )
}
