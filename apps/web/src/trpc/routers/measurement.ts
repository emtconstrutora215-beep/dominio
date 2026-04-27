import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { addDays } from 'date-fns';

export const measurementRouter = router({
  getMeasurementsByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.measurement.findMany({
        where: { projectId: input.projectId },
        include: {
          contract: true,
          measuredBy: true,
          approvedBy: true,
          rejectedBy: true,
          items: {
             include: { budgetItem: { include: { projectStage: true } } }
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
          project: { include: { client: true } },
          contract: true,
          measuredBy: true,
          approvedBy: true,
          rejectedBy: true,
          items: {
             include: { budgetItem: { include: { projectStage: true } } }
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
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
        include: {
          client: true,
          stages: {
            include: {
              budgetItems: {
                include: {
                  measurements: {
                    where: { measurement: { status: 'APPROVED' } },
                    include: { measurement: true }
                  }
                },
                orderBy: { order: 'asc' }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          measurements: {
            select: { number: true },
            orderBy: { number: 'desc' },
            take: 1
          }
        }
      });

      if (!project) throw new TRPCError({ code: 'NOT_FOUND' });

      const nextNumber = (project.measurements[0]?.number || 0) + 1;

      // Construção da árvore incluindo a Etapa como nó pai
      const measurementTree = project.stages.map((stage: any) => {
        const itemMap = new Map();
        
        // Primeiro, prepara os itens do orçamento
        stage.budgetItems.forEach((item: any) => {
          const totalMeasuredQuantity = item.measurements.reduce((acc: number, m: any) => acc + m.quantity, 0);
          const totalMeasuredValue = totalMeasuredQuantity * item.unitPrice;
          
          const remainingQuantity = item.quantity - totalMeasuredQuantity;
          const remainingValue = item.total - totalMeasuredValue;
          const accumulatedPercentage = item.total > 0 ? (totalMeasuredValue / item.total) * 100 : 0;

          itemMap.set(item.id, {
            ...item,
            totalValue: item.total,
            accumulatedQuantity: totalMeasuredQuantity,
            accumulatedValue: totalMeasuredValue,
            accumulatedPercentage,
            remainingQuantity,
            remainingValue,
            children: []
          });
        });

        // Monta a hierarquia interna da etapa
        const stageRootItems: any[] = [];
        itemMap.forEach(item => {
          if (item.parentId && itemMap.has(item.parentId)) {
            itemMap.get(item.parentId).children.push(item);
          } else {
            stageRootItems.push(item);
          }
        });

        // Retorna a etapa como se fosse um item de orçamento para o traverse do front-end
        return {
          id: stage.id,
          description: stage.name,
          type: 'STAGE',
          totalValue: stage.plannedCost || stage.budgetItems.reduce((acc: number, bi: any) => acc + bi.total, 0),
          accumulatedValue: stage.actualCost || stage.budgetItems.reduce((acc: number, bi: any) => {
             const measured = bi.measurements.reduce((sum: number, m: any) => sum + m.quantity, 0);
             return acc + (measured * bi.unitPrice);
          }, 0),
          accumulatedPercentage: stage.percentageComplete,
          children: stageRootItems,
          projectStageId: stage.id
        };
      });

      return {
        project,
        nextNumber,
        items: measurementTree
      };
    }),

  createMeasurement: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      contractId: z.string().optional(),
      title: z.string().optional(),
      notes: z.string().optional(),
      attachments: z.array(z.string()).default([]),
      items: z.array(z.object({
        budgetItemId: z.string().optional(),
        contractItemId: z.string().optional(),
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
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
        include: { 
          stages: { include: { budgetItems: true } },
          measurements: {
            select: { number: true },
            orderBy: { number: 'desc' },
            take: 1
          }
        }
      });

      if (!project) throw new TRPCError({ code: 'NOT_FOUND' });

      const allBudgetItems = project.stages.flatMap(s => s.budgetItems);
      const nextNumber = (project.measurements[0]?.number || 0) + 1;
      let grossValue = 0;
      
      const measurementItems = input.items.map(item => {
         if (item.budgetItemId) {
           const budgetItem = allBudgetItems.find(bi => bi.id === item.budgetItemId);
           if (!budgetItem) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Item not found in budget' });
           grossValue += (item.quantity * budgetItem.unitPrice);
           return { budgetItemId: item.budgetItemId, quantity: item.quantity };
         } else if (item.contractItemId) {
           return { contractItemId: item.contractItemId, quantity: item.quantity };
         }
         throw new TRPCError({ code: 'BAD_REQUEST', message: 'Item must have budgetItemId or contractItemId' });
      });

      // Cálculo de valor bruto para itens de contrato
      const contractItemIds = input.items.filter(i => i.contractItemId).map(i => i.contractItemId as string);
      if (contractItemIds.length > 0) {
        const contractItems = await ctx.prisma.contractItem.findMany({
          where: { id: { in: contractItemIds } }
        });
        
        input.items.forEach(item => {
          if (item.contractItemId) {
            const ci = contractItems.find(c => c.id === item.contractItemId);
            if (ci) grossValue += (item.quantity * ci.unitPrice);
          }
        });
      }

      const totalDiscounts = input.discounts.reduce((acc, d) => acc + d.value, 0);
      const totalRetentions = input.retentions.reduce((acc, r) => acc + r.value, 0);
      
      const netValue = grossValue - totalDiscounts - totalRetentions;

      return ctx.prisma.measurement.create({
        data: {
          projectId: input.projectId,
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
           project: { include: { client: true } },
           items: { include: { budgetItem: { include: { projectStage: true } } } }
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
              type: 'INCOME',
              category: 'Medição de Obra (Receita)', 
              description: `Faturamento Medição: ${measurement.project.name} - Medição Nº ${measurement.number}`,
              amount: measurement.netValue,
              dueDate: addDays(new Date(), 15),
              status: 'PENDING',
              companyId: measurement.project.companyId,
              contactId: measurement.project.clientId,
              measurementId: measurement.id
            }
          });

         for (const item of measurement.items) {
            const stage = (item as any).budgetItem.projectStage;
            const itemGrossValue = item.quantity * (item as any).budgetItem.unitPrice;
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
          // Mostrar projetos que tenham orçamento (budget > 0) ou medições
          OR: [
            { budget: { gt: 0 } },
            { measurements: { some: {} } }
          ],
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
          measurements: true
        },
        orderBy: { name: 'asc' }
      });

      return projects.map(project => {
        const allMeasurements = (project as any).measurements;
        const approvedMeasurements = allMeasurements.filter((m: any) => m.status === 'APPROVED');
        
        const totalBudget = (project as any).budget;
        const totalApprovedValue = approvedMeasurements.reduce((acc: number, m: any) => acc + m.grossValue, 0);
        
        const lastApproved = approvedMeasurements.length > 0
          ? approvedMeasurements.sort((a: any, b: any) => (b.approvedAt?.getTime() || 0) - (a.approvedAt?.getTime() || 0))[0]
          : null;

        const approvedPercentage = totalBudget > 0 
          ? (totalApprovedValue / totalBudget) * 100 
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
