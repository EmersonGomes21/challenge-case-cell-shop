import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
import { z } from 'zod'

const bodySchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  idempotencyKey: z.string().optional(),
})

function randomDelay(msMin = 200, msMax = 1500) {
  const ms = Math.floor(Math.random() * (msMax - msMin + 1)) + msMin
  return new Promise((res) => setTimeout(res, ms))
}

async function simulateErp() {
  await randomDelay(300, 2000)
  const rnd = Math.random()
  if (rnd < 0.12) { // 12% temporary failure
    const err: any = new Error('ERP temporary failure')
    err.temporary = true
    throw err
  } else if (rnd < 0.18) { // 6% permanent failure
    throw new Error('ERP permanent failure')
  }
  return true
}

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const parsed = bodySchema.safeParse({
      productId: Number(json.productId),
      quantity: Number(json.quantity),
      idempotencyKey: json.idempotencyKey,
    })
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
    }
    const { productId, quantity, idempotencyKey } = parsed.data

    // Idempotency check
    if (idempotencyKey) {
      const existing = await prisma.idempotency.findUnique({ where: { key: idempotencyKey } })
      if (existing) {
        if (existing.status === 'success') return NextResponse.json(existing.response)
        if (existing.status === 'processing') return NextResponse.json({ message: 'Processing' }, { status: 202 })
        // else continue to attempt
      } else {
        await prisma.idempotency.create({ data: { key: idempotencyKey, status: 'processing' } })
      }
    }

    // Try to decrement stock atomically
    const updated = await prisma.product.updateMany({
      where: { id: productId, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } }
    })

    if (updated.count === 0) {
      if (idempotencyKey) {
        await prisma.idempotency.update({ where: { key: idempotencyKey }, data: { status: 'failed', response: { message: 'Out of stock' } } })
      }
      return NextResponse.json({ message: 'Out of stock' }, { status: 409 })
    }

    // create order
    const unitPrice = (await prisma.product.findUnique({ where: { id: productId } }))!.price
    const order = await prisma.order.create({
      data: {
        status: 'pending',
        total: 0,
        items: {
          create: { productId, quantity, unitPrice }
        }
      },
      include: { items: true }
    })
    // compute total
    const total = order.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0)
    await prisma.order.update({ where: { id: order.id }, data: { total } })

    // simulate ERP
    try {
      await simulateErp()
      await prisma.order.update({ where: { id: order.id }, data: { status: 'confirmed', idempotencyKey } })
      if (idempotencyKey) {
        await prisma.idempotency.update({ where: { key: idempotencyKey }, data: { status: 'success', response: { orderId: order.id, status: 'confirmed' } } })
      }
      return NextResponse.json({ orderId: order.id, status: 'confirmed' })
    } catch (erpErr: any) {
      // rollback stock and cancel order
      await prisma.product.update({ where: { id: productId }, data: { stock: { increment: quantity } } })
      await prisma.order.update({ where: { id: order.id }, data: { status: 'cancelled' } })
      if (idempotencyKey) {
        await prisma.idempotency.update({ where: { key: idempotencyKey }, data: { status: 'failed', response: { message: 'ERP error' } } })
      }
      if (erpErr.temporary) {
        return NextResponse.json({ message: 'Temporary ERP failure' }, { status: 503 })
      }
      return NextResponse.json({ message: 'ERP failure' }, { status: 500 })
    }
  } catch (e) {
    console.error(e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
