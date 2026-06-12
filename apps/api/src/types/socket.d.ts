export interface ServerToClientEvents {
  new_transaction: (data: {
    transaction: {
      id: string
      machineId: string
      machineName: string
      amount: string
      paymentMethod: 'PIX' | 'CREDIT' | 'DEBIT'
      status: 'PENDING' | 'APPROVED' | 'FAILED'
      createdAt: string
    }
    machine: {
      id: string
      name: string
      stockLevel: number
      status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE'
    }
  }) => void

  machine_updated: (data: {
    machine: {
      id: string
      serialNumber: string
      name: string
      status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE'
      stockLevel: number
      lastHeartbeat: string | null
    }
  }) => void

  simulation_started: () => void
  simulation_stopped: () => void
  simulation_action: (data: { message: string }) => void
}

export interface ClientToServerEvents {}
