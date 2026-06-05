'use client'

import { useQuery } from '@tanstack/react-query'
import { Order } from '@/types/order'
import { OrderCard } from '@/features/orders/components/orders-card'
import {  ArrowLeftSquare } from 'lucide-react'
import Link from 'next/link'


async function fetcher(url: string) {
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error('Erro carregando pedidos')
  }

  return res.json()
}

export default function OrdersPage() {
  const { data, isLoading, error } = useQuery<Order[], Error>({
    queryKey: ['orders'],
    queryFn: () => fetcher('/api/orders'),
    refetchInterval(data, query) {
      if (data?.some(order => order.status === 'PENDING')) {
        return 4000
      }
      return false
    },
  })

  if (isLoading) {
    return (
      <div className="p-6">
        Carregando...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        Erro ao carregar pedidos
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="mb-8 flex text-3xl font-bold items-center gap-2">
        <Link href="/" className="text-blue-500 hover:text-blue-700 cursor-pointer">
           <ArrowLeftSquare />
        </Link>
        Histórico de Pedidos
      </h1>

      <div className="space-y-5">
        { data.length === 0 ? (
          <div className="p-6 text-center text-gray-600">
            Nenhum pedido encontrado.
          </div>
        ) : (
          data.map((order) => (
            <OrderCard
              key={order.id}
                order={order}
          />
        )))}
      </div>
    </main>
  )
}