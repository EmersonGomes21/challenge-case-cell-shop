import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

export async function POST(_req: Request, ctx: { params: { orderId: string } }) {
  try {
    const params = await ctx.params
    const id = Number(params.orderId)
    if (!Number.isInteger(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

    const order = await prisma.order.findUnique({ where: { id }, include: { items: true } })
    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 })

    if (order.status === 'PENDING') {
      return NextResponse.json({ message: 'Order already pending' }, { status: 400 })
    }
    if (order.status === 'CONFIRMED') {
      return NextResponse.json({ message: 'Cannot retry a confirmed order' }, { status: 400 })
    }

    const idempotencyKey = uuidv4()

    // Create idempotency record, update order status to PENDING and enqueue job atomically
    await prisma.$transaction(async (tx) => {
      await tx.idempotency.create({ data: { key: idempotencyKey, status: 'PROCESSING' } })
      await tx.order.update({ where: { id }, data: { status: 'PENDING', idempotencyKey } })
      await tx.job.create({ data: { type: 'PROCESS_ERP', payload: { orderId: id, idempotencyKey } } })
    })

    return NextResponse.json({ orderId: id, status: 'PENDING', idempotencyKey }, { status: 202 })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
