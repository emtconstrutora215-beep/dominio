import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const purchasingRouter = router({
  // ---- 1. PURCHASE REQUESTS ----
  getRequests: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.purchaseRequest.findMany({
      where: { project: { companyId: ctx.companyId } },
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { name: true } },
        approver: { select: { name: true } },
        project: { select: { name: true } },
        items: true,
      }
    });
  }),

  createRequest: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      notes: z.string().optional(),
      items: z.array(z.object({
        description: z.string(),
        unit: z.string(),
        quantity: z.number().positive(),
        budgetItemId: z.string().optional(),
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.purchaseRequest.create({
        data: {
          projectId: input.projectId,
          requesterId: ctx.user.id,
          status: 'PENDING_APPROVAL',
          notes: input.notes,
          items: {
            create: input.items
          }
        }
      });
    }),

  approveRequest: protectedProcedure
    .input(z.object({
      requestId: z.string(),
      status: z.enum(['APPROVED', 'REJECTED']),
      reason: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.role === 'FIELD') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Usuários de campo não podem aprovar ou rejeitar solicitações.' });
      }

      const request = await ctx.prisma.purchaseRequest.findUnique({
        where: { id: input.requestId }
      });
      if (!request) throw new TRPCError({ code: 'NOT_FOUND' });

      return ctx.prisma.purchaseRequest.update({
        where: { id: input.requestId },
        data: {
          status: input.status,
          approverId: ctx.user.id,
          rejectReason: input.reason
        }
      });
    }),

  // ---- 2. QUOTATIONS (COTAÇÕES) ----
  getQuoteByRequest: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.quote.findFirst({
        where: { requestId: input.requestId },
        include: { suppliers: true }
      });
    }),

  createSupplierQuote: protectedProcedure
    .input(z.object({
      quoteId: z.string().optional(),
      requestId: z.string(),
      supplierName: z.string(),
      unitPrice: z.number(),
      totalPrice: z.number(),
      deliveryDays: z.number(),
      paymentTerms: z.string(),
      freight: z.number().default(0),
      notes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Create Quote container if it doesn't exist
      let activeQuoteId = input.quoteId;

      if (!activeQuoteId) {
        const newQuote = await ctx.prisma.quote.create({
          data: { requestId: input.requestId }
        });
        activeQuoteId = newQuote.id;
      }

      return ctx.prisma.quoteSupplier.create({
        data: {
          quoteId: activeQuoteId,
          supplierName: input.supplierName,
          unitPrice: input.unitPrice,
          totalPrice: input.totalPrice,
          deliveryDays: input.deliveryDays,
          paymentTerms: input.paymentTerms,
          freight: input.freight,
          notes: input.notes
        }
      });
    }),

  markWinningSupplier: protectedProcedure
    .input(z.object({
      quoteId: z.string(),
      supplierId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
       // Reset all to false
       await ctx.prisma.quoteSupplier.updateMany({
         where: { quoteId: input.quoteId },
         data: { isWinner: false }
       });
       // Set the requested one to true
       return ctx.prisma.quoteSupplier.update({
         where: { id: input.supplierId },
         data: { isWinner: true }
       });
    }),

  // ---- 3. PURCHASE ORDERS (ORDENS DE COMPRA) ----
  getOrders: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.purchaseOrder.findMany({
      where: { quote: { request: { project: { companyId: ctx.companyId } } } },
      orderBy: { createdAt: 'desc' },
      include: {
        quote: {
          include: { 
            suppliers: { where: { isWinner: true } },
            request: { select: { project: { select: { name: true } }, items: true } }
          }
        },
        financialEntries: true,
        goodsReceipts: {
          include: { items: true }
        }
      }
    });
  }),

  generateOrder: protectedProcedure
    .input(z.object({
      quoteId: z.string(),
      installments: z.number().min(1).default(1),
      firstDueDate: z.string(), // ISO date
      category: z.string().default('Materiais'),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch winning supplier & evaluate threshold
      const quote = await ctx.prisma.quote.findUnique({
        where: { id: input.quoteId },
        include: { 
          suppliers: { where: { isWinner: true } }, 
          request: true 
        }
      });

      if (!quote || quote.suppliers.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nenhum fornecedor vencedor selecionado nesta cotação.' });
      }

      const winner = quote.suppliers[0];
      const totalAmount = winner.totalPrice + winner.freight;
      
      const company = await ctx.prisma.company.findUnique({ where: { id: ctx.companyId! } });
      const threshold = company?.approvalThreshold || 5000;

      if (ctx.role === 'ENGINEER' && totalAmount > threshold) {
        throw new TRPCError({ code: 'FORBIDDEN', message: `Valor da ordem (R$ ${totalAmount}) excede o seu limite (R$ ${threshold}). Necessita que um Administrador gere a ordem.` });
      }

      if (ctx.role === 'FIELD') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas Engenheiros ou Administradores podem gerar Ordens de Compra.' });
      }

      // 2. Create Order
      const order = await ctx.prisma.purchaseOrder.create({
        data: {
          quoteId: quote.id,
          status: 'AWAITING_RECEIPT',
        }
      });

      // 3. Generate Installments (Accounts Payable logic)
      const installmentAmount = totalAmount / input.installments;
      const firstDate = new Date(input.firstDueDate);

      const entries = Array.from({ length: input.installments }).map((_: any, idx: number) => {
        const dueDate = new Date(firstDate);
        dueDate.setMonth(dueDate.getMonth() + idx);
        
        return {
          type: 'EXPENSE' as const,
          category: input.category,
          description: `Parcela ${idx + 1}/${input.installments} - ${winner.supplierName} (Ped #${order.id.slice(-6).toUpperCase()})`,
          amount: parseFloat(installmentAmount.toFixed(2)),
          dueDate,
          companyId: ctx.companyId!,
          purchaseOrderId: order.id
        };
      });

      await ctx.prisma.financialEntry.createMany({
        data: entries
      });

      return order;
    }),

  // ---- 4. GOODS RECEIPTS (RECEBIMENTO FÍSICO) ----
  registerReceipt: protectedProcedure
    .input(z.object({
      orderId: z.string(),
      depotId: z.string(),
      items: z.array(z.object({
        material: z.string(),
        orderedQuantity: z.number(),
        receivedQuantity: z.number().min(0)
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(async (tx: any) => {
        // 1. Fetch Order and Supplier Price
        const order = await tx.purchaseOrder.findUnique({
          where: { id: input.orderId },
          include: { quote: { include: { suppliers: { where: { isWinner: true } } } } }
        });

        if (!order) throw new TRPCError({ code: 'NOT_FOUND' });
        if (['RECEIVED'].includes(order.status)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pedido já foi totalmente recebido.' });
        }

        const supplier = order.quote.suppliers[0];
        const unitPriceForCMP = supplier ? (supplier.totalPrice / input.items.reduce((acc: number, i: any) => acc + i.orderedQuantity, 0)) : 0; // Simplified unit price derivation for the batch

        // 2. Check quantities
        const validItems = input.items.filter((i: any) => i.receivedQuantity > 0);
        if (validItems.length === 0) {
           throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nenhuma quantidade recebida foi informada.'});
        }

        const isFullyReceived = input.items.every((i: any) => i.receivedQuantity >= i.orderedQuantity);

        // 3. Create GoodsReceipt
        const receipt = await tx.goodsReceipt.create({
          data: {
            purchaseOrderId: input.orderId,
            depotId: input.depotId,
            receivedById: ctx.user.id,
            items: {
              create: validItems.map((item: any) => ({
                materialName: item.material,
                orderedQuantity: item.orderedQuantity,
                receivedQuantity: item.receivedQuantity
              }))
            }
          }
        });

        // 4. Update Stock Items (CMP update)
        for (const item of validItems) {
          let stock = await tx.stockItem.findFirst({
            where: { depotId: input.depotId, material: item.material }
          });

          if (!stock) {
            stock = await tx.stockItem.create({
              data: {
                material: item.material,
                unit: 'UN', // defaulting for now
                quantity: 0,
                averageUnitCost: 0,
                depotId: input.depotId
              }
            });
          }

          // Recalculate CMP
          const currentTotalValue = stock.quantity * stock.averageUnitCost;
          const incomingTotalValue = item.receivedQuantity * unitPriceForCMP;
          const newTotalQuantity = stock.quantity + item.receivedQuantity;
          const newAvgCost = (currentTotalValue + incomingTotalValue) / newTotalQuantity;

          await tx.stockItem.update({
            where: { id: stock.id },
            data: {
              quantity: newTotalQuantity,
              averageUnitCost: newAvgCost
            }
          });

          // Log Movement
          await tx.stockMovement.create({
            data: {
              type: 'ENTRY',
              quantity: item.receivedQuantity,
              unitCost: unitPriceForCMP,
              notes: `Recebimento da OC #${order.id.slice(-6).toUpperCase()}`,
              stockItemId: stock.id,
              depotId: input.depotId,
              userId: ctx.user.id
            }
          });
        }

        // 5. Update Order Status
        await tx.purchaseOrder.update({
          where: { id: input.orderId },
          data: {
            status: isFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED'
          }
        });

        return receipt;
      });
    })
});
