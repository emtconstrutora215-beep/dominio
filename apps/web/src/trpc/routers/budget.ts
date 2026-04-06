import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const budgetRouter = router({
  getBudgetParams: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const budget = await ctx.prisma.budget.findUnique({
        where: { projectId: input.projectId }
      });
      return budget;
    }),

  updateBDI: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      bdi: z.number()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.budget.upsert({
        where: { projectId: input.projectId },
        update: { bdi: input.bdi },
        create: { projectId: input.projectId, bdi: input.bdi }
      });
    }),

  getProjectBudget: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const stages = await ctx.prisma.projectStage.findMany({
        where: { projectId: input.projectId },
        include: {
          budgetItems: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'asc' }
      });
      
      const budget = await ctx.prisma.budget.findUnique({
        where: { projectId: input.projectId }
      });

      return { stages, budget };
    }),

  addStage: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1)
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.projectStage.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          plannedCost: 0,
          actualCost: 0,
          percentageComplete: 0
        }
      });
    }),

  addBudgetItem: protectedProcedure
    .input(z.object({
      stageId: z.string(),
      description: z.string().min(1),
      unit: z.string().default('UN'),
      quantity: z.number().default(1),
      unitPrice: z.number().default(0),
      bdi: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const total = input.quantity * input.unitPrice;
      
      return ctx.prisma.budgetItem.create({
        data: {
          projectStageId: input.stageId,
          description: input.description,
          unit: input.unit,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          bdi: input.bdi ?? 0,
          total: total
        }
      });
    }),

  updateBudgetItem: protectedProcedure
    .input(z.object({
      id: z.string(),
      description: z.string().optional(),
      unit: z.string().optional(),
      quantity: z.number().optional(),
      unitPrice: z.number().optional(),
      bdi: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      
      // Se quantidade ou preço mudaram, precisamos recalcular o total
      if (data.quantity !== undefined || data.unitPrice !== undefined) {
        const current = await ctx.prisma.budgetItem.findUnique({ where: { id } });
        if (current) {
          const q = data.quantity ?? current.quantity;
          const p = data.unitPrice ?? current.unitPrice;
          (data as any).total = q * p;
        }
      }

      return ctx.prisma.budgetItem.update({
        where: { id },
        data
      });
    }),

  deleteBudgetItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.budgetItem.delete({
        where: { id: input.id }
      });
    }),

  deleteStage: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.projectStage.delete({
        where: { id: input.id }
      });
    }),
});
