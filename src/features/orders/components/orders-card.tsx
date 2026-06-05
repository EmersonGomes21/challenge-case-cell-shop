import { Order } from '@/types/order'
import { formatCurrency, formatDate } from '@/lib/formatters'
import StatusBadge from '@/components/StatusBadge'
import { OrderItem } from './orders-item'

type Props = {
  order: Order
}

export function OrderCard({ order }: Props) {
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
    </div>
  )
}