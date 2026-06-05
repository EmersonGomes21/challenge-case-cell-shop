import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || '8')))

    const skip = (page - 1) * pageSize

    const [items, total] = await Promise.all([
      prisma.product.findMany({ orderBy: { id: 'asc' }, skip, take: pageSize }),
      prisma.product.count(),
    ])

    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    return NextResponse.json({ items, page, pageSize, total, totalPages })
  } catch (e) {
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
