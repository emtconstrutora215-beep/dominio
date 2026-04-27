import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const catalogItemCategoryRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.prisma.catalogItemCategory.findMany({
        where: { companyId: ctx.companyId! },
        orderBy: { name: 'asc' }
      });
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).transform(s => s.trim().toUpperCase()),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.catalogItemCategory.findFirst({
        where: { 
          name: { equals: input.name, mode: 'insensitive' }, 
          companyId: ctx.companyId! 
        }
      });

      if (existing) {
        throw new Error('Este tipo/categoria já está cadastrado.');
      }

      return ctx.prisma.catalogItemCategory.create({
        data: {
          name: input.name,
          companyId: ctx.companyId!
        }
      });
    })
});
