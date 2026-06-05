'use client'
import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { ShoppingCart } from 'lucide-react'
import Modal from './modal'
import StatusBadge from './status-badge'
import { Product } from '@/types/product'

type OrderItemView = { productId: number; name?: string | null; sku?: string | null; quantity: number; unitPrice: number; lineTotal?: number }
type ModalData = { orderId?: number; status?: string; total?: number; message?: string; items?: OrderItemView[] }

export default function CheckoutForm({ product, quantity }: { product: Product, quantity: number }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalData, setModalData] = useState<ModalData | null>(null)
  const queryClient = useQueryClient()
  console.log("CheckoutForm render", { product, quantity })
  console.log("modalData render", modalData)

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

  // use react-query to poll the order status only when we have an orderId
  const orderId = modalData?.orderId
  useQuery(
    ['orders', orderId],
    async () => {
      const res = await fetch(`/api/orders/${orderId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const err = new Error(body?.message || 'Erro ao buscar pedido') as any
        err.status = res.status
        throw err
      }
      return res.json()
    },
    {
      enabled: Boolean(orderId),
      refetchInterval: (data: any) => (data && data.status === 'PENDING' ? 1000 : false),
      refetchOnWindowFocus: false,
      retry: false,
      onSuccess: (data: any) => {
        setModalData((prev) => ({ ...(prev ?? {}), ...data }))
      },
    }
  )

  const onBuy = async () => {
    setModalData(null)
    setModalOpen(true)
    try {
      const idempotencyKey = uuidv4()
      const resp = await mutation.mutateAsync({ productId: product.id, quantity, idempotencyKey })
      // resp might be the new shape: { order: {...}, status: 'PENDING' } or legacy { orderId, status }
      if (resp.order) {
        const ord = resp.order
        const items: OrderItemView[] = (ord.items || []).map((it: any) => ({
          productId: it.productId,
          name: it.product?.name,
          sku: it.product?.sku,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          lineTotal: it.unitPrice * it.quantity,
        }))
        setModalData({ orderId: ord.id, status: resp.status ?? ord.status, total: ord.total, items })
        // react-query will start polling because orderId now exists
      } else {
        // legacy response
        setModalData({ orderId: resp.orderId, status: resp.status })
        // react-query will start polling because orderId now exists
      }
    } catch (err: any) {
      // show error in modal
      setModalData({ status: 'ERROR', message: err?.payload?.message ?? err?.message ?? 'Erro' })
    }
  }

  const disabled = mutation.isLoading || quantity < 1 || (product && typeof product.stock === 'number' && quantity > product.stock)

  return (
    <>
      <button
        disabled={disabled}
        onClick={onBuy}
        aria-busy={mutation.isLoading}
        className="inline-flex items-center gap-2 bg-green-500 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2 rounded-md shadow-sm transition transform disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
      >
        <ShoppingCart size={16} />
        {mutation.isLoading ? 'Processando...' : 'Comprar'}
      </button>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Detalhes do Pedido${modalData?.orderId ? ` #${modalData.orderId}` : ''}`}>
        <div className="space-y-4">
          {modalData ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <StatusBadge status={modalData.status} isLoading={modalData.status === 'PENDING'} />
                </div>
               
              </div>

              {typeof modalData.total === 'number' && (
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-blue-600">R$ {(modalData.total / 100).toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Total do pedido</div>
                </div>
              )}

              {modalData.items && modalData.items.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-sm text-gray-600">Itens</div>
                  <div className="bg-white border rounded-md divide-y">
                    {modalData.items.map((it) => (
                      <div key={it.productId} className="flex items-center justify-between px-3 py-2">
                        <div>
                          <div className="font-medium text-gray-800">{it.name ?? it.sku ?? `Produto ${it.productId}`}</div>
                          <div className="text-xs text-gray-500">{it.quantity} × R$ {(it.unitPrice / 100).toFixed(2)}</div>
                        </div>
                        <div className="font-semibold">R$ {((it.lineTotal ?? (it.unitPrice * it.quantity)) / 100).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {modalData.message && <div className="mt-2 text-sm text-red-600">{modalData.message}</div>}
            </div>
          ) : (
            <div className="text-center py-6">Carregando...</div>
          )}
        </div>
      </Modal>
    </>
  )
}
