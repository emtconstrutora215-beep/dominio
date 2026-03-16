import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const dailyReportRouter = router({
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.dailyReport.findMany({
        where: { projectId: input.projectId },
        orderBy: { date: 'desc' },
        include: { user: { select: { name: true } } }
      });
    }),

  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      description: z.string(),
      weather: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.dailyReport.create({
        data: {
          projectId: input.projectId,
          description: input.description,
          weather: input.weather,
          userId: ctx.user.id
        }
      });
    })
});
