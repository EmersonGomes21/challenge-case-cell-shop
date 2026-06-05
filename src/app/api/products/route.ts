import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'

export async function GET() {
  try {
    const products = await prisma.product.findMany({orderBy: { id: 'asc' }})
    return NextResponse.json(products)
  } catch (e) {
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
