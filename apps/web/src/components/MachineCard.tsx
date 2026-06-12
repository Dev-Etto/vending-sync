'use client'

import { Machine } from '@/hooks/useMachines'

const STATUS_CONFIG = {
  ONLINE:      { label: 'Online',     bg: 'bg-green-100',  dot: 'bg-green-500',  text: 'text-green-800'  },
  OFFLINE:     { label: 'Offline',    bg: 'bg-red-100',    dot: 'bg-red-500',    text: 'text-red-800'    },
  MAINTENANCE: { label: 'Manutenção', bg: 'bg-yellow-100', dot: 'bg-yellow-500', text: 'text-yellow-800' },
} as const

const STATUS_ACTIONS: Record<Machine['status'], { label: string; status: Machine['status'] }[]> = {
  ONLINE:      [{ label: 'Manutenção', status: 'MAINTENANCE' }, { label: 'Offline',     status: 'OFFLINE'      }],
  OFFLINE:     [{ label: 'Ligar',      status: 'ONLINE'      }, { label: 'Manutenção',  status: 'MAINTENANCE'  }],
  MAINTENANCE: [{ label: 'Ligar',      status: 'ONLINE'      }, { label: 'Offline',     status: 'OFFLINE'      }],
}

const LABELS = {
  noLocation: 'Sem localização',
  neverSeen:  'Nunca',
  lastSignal: 'Último sinal',
  stock:      'Estoque',
  restock:    '↑ Reabastecer',
} as const

const STOCK_THRESHOLDS = { ok: 50, low: 20 } as const

function getStockColor(level: number): string {
  if (level > STOCK_THRESHOLDS.ok)  return 'bg-green-500'
  if (level > STOCK_THRESHOLDS.low) return 'bg-yellow-500'
  return 'bg-red-500'
}

function StatusBadge({ status }: { status: Machine['status'] }) {
  const config = STATUS_CONFIG[status]
  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === 'ONLINE' ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  )
}

function StockBar({ level }: { level: number }) {
  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs text-gray-600 mb-1.5">
        <span>{LABELS.stock}</span>
        <span className="font-medium">{level}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${getStockColor(level)}`}
          style={{ width: `${level}%` }}
        />
      </div>
    </div>
  )
}

interface MachineCardProps {
  machine: Machine
  onRestock: (id: string) => void
  onSetStatus: (id: string, status: Machine['status']) => void
  loading: boolean
}

export function MachineCard({ machine, onRestock, onSetStatus, loading }: MachineCardProps) {
  const lastSeen = machine.lastHeartbeat
    ? new Date(machine.lastHeartbeat).toLocaleTimeString('pt-BR', { hour12: false })
    : LABELS.neverSeen

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 transition-all hover:shadow-md">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{machine.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{machine.location || LABELS.noLocation}</p>
        </div>
        <StatusBadge status={machine.status} />
      </div>

      <StockBar level={machine.stockLevel} />

      <p className="text-xs text-gray-400 mt-3">{LABELS.lastSignal}: {lastSeen}</p>

      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5">
        <button
          onClick={() => onRestock(machine.id)}
          disabled={loading || machine.stockLevel === 100}
          className="text-xs px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {LABELS.restock}
        </button>
        {STATUS_ACTIONS[machine.status].map(({ label, status }) => (
          <button
            key={status}
            onClick={() => onSetStatus(machine.id, status)}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
