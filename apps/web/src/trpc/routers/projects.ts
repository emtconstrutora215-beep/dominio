import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const projectsRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.project.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        stages: true,
        dailyReports: {
          take: 2,
          orderBy: { date: 'desc' }
        }
      }
    });
  }),
  
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          stages: {
            include: { budgetItems: true }
          },
          dailyReports: {
            take: 5,
            orderBy: { date: 'desc' }
          }
        }
      });
      return project;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string(),
      address: z.string().optional(),
      budget: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.project.create({
        data: {
          name: input.name,
          address: input.address,
          budget: input.budget || 0,
          companyId: ctx.companyId
        }
      });
    })
});
