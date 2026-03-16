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
});
