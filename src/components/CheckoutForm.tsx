'use client'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'

export default function CheckoutForm({ product, quantity }: { product: any, quantity: number }) {
  const [message, setMessage] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const mutation = useMutation(async (payload: any) => {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await res.json()
    if (!res.ok) {
      const err: any = new Error(body?.message || 'Erro')
      err.status = res.status
      err.payload = body
      throw err
    }
    return body
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries(['products'])
    }
  })

  const onBuy = async () => {
    setMessage(null)
    try {
      const idempotencyKey = uuidv4()
      await mutation.mutateAsync({ productId: product.id, quantity, idempotencyKey })
      setMessage('Compra realizada com sucesso!')
    } catch (err: any) {
      if (err.status === 409) setMessage('Estoque insuficiente para essa quantidade.')
      else if (err.status === 400) setMessage('Entrada inválida. Verifique os dados.')
      else if (err.status === 503) setMessage('Erro temporário no processamento. Tente novamente.')
      else setMessage('Erro ao processar pedido.')
    }
  }

  return (
    <div>
      <button disabled={mutation.isLoading} onClick={onBuy} className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50">
        {mutation.isLoading ? 'Processando...' : 'Comprar'}
      </button>
      {message && <div className="mt-2 text-sm">{message}</div>}
    </div>
  )
}
