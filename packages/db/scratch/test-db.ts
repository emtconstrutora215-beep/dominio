import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Testing DB connection...')
    const result = await prisma.$queryRaw`SELECT 1`
    console.log('Connection successful:', result)
    
    const companyCount = await prisma.company.count()
    console.log('Company count:', companyCount)
  } catch (error) {
    console.error('DB Connection Failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
