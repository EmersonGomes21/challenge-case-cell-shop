'use client'

type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'ERROR'
  | string
  | undefined

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pendente',
    className: 'bg-blue-100 text-blue-700',
  },
  CONFIRMED: {
    label: 'Aprovado',
    className: 'bg-green-100 text-green-700',
  },
  CANCELLED: {
    label: 'Recusado',
    className: 'bg-red-100 text-red-700',
  },
  ERROR: {
    label: 'Erro',
    className: 'bg-red-100 text-red-700',
  },
} as const

export default function StatusBadge({
  status,
  isLoading = false,
}: {
  status?: OrderStatus,
  isLoading?: boolean
}) {
  const config =
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
        config?.className ?? 'bg-gray-100 text-gray-800'
      }`}
    >
      {config?.label ?? String(status ?? 'UNKNOWN')}
      {isLoading && (
        <div className="mx-1 h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      )}
    </span>
  )
}