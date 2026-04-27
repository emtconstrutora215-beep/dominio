import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

const STANDARD_BASES = [
  { name: 'SINAPI' },
  { name: 'ORSE' },
  { name: 'PRÓPRIA' },
  { name: 'COMPOSIÇÃO' },
];

export const catalogItemBaseRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const bases = await ctx.prisma.catalogItemBase.findMany({
        where: { companyId: ctx.companyId! },
        orderBy: { name: 'asc' }
      });

      if (bases.length === 0) {
        await ctx.prisma.catalogItemBase.createMany({
          data: STANDARD_BASES.map(b => ({
            ...b,
            companyId: ctx.companyId!
          }))
        });
        return ctx.prisma.catalogItemBase.findMany({
          where: { companyId: ctx.companyId! },
          orderBy: { name: 'asc' }
        });
      }

      return bases;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).transform(s => s.trim().toUpperCase()),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.catalogItemBase.findFirst({
        where: { 
          name: { equals: input.name, mode: 'insensitive' }, 
          companyId: ctx.companyId! 
        }
      });

      if (existing) {
        throw new Error('Esta base já está cadastrada.');
      }

      return ctx.prisma.catalogItemBase.create({
        data: {
          name: input.name,
          companyId: ctx.companyId!
        }
      });
    })
});
