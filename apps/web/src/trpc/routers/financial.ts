import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const financialRouter = router({
  getDashboardData: protectedProcedure.query(async ({ ctx }) => {
    const entries = await ctx.prisma.financialEntry.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { dueDate: 'asc' }
    });

    const totalIncome = entries
      .filter((e: any) => e.type === 'INCOME')
      .reduce((acc: number, curr: any) => acc + curr.amount, 0);

    const totalExpense = entries
      .filter((e: any) => e.type === 'EXPENSE')
      .reduce((acc: number, curr: any) => acc + curr.amount, 0);

    return {
      entries,
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense
      }
    };
  }),

  getCreateOptions: protectedProcedure.query(async ({ ctx }) => {
    const [
      contacts, 
      bankAccounts, 
      purchaseOrders, 
      goodsReceipts, 
      contracts, 
      measurements, 
      projects
    ] = await Promise.all([
      ctx.prisma.contact.findMany({ where: { companyId: ctx.companyId }, select: { id: true, name: true, document: true } }),
      ctx.prisma.bankAccount.findMany({ where: { companyId: ctx.companyId }, select: { id: true, name: true, currentBalance: true } }),
      ctx.prisma.purchaseOrder.findMany({ 
        where: { 
          quote: { request: { companyId: ctx.companyId } },
          status: { in: ['ISSUED', 'AWAITING_RECEIPT', 'PARTIALLY_RECEIVED', 'RECEIVED'] }
        }, 
        include: { 
          quote: { 
            include: { 
              suppliers: { 
                where: { isWinner: true },
                select: { totalPrice: true }
              } 
            } 
          } 
        } 
      }),
      ctx.prisma.goodsReceipt.findMany({ 
        where: { purchaseOrder: { quote: { request: { companyId: ctx.companyId } } } }, 
        select: { id: true, createdAt: true, purchaseOrder: { select: { number: true } } } 
      }),
      ctx.prisma.contract.findMany({ 
        where: { project: { companyId: ctx.companyId } }, 
        select: { id: true, supplierName: true, totalValue: true, project: { select: { name: true } } } 
      }),
      ctx.prisma.measurement.findMany({ 
        where: { contract: { project: { companyId: ctx.companyId } }, status: 'APPROVED' }, 
        select: { id: true, netValue: true, contract: { select: { supplierName: true } } } 
      }),
      ctx.prisma.project.findMany({ 
        where: { companyId: ctx.companyId }, 
        select: { id: true, name: true, stages: { select: { id: true, name: true } } } 
      }),
    ]);

    return { contacts, bankAccounts, purchaseOrders, goodsReceipts, contracts, measurements, projects };
  }),

  createEntry: protectedProcedure
    .input(z.object({
      type: z.enum(['INCOME', 'EXPENSE']),
      category: z.string(),
      description: z.string(),
      amount: z.number(),
      dueDate: z.string(),
      competencyDate: z.string().optional(),
      documentNumber: z.string().optional(),
      paymentCondition: z.string().optional(),
      paymentMethod: z.string().optional(),
      contactId: z.string().optional(),
      bankAccountId: z.string().optional(),
      purchaseOrderId: z.string().optional(),
      goodsReceiptId: z.string().optional(),
      contractId: z.string().optional(),
      measurementId: z.string().optional(),
      retentions: z.number().optional(),
      observations: z.string().optional(),
      payerType: z.string().optional(),
      status: z.enum(['PENDING', 'PAID']).optional(),
      splits: z.array(z.object({
        projectId: z.string(),
        projectStageId: z.string().optional(),
        percentage: z.number(),
        amount: z.number()
      })).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { splits, ...data } = input;
      
      const entry = await ctx.prisma.financialEntry.create({
        data: {
          ...data,
          dueDate: new Date(input.dueDate),
          competencyDate: input.competencyDate ? new Date(input.competencyDate) : new Date(input.dueDate),
          paidDate: input.status === 'PAID' ? new Date() : null,
          status: (input.status as any) || 'PENDING',
          companyId: ctx.companyId,
          attachmentUrls: [],
          splits: splits ? {
            create: splits.map(s => ({
              projectId: s.projectId,
              projectStageId: s.projectStageId,
              percentage: s.percentage,
              amount: s.amount
            }))
          } : undefined
        }
      });

      return entry;
    }),

  getEntries: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      search: z.string().optional(),
      bankAccountId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = {
        companyId: ctx.companyId,
      };

      if (input.startDate || input.endDate) {
        where.competencyDate = {};
        if (input.startDate) where.competencyDate.gte = new Date(input.startDate);
        if (input.endDate) where.competencyDate.lte = new Date(input.endDate);
      }

      if (input.search) {
        where.OR = [
          { description: { contains: input.search, mode: 'insensitive' } },
          { documentNumber: { contains: input.search, mode: 'insensitive' } },
          { contact: { name: { contains: input.search, mode: 'insensitive' } } },
        ];
      }

      if (input.bankAccountId) {
        where.bankTransaction = {
          bankAccountId: input.bankAccountId
        };
      }

      return ctx.prisma.financialEntry.findMany({
        where,
        include: {
          contact: { select: { id: true, name: true } },
          splits: {
            include: {
              project: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { competencyDate: 'desc' }
      });
    }),

  getCashFlow: protectedProcedure
    .query(async ({ ctx }) => {
      const entries = await ctx.prisma.financialEntry.findMany({
        where: { companyId: ctx.companyId },
        orderBy: { dueDate: 'asc' }
      });

      // Group by date
      const flowMap: Record<string, { date: string; income: number; expense: number; balance: number }> = {};

      entries.forEach((e: any) => {
        const dateObj = e.status === 'PAID' && e.paidDate ? e.paidDate : e.dueDate;
        const date = dateObj.toISOString().split('T')[0];
        if (!flowMap[date]) flowMap[date] = { date, income: 0, expense: 0, balance: 0 };
        
        if (e.type === 'INCOME') flowMap[date].income += e.amount;
        if (e.type === 'EXPENSE') flowMap[date].expense += e.amount;
      });

      const flowArray = Object.values(flowMap).sort((a,b) => a.date.localeCompare(b.date));
      let cumulative = 0;
      return flowArray.map((f: any) => {
         cumulative += (f.income - f.expense);
         return { ...f, balance: cumulative };
      });
    }),

  getDRE: protectedProcedure
    .input(z.object({
      regime: z.enum(['CASH', 'ACCRUAL']),
      startDate: z.string(),
      endDate: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const gte = new Date(input.startDate);
      const lte = new Date(input.endDate);

      // Where clauses based on regime
      const dateFilter = input.regime === 'CASH' 
        ? { paidDate: { gte, lte }, status: 'PAID' as const }
        : { competencyDate: { gte, lte } };

      const entries = await ctx.prisma.financialEntry.findMany({
        where: {
          companyId: ctx.companyId,
          ...dateFilter
        }
      });

      // DRE generally groups by category and shows subtotals
      const categories: Record<string, { name: string; type: 'INCOME' | 'EXPENSE'; amount: number }> = {};
      let totalIncome = 0;
      let totalExpense = 0;

      entries.forEach((e: any) => {
        if (!categories[e.category]) {
           categories[e.category] = { name: e.category, type: e.type, amount: 0 };
        }
        categories[e.category].amount += e.amount;
        
        if (e.type === 'INCOME') totalIncome += e.amount;
        if (e.type === 'EXPENSE') totalExpense += e.amount;
      });

      return {
        regime: input.regime,
        period: { start: input.startDate, end: input.endDate },
        categories: Object.values(categories).sort((a, b) => b.amount - a.amount),
        summary: {
           grossRevenue: totalIncome,
           operatingExpenses: totalExpense,
           netResult: totalIncome - totalExpense
        }
      };
    }),

  addEntrySplit: protectedProcedure
    .input(z.object({
      entryId: z.string(),
      splits: z.array(z.object({
        projectId: z.string(),
        percentage: z.number(),
        amount: z.number()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      const totalPercent = input.splits.reduce((acc: number, s: any) => acc + s.percentage, 0);
      if (Math.abs(totalPercent - 100) > 0.01) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'A soma das porcentagens deve ser 100%.' });
      }

      return ctx.prisma.$transaction(async (tx: any) => {
        // Remove existing splits
        await tx.financialEntrySplit.deleteMany({ where: { financialEntryId: input.entryId } });
        // Create new ones
        return tx.financialEntrySplit.createMany({
          data: input.splits.map((s: any) => ({
            financialEntryId: input.entryId,
            projectId: s.projectId,
            percentage: s.percentage,
            amount: s.amount
          }))
        });
      });
    }),

  getEntrySplits: protectedProcedure
    .input(z.object({ entryId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.financialEntrySplit.findMany({
        where: { financialEntryId: input.entryId },
        include: { project: { select: { name: true } } }
      });
    }),

  removeEntrySplit: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.financialEntrySplit.delete({ where: { id: input.id } });
    })
});
