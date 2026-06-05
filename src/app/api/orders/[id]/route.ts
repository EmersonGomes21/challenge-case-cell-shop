import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    if (!Number.isInteger(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
    const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: true } } } })
    if (!order) return NextResponse.json({ message: 'Not found' }, { status: 404 })

    const items = order.items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      lineTotal: it.quantity * it.unitPrice,
      product: it.product ? { id: it.product.id, name: it.product.name, sku: it.product.sku } : null,
    }))

    return NextResponse.json({ id: order.id, status: order.status, total: order.total, items })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
