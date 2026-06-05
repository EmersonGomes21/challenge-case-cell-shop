"use client"
import { ProductCardItem } from "@/features/produtcs/product-item";
import { Product } from '@/types/product'
import { useQuery } from "@tanstack/react-query";

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Erro carregando produtos')
  return res.json()
}
export default function ProductsList() {

   const { data, isLoading, error } = useQuery<Product[], Error>(['products'], () => fetcher('/api/products'))

  if (isLoading) return <div className="p-6">Carregando...</div>
  if (error) return <div className="p-6 text-red-600">Erro ao carregar produtos</div>

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))] auto-rows-fr gap-20">
      {data.map((p: Product) => (
        <ProductCardItem key={p.id} product={p} />
      ))}
    </div>
  )
}