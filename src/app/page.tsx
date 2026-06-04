'use client'
import { useQuery } from '@tanstack/react-query'
import ProductCard from '@/components/ProductCard'

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Erro carregando produtos')
  return res.json()
}

export default function Page() {
  const { data, isLoading, error } = useQuery(['products'], () => fetcher('/api/products'))

  if (isLoading) return <div className="p-6">Carregando...</div>
  if (error) return <div className="p-6 text-red-600">Erro ao carregar produtos</div>

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Capinhas</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.map((p: any) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </main>
  )
}
