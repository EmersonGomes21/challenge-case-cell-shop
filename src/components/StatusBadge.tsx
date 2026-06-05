"use client"
import React from 'react'

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'ERROR' | string | undefined

export default function StatusBadge({ status }: { status?: OrderStatus }) {
  const s = status ?? 'UNKNOWN'
  if (s === 'PENDING') {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">Pendente</span>
  }
  if (s === 'CONFIRMED') {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">Aprovado</span>
  }
  if (s === 'CANCELLED') {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">Recusado</span>
  }
  if (s === 'ERROR') {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">Erro</span>
  }
  return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">{String(s)}</span>
}
