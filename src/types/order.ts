export interface Order {
  id: number
  status: 'PENDING' | 'CONFIRMED' | 'FAILED'
  total: number
  createdAt: string
  idempotencyKey: string
  items: OrderItem[]
}

export interface OrderItem {
  id: number
  quantity: number
  unitPrice: number
  product: {
    id: number
    sku: string
    name: string
    description: string
    imageUrl: string
    price: number
    stock: number
  }
}