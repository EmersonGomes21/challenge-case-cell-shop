import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const bodySchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  idempotencyKey: z.string().optional(),
})

function serializeError(e: any) {
  if (!e) return { message: String(e) }
  const result: any = { message: e.message ?? String(e), name: e.name, stack: e.stack }
  if (typeof e === 'object' && e !== null) {
    for (const k of Object.getOwnPropertyNames(e)) {
      if (!(k in result)) {
        try { result[k] = (e as any)[k] } catch (__) {}
      }
    }
  }
  return result
}

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

    console.info('[checkout] start', { productId, quantity, idempotencyKey })

    // Idempotency check and register processing state
    if (idempotencyKey) {
      console.info('[checkout] idempotency:check', { idempotencyKey })
      const existing = await prisma.idempotency.findUnique({ where: { key: idempotencyKey } })
      console.info('[checkout] idempotency:found', { found: !!existing })
      if (existing) {
        if (existing.status === 'SUCCESS') return NextResponse.json(existing.response)
        if (existing.status === 'PROCESSING') return NextResponse.json({ message: 'Processing' }, { status: 202 })
        // else continue to attempt
      } else {
        console.info('[checkout] idempotency:create', { idempotencyKey })
        await prisma.idempotency.create({ data: { key: idempotencyKey, status: 'PROCESSING' } })
        console.info('[checkout] idempotency:created', { idempotencyKey })
      }
    }

    // Use a transaction to decrement stock and create order atomically
    const product = await prisma.product.findUnique({ where: { id: productId } })
    console.info('[checkout] product:lookup', { productId, price: product?.price, stock: product?.stock })
    
    // Validate product exists
    if (!product) {
      return NextResponse.json({ message: 'Product not found', code: 'PRODUCT_NOT_FOUND' }, { status: 404 })
    }

    // Validate stock availability BEFORE transaction (early fail)
    if (product.stock < quantity) {
      console.warn('[checkout] stock:insufficient', { productId, available: product.stock, requested: quantity })
      if (idempotencyKey) {
        await prisma.idempotency.update({ 
          where: { key: idempotencyKey }, 
          data: { status: 'FAILED', response: { message: 'Insufficient stock', code: 'INSUFFICIENT_STOCK', available: product.stock, requested: quantity } } 
        })
      }
      return NextResponse.json({ 
        message: 'Insufficient stock', 
        code: 'INSUFFICIENT_STOCK',
        available: product.stock,
        requested: quantity
      }, { status: 409 })
    }

    const unitPrice = product.price
    console.info('[checkout] transaction:start', { productId, quantity })
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.updateMany({
        where: { id: productId, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } }
      })
      if (updated.count === 0) return { outOfStock: true }

      const order = await tx.order.create({
        data: {
          status: 'PENDING',
          total: 0,
          items: { create: { productId, quantity, unitPrice } },
          idempotencyKey: idempotencyKey ?? undefined,
        },
        include: { items: true }
      })

      const total = order.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0)

      // update order with computed total and return the order including product data
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { total },
        include: { items: { include: { product: true } } }
      })

      // enqueue background job for ERP processing
      await tx.job.create({ data: { type: 'PROCESS_ERP', payload: { orderId: order.id, idempotencyKey } } })

      return { outOfStock: false, order: updatedOrder }
    })

    console.info('[checkout] transaction:result', { result })

    if (result.outOfStock) {
      console.warn('[checkout] stock:race-condition', { productId, quantity })
      if (idempotencyKey) {
        await prisma.idempotency.update({ 
          where: { key: idempotencyKey }, 
          data: { status: 'FAILED', response: { message: 'Insufficient stock (sold out)', code: 'INSUFFICIENT_STOCK' } } 
        })
      }
      return NextResponse.json({ 
        message: 'Insufficient stock (sold out)',
        code: 'INSUFFICIENT_STOCK'
      }, { status: 409 })
    }

    // Respond immediately with the created order (ERP processing will continue in background)
    return NextResponse.json({ order: result.order, status: 'PENDING' }, { status: 202 })
  } catch (e: any) {
    console.error(e)
    const dev = process.env.NODE_ENV !== 'production'
    if (dev) {
      return NextResponse.json({ message: 'Internal error', error: e?.message ?? String(e), stack: e?.stack }, { status: 500 })
    }
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
