'use client'

const APP_NAME = 'VendingSync'

const SOCKET_LABELS = {
  connected:    'Ao vivo',
  disconnected: 'Desconectado',
} as const

const SIMULATION_LABELS = {
  start: 'Demo ao vivo',
  stop:  'Parar demo',
} as const

const LOGOUT_LABEL = 'Sair'

interface HeaderProps {
  socketConnected: boolean
  onLogout: () => void
  simulationRunning: boolean
  onSimulationToggle: () => void
}

export function Header({ socketConnected, onLogout, simulationRunning, onSimulationToggle }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-gray-900">{APP_NAME}</h1>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">
              {socketConnected ? SOCKET_LABELS.connected : SOCKET_LABELS.disconnected}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onSimulationToggle}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              simulationRunning
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${simulationRunning ? 'bg-red-500 animate-pulse' : 'bg-indigo-400'}`} />
            {simulationRunning ? SIMULATION_LABELS.stop : SIMULATION_LABELS.start}
          </button>
          <button onClick={onLogout} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
            {LOGOUT_LABEL}
          </button>
        </div>
      </div>
    </header>
  )
}
