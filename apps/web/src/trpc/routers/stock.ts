import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const stockRouter = router({
  // ---- 1. DEPOTS (ALMOXARIFADOS) ----
  getDepots: protectedProcedure.query(async ({ ctx }) => {
    const depots = await ctx.prisma.depot.findMany({
      where: { companyId: ctx.companyId },
      include: {
        project: { 
          select: { 
            name: true,
            users: { select: { id: true } }
          } 
        },
        _count: { select: { stockItems: true, stockAssets: true } },
        stockItems: {
          select: {
            quantity: true,
            averageUnitCost: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Get company users count for central depots
    const companyUsersCount = await ctx.prisma.user.count({
      where: { companyId: ctx.companyId }
    });

    return depots.map(depot => ({
      ...depot,
      userCount: depot.projectId ? (depot.project?.users?.length || 0) : companyUsersCount,
      totalInsumos: depot.stockItems.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0),
      totalValue: depot.stockItems.reduce((acc: number, item: any) => acc + (item.quantity * item.averageUnitCost), 0)
    }));
  }),
  
  updateDepot: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1),
      location: z.string().optional(),
      projectId: z.string().nullable().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const depot = await ctx.prisma.depot.findUnique({ where: { id: input.id } });
      if (!depot || depot.companyId !== ctx.companyId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Depósito não encontrado.' });
      }

      if (input.projectId) {
        const proj = await ctx.prisma.project.findUnique({ where: { id: input.projectId }});
        if (!proj || proj.companyId !== ctx.companyId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Projeto inválido.' });
        }
      }

      return ctx.prisma.depot.update({
        where: { id: input.id },
        data: {
          name: input.name,
          location: input.location,
          projectId: input.projectId
        }
      });
    }),
  
  createDepot: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      location: z.string().optional(),
      projectId: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
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

  // ---- 2. UNIFIED INVENTORY (SALDOS & VALORES) ----
  getInventory: protectedProcedure
    .input(z.object({
      depotId: z.string().optional(),
      type: z.enum(['MATERIAL', 'EQUIPMENT']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input.depotId) where.depotId = input.depotId;
      else {
          where.depot = { companyId: ctx.companyId };
      }
      
      if (input.type) {
        where.catalogItem = { type: input.type };
      }

      const items = await ctx.prisma.stockItem.findMany({
        where,
        include: {
          catalogItem: true,
          depot: { select: { name: true } }
        },
        orderBy: { material: 'asc' }
      });

      return items.map(item => ({
        ...item,
        totalValue: item.quantity * item.averageUnitCost
      }));
    }),

  // ---- 3. ASSETS (EQUIPAMENTOS INDIVIDUAIS) ----
  getAssets: protectedProcedure
    .input(z.object({
      depotId: z.string().optional(),
      catalogItemId: z.string().optional(),
      status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { companyId: ctx.companyId };
      if (input.depotId) where.currentDepotId = input.depotId;
      if (input.catalogItemId) where.catalogItemId = input.catalogItemId;
      if (input.status) where.status = input.status;

      return ctx.prisma.stockAsset.findMany({
        where,
        include: {
          catalogItem: true,
          currentDepot: { select: { name: true } }
        },
        orderBy: { tag: 'asc' }
      });
    }),

  // ---- 4. MOVEMENTS (HISTÓRICO) ----
  getMovements: protectedProcedure
    .input(z.object({
      depotId: z.string().optional(),
      assetId: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = {
        depot: { companyId: ctx.companyId }
      };
      if (input.depotId) where.depotId = input.depotId;
      if (input.assetId) where.assetId = input.assetId;

      return ctx.prisma.stockMovement.findMany({
        where,
        include: {
          stockItem: { include: { catalogItem: true } },
          asset: true,
          depot: true,
          user: { select: { name: true } },
          projectStage: { select: { name: true, project: { select: { name: true } } } }
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit
      });
    }),

  // ---- 5. ACTIONS: ENTRY / EXIT / TRANSFER ----
  
  registerEntry: protectedProcedure
    .input(z.object({
      depotId: z.string(),
      catalogItemId: z.string(),
      quantity: z.number().positive(),
      unitCost: z.number().nonnegative(),
      notes: z.string().optional(),
      assets: z.array(z.object({
        tag: z.string(),
        serialNumber: z.string().optional()
      })).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(async (tx: any) => {
        const catalogItem = await tx.catalogItem.findUnique({ where: { id: input.catalogItemId } });
        if (!catalogItem) throw new TRPCError({ code: 'NOT_FOUND', message: 'Item do catálogo não encontrado' });

        let stockItem = await tx.stockItem.findFirst({
          where: { depotId: input.depotId, catalogItemId: input.catalogItemId }
        });

        if (!stockItem) {
          stockItem = await tx.stockItem.create({
            data: {
              material: catalogItem.description,
              unit: catalogItem.unit,
              quantity: 0,
              averageUnitCost: 0,
              depotId: input.depotId,
              catalogItemId: input.catalogItemId
            }
          });
        }

        const currentQty = stockItem.quantity;
        const currentAvg = stockItem.averageUnitCost;
        const totalValueNow = currentQty * currentAvg;
        const incomingValue = input.quantity * input.unitCost;
        const newTotalQty = currentQty + input.quantity;
        const newAvgCost = newTotalQty > 0 ? (totalValueNow + incomingValue) / newTotalQty : 0;

        await tx.stockItem.update({
          where: { id: stockItem.id },
          data: {
            quantity: newTotalQty,
            averageUnitCost: newAvgCost
          }
        });

        if (catalogItem.type === 'EQUIPMENT' && input.assets) {
          for (const assetData of input.assets) {
            await tx.stockAsset.create({
              data: {
                tag: assetData.tag,
                serialNumber: assetData.serialNumber,
                status: 'AVAILABLE',
                catalogItemId: input.catalogItemId,
                currentDepotId: input.depotId,
                companyId: ctx.companyId!
              }
            });
          }
        }

        return tx.stockMovement.create({
          data: {
            type: 'ENTRY',
            quantity: input.quantity,
            unitCost: input.unitCost,
            notes: input.notes || 'Entrada manual de estoque',
            stockItemId: stockItem.id,
            depotId: input.depotId,
            userId: ctx.user.id
          }
        });
      });
    }),

  registerExit: protectedProcedure
    .input(z.object({
      depotId: z.string(),
      catalogItemId: z.string(),
      quantity: z.number().positive(),
      projectStageId: z.string().optional(),
      assetIds: z.array(z.string()).optional(),
      notes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(async (tx: any) => {
        const stockItem = await tx.stockItem.findFirst({
          where: { depotId: input.depotId, catalogItemId: input.catalogItemId }
        });

        if (!stockItem || stockItem.quantity < input.quantity) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Estoque insuficiente.' });
        }

        // 1. Update Assets if provided
        if (input.assetIds) {
          for (const assetId of input.assetIds) {
            await tx.stockAsset.update({
              where: { id: assetId },
              data: { status: input.projectStageId ? 'IN_USE' : 'RETIRED' }
            });
          }
        }

        // 2. Update Bulk Stock
        await tx.stockItem.update({
          where: { id: stockItem.id },
          data: { quantity: stockItem.quantity - input.quantity }
        });

        // 3. Record Movement
        const movement = await tx.stockMovement.create({
          data: {
            type: 'EXIT',
            quantity: input.quantity,
            unitCost: stockItem.averageUnitCost,
            notes: input.notes,
            stockItemId: stockItem.id,
            depotId: input.depotId,
            projectStageId: input.projectStageId,
            userId: ctx.user.id,
            assetId: input.assetIds?.[0] // If exit of multiple, we record first or need one movement per asset?
            // Usually one movement per transaction is fine, but for assets we might want a link.
          }
        });

        // 4. Update Project Stage Cost if applicable
        if (input.projectStageId) {
          const exitCost = input.quantity * stockItem.averageUnitCost;
          await tx.projectStage.update({
            where: { id: input.projectStageId },
            data: { actualCost: { increment: exitCost } }
          });
        }

        return movement;
      });
    }),

  transferInventory: protectedProcedure
    .input(z.object({
      fromDepotId: z.string(),
      toDepotId: z.string(),
      catalogItemId: z.string(),
      quantity: z.number().positive(),
      assetIds: z.array(z.string()).optional(),
      notes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(async (tx: any) => {
          // 1. Check Source
          const sourceItem = await tx.stockItem.findFirst({
              where: { depotId: input.fromDepotId, catalogItemId: input.catalogItemId }
          });
          if (!sourceItem || sourceItem.quantity < input.quantity) {
              throw new TRPCError({ code: 'BAD_REQUEST', message: 'Saldo insuficiente na origem.' });
          }

          // 2. Handle Assets
          if (input.assetIds) {
              for (const assetId of input.assetIds) {
                  await tx.stockAsset.update({
                      where: { id: assetId },
                      data: { currentDepotId: input.toDepotId }
                  });
              }
          }

          // 3. Update Source Balance
          await tx.stockItem.update({
              where: { id: sourceItem.id },
              data: { quantity: sourceItem.quantity - input.quantity }
          });

          // 4. Update/Create Destination Balance
          let targetItem = await tx.stockItem.findFirst({
              where: { depotId: input.toDepotId, catalogItemId: input.catalogItemId }
          });
          if (!targetItem) {
              targetItem = await tx.stockItem.create({
                  data: {
                      material: sourceItem.material,
                      unit: sourceItem.unit,
                      quantity: 0,
                      averageUnitCost: 0,
                      depotId: input.toDepotId,
                      catalogItemId: input.catalogItemId
                  }
              });
          }

          const currentQty = targetItem.quantity;
          const currentAvg = targetItem.averageUnitCost;
          const totalValueNow = currentQty * currentAvg;
          const incomingValue = input.quantity * sourceItem.averageUnitCost;
          const newTotalQty = currentQty + input.quantity;
          const newAvgCost = newTotalQty > 0 ? (totalValueNow + incomingValue) / newTotalQty : 0;

          await tx.stockItem.update({
              where: { id: targetItem.id },
              data: { quantity: newTotalQty, averageUnitCost: newAvgCost }
          });

          // 5. Record Movements
          await tx.stockMovement.create({
              data: {
                  type: 'TRANSFER_OUT',
                  quantity: input.quantity,
                  unitCost: sourceItem.averageUnitCost,
                  notes: `Transfer para ${input.toDepotId}: ${input.notes || ''}`,
                  stockItemId: sourceItem.id,
                  depotId: input.fromDepotId,
                  userId: ctx.user.id
              }
          });

          return tx.stockMovement.create({
              data: {
                  type: 'TRANSFER_IN',
                  quantity: input.quantity,
                  unitCost: sourceItem.averageUnitCost,
                  notes: `Recebido de ${input.fromDepotId}: ${input.notes || ''}`,
                  stockItemId: targetItem.id,
                  depotId: input.toDepotId,
                  userId: ctx.user.id
              }
          });
      });
    }),
});
