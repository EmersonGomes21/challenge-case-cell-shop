"use client"
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Order } from '@/types/order'
import { formatCurrency, formatDate } from '@/lib/formatters'
import StatusBadge from '@/components/status-badge'
import { OrderItem } from './orders-item'
import { useState } from 'react'

type Props = {
  order: Order
}

export function OrderCard({ order }: Props) {
  const queryClient = useQueryClient()
  const [localLoading, setLocalLoading] = useState(false)

  const retryMutation = useMutation(async () => {
    setLocalLoading(true)
    try {
      const res = await fetch(`/api/checkout/retry/${order.id}`, { method: 'POST' })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.message || 'Erro ao reenfileirar')
      return body
    } finally {
      setLocalLoading(false)
    }
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries(['orders'])
    }
  })

  const canRetry = order.status === 'CANCELLED'

  console.log("Rendering OrderCard", { order, canRetry, })
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">
              Pedido #{order.id}
            </p>

            <p className="font-medium text-zinc-900">
              {formatDate(order.createdAt)}
            </p>
          </div>

          <StatusBadge status={order.status} />

          <div className="text-right">
            <p className="text-sm text-zinc-500">
              Total
            </p>

            <p className="text-xl font-bold text-zinc-900">
              {formatCurrency(order.total)}
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-zinc-100">
        {order.items.map((item) => (
          <OrderItem
            key={item.id}
            item={item}
          />
        ))}
      </div>

      <div className="bg-zinc-50 px-6 py-3 text-xs text-zinc-500">
        Idempotency Key: {order.idempotencyKey}
      </div>
      {canRetry && (
        <div className="px-6 py-3 flex justify-end">
          <button
            disabled={retryMutation.isLoading || localLoading}
            onClick={() => retryMutation.mutate()}
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm disabled:opacity-50"
          >
            {retryMutation.isLoading || localLoading ? 'Reenviando...' : 'Comprar Novamente'}
          </button>
        </div>
      )}
    </div>
  )
}