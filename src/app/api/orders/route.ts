import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(_req: Request) {
  try {
    const orders = await prisma.order.findMany({ 
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(orders)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }

}
