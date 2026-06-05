export interface Product {
  id: number
  sku: string
  name: string
  description?: string | null
  imageUrl?: string | null
  price: number // stored in cents
  stock: number
  createdAt?: string | Date
  updatedAt?: string | Date
}

export type ProductsListData = Product[]
