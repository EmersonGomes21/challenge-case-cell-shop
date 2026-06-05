'use client'
import { useEffect, useState } from 'react'
import CheckoutForm from '@/components/checkout-form'
import { Product } from '@/types/product'

export  function ProductCardItem({ product }: { product: Product }) {
  const initialQty = (product?.stock ?? 0) > 0 ? 1 : 0
  const [qty, setQty] = useState<number>(initialQty)

  useEffect(() => {
    if (!product) return
    if (product.stock === 0) setQty(0)
    else if (qty < 1) setQty(1)
    else if (qty > product.stock) setQty(product.stock)
  }, [product?.stock])

  const brand = String(product?.name || '').split(' - ')[1] || ''

  const onQtyChange = (v: string) => {
    const n = Number(v)
    if (Number.isNaN(n)) return
    if (product) {
      if (n < 1) setQty(1)
      else if (n > product.stock) setQty(product.stock)
      else setQty(n)
    } else {
      setQty(Math.max(1, n))
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded overflow-hidden h-full flex flex-col shadow-sm transform transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg cursor-pointer">
      <div className="relative p-6 flex items-center justify-center h-48 bg-white">
        {brand && <div className="absolute left-4 top-4 text-xs font-medium text-white bg-blue-600 px-2 py-1 rounded">{brand}</div>}
        {product?.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="max-h-full object-contain" />
        ) : (
          <div className="h-40 w-32 bg-gray-100 flex items-center justify-center">No image</div>
        )}
      </div>
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          <h2 className="text-center font-semibold text-lg mb-2">{product.name}</h2>
          <p className="text-center text-sm text-gray-600 ">{product.description}</p>
        <p className="text-center text-sm text-zinc-500 mt-2 mb-4">
              sku: {product.sku.toLowerCase()}
            </p>
        </div>

        <div className="text-center">
          <div className="text-2xl text-blue-600 font-extrabold">R$ {(product.price / 100).toFixed(2)}</div>
          <div className="text-sm text-gray-600">À vista</div>
          <div className="text-sm text-gray-700 mt-2">ou <strong>R$ {(product.price * 1.12 / 100).toFixed(2)}</strong> em até 3x sem juros.</div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <input
              type="number"
              min={1}
              max={product?.stock ?? undefined}
              value={qty}
              onChange={(e) => onQtyChange(e.target.value)}
              className="w-24 border rounded-md px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            />
            <CheckoutForm product={product} quantity={qty} />
          </div>
        </div>
      </div>
    </div>
  )
}
