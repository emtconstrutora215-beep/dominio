import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const contractTemplatesRouter = router({
  getTemplates: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.prisma.contractTemplate.findMany({
        where: { companyId: ctx.companyId },
        orderBy: { updatedAt: 'desc' }
      });
    }),

  createTemplate: protectedProcedure
    .input(z.object({
      name: z.string(),
      content: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.contractTemplate.create({
        data: {
          name: input.name,
          content: input.content,
          companyId: ctx.companyId
        }
      });
    }),

  updateTemplate: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string(),
      content: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.contractTemplate.update({
        where: { id: input.id },
        data: {
          name: input.name,
          content: input.content
        }
      });
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.contractTemplate.delete({
        where: { id: input.id }
      });
    })
});
