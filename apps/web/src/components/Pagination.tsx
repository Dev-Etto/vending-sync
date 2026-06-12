'use client'

const BTN_CLASS =
  'text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed'

const LABELS = {
  prev: '← Anterior',
  next: 'Próxima →',
} as const

interface PaginationProps {
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
  label: string
}

export function Pagination({ onPrev, onNext, hasPrev, hasNext, label }: PaginationProps) {
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
      <button onClick={onPrev} disabled={!hasPrev} className={BTN_CLASS}>
        {LABELS.prev}
      </button>
      <span className="text-xs text-gray-400">{label}</span>
      <button onClick={onNext} disabled={!hasNext} className={BTN_CLASS}>
        {LABELS.next}
      </button>
    </div>
  )
}
