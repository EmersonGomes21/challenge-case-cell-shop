"use client"
import { ProductCardItem } from "@/features/produtcs/product-item";
import { Product } from '@/types/product'
import { useQuery } from "@tanstack/react-query";
import { useState } from 'react'

type ProductsResponse = {
  items: Product[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Erro carregando produtos')
  return res.json()
}

export default function ProductsList() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)

  const { data, isLoading, error } = useQuery<ProductsResponse, Error>(['products', page, pageSize], () => fetcher(`/api/products?page=${page}&pageSize=${pageSize}`), {
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  })

  if (isLoading) return <div className="p-6">Carregando...</div>
  if (error) return <div className="p-6 text-red-600">Erro ao carregar produtos</div>

  return (
    <div>
       <div className="flex items-center gap-2 mb-6">
    <label
      htmlFor="pageSize"
      className="text-sm text-gray-600"
    >
      Itens por página
    </label>

    <select
      id="pageSize"
      value={pageSize}
      onChange={(e) => {
        setPage(1)
        setPageSize(Number(e.target.value))
      }}
      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
    >
      <option value={4}>4</option>
      <option value={8}>8</option>
      <option value={12}>12</option>
      <option value={24}>24</option>
      <option value={48}>48</option>
      <option value={100}>100</option>
    </select>
  </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))] auto-rows-fr gap-20">
        {data?.items.map((p: Product) => (
          <ProductCardItem key={p.id} product={p} />
        ))}
      </div>

    
    </div>
  )
}