import { formatCurrency } from '@/lib/formatters'
import { OrderItem as OrderItemType } from '@/types/order'

type Props = {
  item: OrderItemType
}

export function OrderItem({ item }: Props) {
  return (
    <div className="flex flex-col gap-4 p-6 md:flex-row">
      <img
        src={item.product.imageUrl}
        alt={item.product.name}
        className="h-28 w-28 rounded-xl border object-cover"
      />

      <div className="flex-1">
        <div className="flex flex-col gap-2 md:flex-row md:justify-between">
          <div>
            <h3 className="font-semibold text-zinc-900">
              {item.product.name}
            </h3>

            <p className="mt-1 text-sm text-zinc-500">
              SKU: {item.product.sku}
            </p>

            <p className="mt-2 text-sm text-zinc-600">
              {item.product.description}
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-zinc-500">
              Quantidade
            </p>

            <p className="font-semibold">
              {item.quantity}
            </p>

            <p className="mt-2 text-lg font-bold">
              {formatCurrency(
                item.quantity * item.unitPrice
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}