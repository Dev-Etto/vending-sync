'use client'

import { useState } from 'react'
import { Machine } from '@/hooks/useMachines'
import { useMachineActions } from '@/hooks/useMachineActions'
import { MachineCard } from './MachineCard'
import { Pagination } from './Pagination'

const PAGE_SIZE = 6
const TITLE = 'Máquinas'

interface MachinesGridProps {
  machines: Machine[]
  isLoading: boolean
}

export function MachinesGrid({ machines, isLoading }: MachinesGridProps) {
  const { restock, setStatus, loadingId } = useMachineActions()
  const [page, setPage] = useState(0)

  const totalPages = Math.ceil(machines.length / PAGE_SIZE)
  const paginated = machines.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="lg:col-span-2">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">{TITLE} ({machines.length})</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {isLoading
          ? [...Array(PAGE_SIZE)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
                <div className="h-2 bg-gray-100 rounded w-full" />
              </div>
            ))
          : paginated.map((machine) => (
              <MachineCard
                key={machine.id}
                machine={machine}
                onRestock={restock}
                onSetStatus={setStatus}
                loading={loadingId === machine.id}
              />
            ))}
      </div>

      {!isLoading && totalPages > 1 && (
        <Pagination
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
          hasPrev={page > 0}
          hasNext={page < totalPages - 1}
          label={`Pág. ${page + 1} de ${totalPages}`}
        />
      )}
    </div>
  )
}
