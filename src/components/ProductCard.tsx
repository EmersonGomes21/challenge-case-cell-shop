'use client'
import { useState } from 'react'
import CheckoutForm from './CheckoutForm'

export default function ProductCard({ product }: { product: any }) {
  const [qty, setQty] = useState(1)
  return (
    <div className="border rounded p-4">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-semibold">{product.name}</h2>
          <div className="text-sm text-gray-600">SKU: {product.sku}</div>
          <div className="mt-2 text-lg">R$ {(product.price / 100).toFixed(2)}</div>
          <div className="mt-1 text-sm">Estoque: {product.stock}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          className="w-20 border rounded px-2 py-1"
        />
        <CheckoutForm product={product} quantity={qty} />
      </div>
    </div>
  )
}
