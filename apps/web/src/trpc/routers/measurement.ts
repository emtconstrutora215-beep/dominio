import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { addDays } from 'date-fns';

export const measurementRouter = router({
  getMeasurementsByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.measurement.findMany({
        where: { contract: { projectId: input.projectId } },
        include: {
          contract: true,
          measuredBy: true,
          approvedBy: true,
          rejectedBy: true,
          items: {
             include: { contractItem: { include: { projectStage: true } } }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }),

  getMeasurementById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const measurement = await ctx.prisma.measurement.findUnique({
        where: { id: input.id },
        include: {
          contract: true,
          measuredBy: true,
          approvedBy: true,
          rejectedBy: true,
          items: {
             include: { contractItem: { include: { projectStage: true } } }
          }
        }
      });
      if (!measurement) throw new TRPCError({ code: 'NOT_FOUND' });
      return measurement;
    }),

  createMeasurement: protectedProcedure
    .input(z.object({
      contractId: z.string(),
      notes: z.string().optional(),
      attachments: z.array(z.string()).default([]),
      items: z.array(z.object({
        contractItemId: z.string(),
        quantity: z.number().positive(),
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      const contract = await ctx.prisma.contract.findUnique({
        where: { id: input.contractId },
        include: { items: true }
      });

      if (!contract) throw new TRPCError({ code: 'NOT_FOUND' });

      let grossValue = 0;
      
      const measurementItems = input.items.map((item: { contractItemId: string, quantity: number }) => {
         const contractItem = contract.items.find((ci: any) => ci.id === item.contractItemId);
         if (!contractItem) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Item not found in contract' });
         
         grossValue += (item.quantity * contractItem.unitPrice);
         
         return {
           contractItemId: item.contractItemId,
           quantity: item.quantity
         };
      });

      const retentionValue = grossValue * (contract.retentionPercentage / 100);
      const netValue = grossValue - retentionValue;

      return ctx.prisma.measurement.create({
        data: {
          contractId: input.contractId,
          measuredById: ctx.user.id,
          status: 'DRAFT',
          grossValue,
          retentionValue,
          netValue,
          notes: input.notes,
          attachments: input.attachments,
          items: {
            create: measurementItems
          }
        }
      });
    }),

  submitMeasurement: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
       return ctx.prisma.measurement.update({
         where: { id: input.id },
         data: { status: 'PENDING_APPROVAL' }
       });
    }),

  approveMeasurement: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const measurement = await ctx.prisma.measurement.findUnique({
        where: { id: input.id },
        include: {
           contract: { include: { project: true } },
           items: { include: { contractItem: { include: { projectStage: true } } } }
        }
      });

      if (!measurement) throw new TRPCError({ code: 'NOT_FOUND' });
      if (measurement.status !== 'PENDING_APPROVAL') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not pending' });

      return ctx.prisma.$transaction(async (tx: any) => {
         const approved = await tx.measurement.update({
           where: { id: input.id },
           data: {
             status: 'APPROVED',
             approvedById: ctx.user.id,
             approvedAt: new Date()
           }
         });

         await tx.financialEntry.create({
           data: {
             type: 'EXPENSE',
             category: 'Medição Subempreiteiro', 
             description: `Pgto Medição: ${measurement.contract.supplierName} - ${measurement.contract.project.name}`,
             amount: measurement.netValue,
             dueDate: addDays(new Date(), 15),
             status: 'PENDING',
             companyId: measurement.contract.project.companyId,
             measurementId: measurement.id
           }
         });

         for (const item of measurement.items) {
            const stage = item.contractItem.projectStage;
            const itemGrossValue = item.quantity * item.contractItem.unitPrice;
            const newActual = stage.actualCost + itemGrossValue;
            let newPercent = stage.percentageComplete;

            if (stage.plannedCost > 0) {
                newPercent = (newActual / stage.plannedCost) * 100;
            }

            await tx.projectStage.update({
              where: { id: stage.id },
              data: {
                actualCost: newActual,
                percentageComplete: Math.min(newPercent, 100)
              }
            });
         }

         return approved;
      });
    }),

  rejectMeasurement: protectedProcedure
    .input(z.object({ id: z.string(), reason: z.string().min(3) }))
    .mutation(async ({ ctx, input }) => {
      const measurement = await ctx.prisma.measurement.findUnique({
         where: { id: input.id },
         include: { financialEntry: true }
      });
      if (!measurement) throw new TRPCError({ code: 'NOT_FOUND' });

      return ctx.prisma.$transaction(async (tx: any) => {
         if (measurement.financialEntry) {
            await tx.financialEntry.delete({ where: { id: measurement.financialEntry.id } });
         }

         return tx.measurement.update({
           where: { id: input.id },
           data: {
             status: 'REJECTED',
             rejectionReason: input.reason,
             rejectedById: ctx.user.id,
             rejectedAt: new Date(),
             approvedById: null,
             approvedAt: null
           }
         });
      });
    }),

});
