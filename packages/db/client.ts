import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Lista de models que TEM obrigatoriamente companyId direto
const tenantModels = ['Project', 'Company', 'User', 'FinancialEntry', 'BankAccount', 'Depot'];

export const prisma = globalForPrisma.prisma || new PrismaClient().$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }: { model?: string, operation: string, args: any, query: (args: any) => Promise<any> }) {
        if (process.env.NODE_ENV !== 'production' && tenantModels.includes(model)) {
          // Check if operation is a read/update/delete operation that uses `where`
          if (['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany', 'aggregate', 'groupBy', 'count'].includes(operation)) {
            const hasWhere = args && typeof args === 'object' && 'where' in args;
            const hasCompanyId = hasWhere && args.where && typeof args.where === 'object' && 'companyId' in args.where;
            
            // Allow explicit BYPASS by providing companyId: undefined (maybe admin logic), but warn if entirely missing
            if (!hasCompanyId) {
              console.warn(`[SECURITY WARNING] Missing companyId filter in Prisma query!
                Model: ${model}
                Operation: ${operation}
                Args: ${JSON.stringify(args)}`
              );
            }
          }
        }
        return query(args);
      },
    },
  },
}) as unknown as PrismaClient;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
