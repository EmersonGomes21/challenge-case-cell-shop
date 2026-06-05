import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const products = [
    {
      sku: 'CASE-001',
      name: 'Capinha - Samsung',
      description: 'Capinha de Silicone Colorido Interior Aveludado cores Masculinas - Samsung',
      imageUrl:
        'https://images.tcdn.com.br/img/img_prod/1056253/90_capinha_de_silicone_colorido_interior_aveludado_co_1_20260121131741_3267371d0664.jpg',
      price: 2990,
      stock: 10,
    },
    {
      sku: 'CASE-002',
      name: 'Capinha - Xiaomi',
      description: 'Capinha de Silicone Colorido Interior Aveludado - Xiaomi',
      imageUrl:
        'https://images.tcdn.com.br/img/img_prod/1056253/90_capinha_de_silicone_colorido_interior_aveludado_xiaomi_8228_1_831edf2a90f63d24041d0a8c9be6dd09.png',
      price: 2590,
      stock: 8,
    },
    {
      sku: 'CASE-003',
      name: 'Capinha - Motorola',
      description: 'Capinha de Silicone Colorido Interior Aveludado - Motorola',
      imageUrl:
        'https://images.tcdn.com.br/img/img_prod/1056253/90_capinha_de_silicone_colorido_interior_aveludado_motorola_8226_1_83c46ddbe1a91a3023b9c8604dabb29b.png',
      price: 1990,
      stock: 15,
    },
    {
      sku: 'CASE-004',
      name: 'Capinha - Samsung',
      description:
        'Capinha de Silicone Colorido Interior Aveludado cores Masculinas - Samsung (Edição Slim)',
      imageUrl:
        'https://images.tcdn.com.br/img/img_prod/1056253/90_capinha_de_silicone_colorido_interior_aveludado_co_1_20260121131741_3267371d0664.jpg',
      price: 2990,
      stock: 5,
    },
    {
      sku: 'CASE-005',
      name: 'Capinha - Samsung',
      description:
        'Capinha de Silicone Colorido Interior Aveludado cores Masculinas - Samsung (Edição Neon)',
      imageUrl:
        'https://images.tcdn.com.br/img/img_prod/1056253/90_capinha_de_silicone_colorido_interior_aveludado_co_1_20260121131741_3267371d0664.jpg',
      price: 2990,
      stock: 6,
    },
    {
      sku: 'CASE-006',
      name: 'Capinha - Xiaomi',
      description:
        'Capinha de Silicone Colorido Interior Aveludado - Xiaomi (Material Premium)',
      imageUrl:
        'https://images.tcdn.com.br/img/img_prod/1056253/90_capinha_de_silicone_colorido_interior_aveludado_xiaomi_8228_1_831edf2a90f63d24041d0a8c9be6dd09.png',
      price: 2590,
      stock: 7,
    },
    {
      sku: 'CASE-007',
      name: 'Capinha - Motorola',
      description:
        'Capinha de Silicone Colorido Interior Aveludado - Motorola (Edição Slim)',
      imageUrl:
        'https://images.tcdn.com.br/img/img_prod/1056253/90_capinha_de_silicone_colorido_interior_aveludado_motorola_8226_1_83c46ddbe1a91a3023b9c8604dabb29b.png',
      price: 1990,
      stock: 9,
    },
    {
      sku: 'CASE-008',
      name: 'Capinha - Universal',
      description:
        'Capinha de Silicone Colorido Interior Aveludado - Universal (Cores Neutras)',
      imageUrl:
        'https://images.tcdn.com.br/img/img_prod/1056253/90_capinha_de_silicone_colorido_interior_aveludado_xiaomi_8228_1_831edf2a90f63d24041d0a8c9be6dd09.png',
      price: 2190,
      stock: 12,
    },
  ]

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: p,
      create: p,
    })
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
