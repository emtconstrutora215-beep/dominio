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

  createEntry: protectedProcedure
    .input(z.object({
      type: z.enum(['INCOME', 'EXPENSE']),
      category: z.string(),
      description: z.string(),
      amount: z.number(),
      dueDate: z.string(),
      competencyDate: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.financialEntry.create({
        data: {
          type: input.type,
          category: input.category,
          description: input.description,
          amount: input.amount,
          dueDate: new Date(input.dueDate),
          competencyDate: input.competencyDate ? new Date(input.competencyDate) : new Date(input.dueDate),
          companyId: ctx.companyId
        }
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

      return ctx.prisma.$transaction(async (tx) => {
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
