import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const companyRouter = router({
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.company.findUnique({
      where: { id: ctx.companyId! },
      select: { approvalThreshold: true }
    });
  }),
  
  updateThreshold: protectedProcedure
    .input(z.object({ threshold: z.number().min(0) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== 'ADMIN') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem alterar o limite de aprovação.' });
      }
      return ctx.prisma.company.update({
        where: { id: ctx.companyId! },
        data: { approvalThreshold: input.threshold }
      });
    }),

  getUsers: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({
      where: { companyId: ctx.companyId! },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });
  })
});
