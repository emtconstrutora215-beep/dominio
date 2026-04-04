import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const jobRoleRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.jobRole.findMany({
      where: { companyId: ctx.companyId! },
      orderBy: { name: 'asc' }
    });
  }),
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1, 'Nome do cargo é obrigatório')
    }))
    .mutation(async ({ ctx, input }) => {
      // Verifica se o cargo já existe para não duplicar
      const existing = await ctx.prisma.jobRole.findFirst({
        where: {
          name: {
            equals: input.name,
            mode: 'insensitive'
          },
          companyId: ctx.companyId!
        }
      });
      if (existing) {
        return existing;
      }
      return ctx.prisma.jobRole.create({
        data: {
          name: input.name,
          companyId: ctx.companyId!
        }
      });
    })
});
