import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const contractRouter = router({
  getContractsByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.contract.findMany({
        where: { projectId: input.projectId },
        include: {
          items: {
             include: { projectStage: true }
          },
          measurements: true
        },
        orderBy: { createdAt: 'desc' }
      });
    }),

  getContractById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const contract = await ctx.prisma.contract.findUnique({
        where: { id: input.id },
        include: {
          items: {
             include: { projectStage: true }
          },
          project: true,
        }
      });
      if (!contract) throw new TRPCError({ code: 'NOT_FOUND' });
      return contract;
    }),

  createContract: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      supplierName: z.string(),
      supplierCnpj: z.string().optional(),
      retentionPercentage: z.number().min(0).max(100),
      items: z.array(z.object({
        projectStageId: z.string(),
        description: z.string(),
        unit: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().positive()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      const totalValue = input.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

      return ctx.prisma.contract.create({
        data: {
          projectId: input.projectId,
          supplierName: input.supplierName,
          supplierCnpj: input.supplierCnpj,
          retentionPercentage: input.retentionPercentage,
          totalValue,
          items: {
            create: input.items.map((item: { projectStageId: string, description: string, unit: string, quantity: number, unitPrice: number }) => ({
              projectStageId: item.projectStageId,
              description: item.description,
              unit: item.unit,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalValue: item.quantity * item.unitPrice
            }))
          }
        },
        include: { items: true }
      });
    }),

  deleteContract: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.contract.delete({
        where: { id: input.id }
      });
    })
});
