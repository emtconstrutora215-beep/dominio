import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const stockRouter = router({
  // ---- 1. DEPOTS (ALMOXARIFADOS) ----
  getDepots: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.depot.findMany({
      where: { companyId: ctx.companyId },
      include: {
        project: { select: { name: true } },
        _count: { select: { stockItems: true } }
      },
      orderBy: { name: 'asc' }
    });
  }),
  
  createDepot: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      location: z.string().optional(),
      projectId: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Basic validation: if projectId belongs to company
      if (input.projectId) {
        const proj = await ctx.prisma.project.findUnique({ where: { id: input.projectId }});
        if (!proj || proj.companyId !== ctx.companyId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Projeto inválido.' });
        }
      }

      return ctx.prisma.depot.create({
        data: {
          name: input.name,
          location: input.location,
          projectId: input.projectId,
          companyId: ctx.companyId!
        }
      });
    }),

  // ---- 2. STOCK BALANCES (SALDOS) ----
  getBalancesByDepot: protectedProcedure
    .input(z.object({ depotId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check permission
      const depot = await ctx.prisma.depot.findUnique({ where: { id: input.depotId }});
      if (!depot || depot.companyId !== ctx.companyId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      return ctx.prisma.stockItem.findMany({
        where: { depotId: input.depotId },
        orderBy: { material: 'asc' }
      });
    }),

  // ---- 3. STOCK TRANSFERS ----
  transferStock: protectedProcedure
    .input(z.object({
      material: z.string(),
      quantity: z.number().positive(),
      fromDepotId: z.string(),
      toDepotId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(async (tx) => {
        // 1. Withdraw from source
        const sourceItem = await tx.stockItem.findFirst({
          where: { depotId: input.fromDepotId, material: input.material }
        });

        if (!sourceItem || sourceItem.quantity < input.quantity) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Saldo insuficiente no almoxarifado de origem.' });
        }

        const newSourceQty = sourceItem.quantity - input.quantity;
        await tx.stockItem.update({
          where: { id: sourceItem.id },
          data: { quantity: newSourceQty }
        });

        await tx.stockMovement.create({
          data: {
            type: 'TRANSFER_OUT',
            quantity: input.quantity,
            unitCost: sourceItem.averageUnitCost,
            notes: `Transferência para almoxarifado destino`,
            stockItemId: sourceItem.id,
            depotId: input.fromDepotId,
            userId: ctx.user.id
          }
        });

        // 2. Deposit into destination (CMP Logic)
        let targetItem = await tx.stockItem.findFirst({
          where: { depotId: input.toDepotId, material: input.material }
        });

        if (!targetItem) {
          targetItem = await tx.stockItem.create({
            data: {
              material: input.material,
              unit: sourceItem.unit,
              quantity: 0,
              averageUnitCost: 0,
              depotId: input.toDepotId
            }
          });
        }

        const currentQty = targetItem.quantity;
        const currentAvg = targetItem.averageUnitCost;
        
        // CMP: new average = (current + transfer_in) value / new total qty
        const totalValueNow = currentQty * currentAvg;
        const incomingValue = input.quantity * sourceItem.averageUnitCost; // We preserve the cost from source
        const newTotalQty = currentQty + input.quantity;
        const newAvgCost = (totalValueNow + incomingValue) / newTotalQty;

        await tx.stockItem.update({
          where: { id: targetItem.id },
          data: {
            quantity: newTotalQty,
            averageUnitCost: newAvgCost
          }
        });

        await tx.stockMovement.create({
          data: {
            type: 'TRANSFER_IN',
            quantity: input.quantity,
            unitCost: sourceItem.averageUnitCost,
            notes: `Transferência do almoxarifado origem`,
            stockItemId: targetItem.id,
            depotId: input.toDepotId,
            userId: ctx.user.id
          }
        });

        // 3. Register Transfer event
        return tx.transfer.create({
          data: {
            material: input.material,
            quantity: input.quantity,
            fromDepotId: input.fromDepotId,
            toDepotId: input.toDepotId,
            userId: ctx.user.id
          }
        });
      });
    }),

  // ---- 4. STOCK EXITS (SAÍDAS / CONSUMO NA OBRA) ----
  registerExit: protectedProcedure
    .input(z.object({
      depotId: z.string(),
      material: z.string(),
      quantity: z.number().positive(),
      projectStageId: z.string(),
      notes: z.string().optional() // Ex: Worker name
    }))
    .mutation(async ({ ctx, input }) => {
       return ctx.prisma.$transaction(async (tx) => {
         // Validate Stage
         const stage = await tx.projectStage.findUnique({
           where: { id: input.projectStageId },
           include: { project: true }
         });

         if (!stage) throw new TRPCError({ code: 'NOT_FOUND', message: 'Etapa não encontrada.'});

         // Check balance
         const stock = await tx.stockItem.findFirst({
           where: { depotId: input.depotId, material: input.material }
         });

         if (!stock || stock.quantity < input.quantity) {
           throw new TRPCError({ code: 'BAD_REQUEST', message: 'Estoque insuficiente.'});
         }

         // Update Balance
         await tx.stockItem.update({
           where: { id: stock.id },
           data: { quantity: stock.quantity - input.quantity }
         });

         // Record Movement
         const movement = await tx.stockMovement.create({
           data: {
             type: 'EXIT',
             quantity: input.quantity,
             unitCost: stock.averageUnitCost,
             notes: input.notes,
             stockItemId: stock.id,
             depotId: input.depotId,
             projectStageId: input.projectStageId,
             userId: ctx.user.id
           }
         });

         // P0/P1 REQ: Update Project Stage Cost
         // cost = exit_quantity * avg unit cost
         const exitCost = input.quantity * stock.averageUnitCost;

         await tx.projectStage.update({
           where: { id: input.projectStageId },
           data: {
             actualCost: { increment: exitCost }
           }
         });

         return movement;
       });
    })
});
