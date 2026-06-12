'use client'

interface StatCardProps {
  value: number
  label: string
  colorClass: string
}

export function StatCard({ value, label, colorClass }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
