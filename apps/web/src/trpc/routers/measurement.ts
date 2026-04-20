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
          contract: { include: { project: true } },
          measuredBy: true,
          approvedBy: true,
          rejectedBy: true,
          items: {
             include: { contractItem: { include: { projectStage: true } } }
          },
          discounts: true,
          retentions: true,
          comments: { include: { user: true } }
        }
      });
      if (!measurement) throw new TRPCError({ code: 'NOT_FOUND' });
      return measurement;
    }),

  getDataForNewMeasurement: protectedProcedure
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      const contract = await ctx.prisma.contract.findUnique({
        where: { id: input.contractId },
        include: {
          project: true,
          items: {
            include: {
              projectStage: true,
              measurements: {
                where: { measurement: { status: 'APPROVED' } },
                include: { measurement: true }
              }
            }
          },
          measurements: {
            select: { number: true },
            orderBy: { number: 'desc' },
            take: 1
          }
        }
      });

      if (!contract) throw new TRPCError({ code: 'NOT_FOUND' });

      const nextNumber = (contract.measurements[0]?.number || 0) + 1;

      const items = contract.items.map(item => {
        const totalMeasuredQuantity = item.measurements.reduce((acc, m) => acc + m.quantity, 0);
        const totalMeasuredValue = totalMeasuredQuantity * item.unitPrice;
        
        const remainingQuantity = item.quantity - totalMeasuredQuantity;
        const remainingValue = item.totalValue - totalMeasuredValue;
        const remainingPercentage = item.totalValue > 0 ? (remainingValue / item.totalValue) * 100 : 0;

        return {
          id: item.id,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalValue: item.totalValue,
          projectStageName: item.projectStage.name,
          remainingQuantity,
          remainingValue,
          remainingPercentage
        };
      });

      return {
        contract,
        nextNumber,
        items
      };
    }),

  createMeasurement: protectedProcedure
    .input(z.object({
      contractId: z.string(),
      title: z.string().optional(),
      notes: z.string().optional(),
      attachments: z.array(z.string()).default([]),
      items: z.array(z.object({
        contractItemId: z.string(),
        quantity: z.number().positive(),
      })),
      discounts: z.array(z.object({
        type: z.string(),
        description: z.string().optional(),
        value: z.number(),
        percentage: z.number().optional()
      })).default([]),
      retentions: z.array(z.object({
        type: z.string(),
        description: z.string().optional(),
        value: z.number(),
        percentage: z.number().optional()
      })).default([])
    }))
    .mutation(async ({ ctx, input }) => {
      const contract = await ctx.prisma.contract.findUnique({
        where: { id: input.contractId },
        include: { 
          items: true,
          measurements: {
            select: { number: true },
            orderBy: { number: 'desc' },
            take: 1
          }
        }
      });

      if (!contract) throw new TRPCError({ code: 'NOT_FOUND' });

      const nextNumber = (contract.measurements[0]?.number || 0) + 1;
      let grossValue = 0;
      
      const measurementItems = input.items.map(item => {
         const contractItem = contract.items.find(ci => ci.id === item.contractItemId);
         if (!contractItem) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Item not found in contract' });
         
         grossValue += (item.quantity * contractItem.unitPrice);
         
         return {
           contractItemId: item.contractItemId,
           quantity: item.quantity
         };
      });

      const totalDiscounts = input.discounts.reduce((acc, d) => acc + d.value, 0);
      const totalRetentions = input.retentions.reduce((acc, r) => acc + r.value, 0);
      
      const netValue = grossValue - totalDiscounts - totalRetentions;

      return ctx.prisma.measurement.create({
        data: {
          contractId: input.contractId,
          measuredById: ctx.user.id,
          status: 'DRAFT',
          number: nextNumber,
          title: input.title,
          grossValue,
          retentionValue: totalRetentions,
          netValue,
          notes: input.notes,
          attachments: input.attachments,
          items: {
            create: measurementItems
          },
          discounts: {
            create: input.discounts
          },
          retentions: {
            create: input.retentions
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

  getProjectsSummary: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { search, status } = input;

      const projects = await ctx.prisma.project.findMany({
        where: {
          companyId: ctx.companyId,
          ...(status ? { status: status as any } : {}),
          ...(search ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
              { client: { name: { contains: search, mode: 'insensitive' } } }
            ]
          } : {})
        },
        include: {
          client: true,
          contracts: {
            include: {
              measurements: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      return projects.map(project => {
        const allMeasurements = project.contracts.flatMap(c => c.measurements);
        const approvedMeasurements = allMeasurements.filter(m => m.status === 'APPROVED');
        
        const totalContractValue = project.contracts.reduce((acc, c) => acc + c.totalValue, 0);
        const totalApprovedValue = approvedMeasurements.reduce((acc, m) => acc + m.grossValue, 0);
        
        const lastApproved = approvedMeasurements.length > 0
          ? approvedMeasurements.sort((a, b) => (b.approvedAt?.getTime() || 0) - (a.approvedAt?.getTime() || 0))[0]
          : null;

        const approvedPercentage = totalContractValue > 0 
          ? (totalApprovedValue / totalContractValue) * 100 
          : 0;

        return {
          id: project.id,
          name: project.name,
          code: project.code,
          clientName: project.client?.name || 'Cliente não definido',
          status: project.status,
          measurementsCount: allMeasurements.length,
          lastApprovedDate: lastApproved?.approvedAt || null,
          approvedPercentage: Number(approvedPercentage.toFixed(2)),
          balancePercentage: Number((100 - approvedPercentage).toFixed(2))
        };
      });
    }),
});
