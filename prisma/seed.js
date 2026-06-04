const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  await prisma.product.createMany({
    data: [
      { sku: 'CASE-001', name: 'Capinha - Floral', price: 2990, stock: 10 },
      { sku: 'CASE-002', name: 'Capinha - Marble', price: 2590, stock: 8 },
      { sku: 'CASE-003', name: 'Capinha - Clear', price: 1990, stock: 15 },
    ],
    skipDuplicates: true,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
