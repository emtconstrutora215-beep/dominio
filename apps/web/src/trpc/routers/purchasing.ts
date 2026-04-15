import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const purchasingRouter = router({
  // ---- 1. PURCHASE REQUESTS ----
  getRequests: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.purchaseRequest.findMany({
      where: { companyId: ctx.companyId! },
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
          companyId: ctx.companyId!,
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

  getRequestWithQuote: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .query(async ({ ctx, input }) => {
      const request = await ctx.prisma.purchaseRequest.findUnique({
        where: { id: input.requestId },
        include: {
          items: true,
          requester: { select: { name: true } },
          project: { 
            include: { 
              stages: true 
            } 
          },
          stage: { select: { name: true } },
          quotes: {
            include: {
              suppliers: true
            }
          }
        }
      });
      return request;
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

  createStandaloneQuote: protectedProcedure
    .input(z.object({
      description: z.string().optional(),
      projectId: z.string().optional().nullable(),
      items: z.array(z.object({
        description: z.string(),
        unit: z.string(),
        quantity: z.number().positive(),
        catalogItemId: z.string().optional()
      })),
      suppliers: z.array(z.string()) // supplier IDs
    }))
    .mutation(async ({ ctx, input }) => {
      // Usar a mesma companyId do requisitante/usuário
      return ctx.prisma.$transaction(async (tx: any) => {
        // 1. Create PurchaseRequest (Status: APPROVED so it goes straight to quotes)
        const request = await tx.purchaseRequest.create({
          data: {
            status: 'APPROVED',
            notes: input.description,
            projectId: input.projectId,
            requesterId: ctx.user.id,
            companyId: ctx.companyId!,
            approverId: ctx.user.id,
            items: {
              create: input.items.map((i: any) => ({
                description: i.description,
                unit: i.unit,
                quantity: i.quantity
              }))
            }
          }
        });

        // 2. Create the standalone Quote
        const quote = await tx.quote.create({
          data: {
            requestId: request.id
          }
        });

        // 3. Look up suppliers from db to get names, and attach them
        if (input.suppliers.length > 0) {
          const supplierContacts = await tx.contact.findMany({
            where: { id: { in: input.suppliers } }
          });
          
          await tx.quoteSupplier.createMany({
            data: supplierContacts.map((s: any) => ({
               quoteId: quote.id,
               supplierName: s.name,
               unitPrice: 0,
               totalPrice: 0,
               deliveryDays: 0,
               paymentTerms: 'À Vista'
            }))
          });
        }

        return quote;
      });
    }),

  updateQuotation: protectedProcedure
    .input(z.object({
      requestId: z.string(),
      description: z.string().optional(),
      status: z.string().optional(),
      projectId: z.string().optional().nullable(),
      stageId: z.string().optional().nullable(),
      items: z.array(z.object({
        id: z.string().optional(),
        description: z.string(),
        unit: z.string(),
        quantity: z.number().positive(),
      })),
      suppliers: z.array(z.object({
        id: z.string().optional(),
        supplierName: z.string(),
        totalPrice: z.number(),
        deliveryDays: z.number(),
        paymentTerms: z.string(),
        freight: z.number(),
        isWinner: z.boolean().optional(),
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(async (tx: any) => {
        // 1. Update PurchaseRequest
        const request = await tx.purchaseRequest.update({
          where: { id: input.requestId },
          data: {
            notes: input.description,
            projectId: input.projectId,
            stageId: input.stageId,
            items: {
              deleteMany: {}, // Delete all and recreate to sync with form
              create: input.items.map(i => ({
                description: i.description,
                unit: i.unit,
                quantity: i.quantity,
                projectId: input.projectId,
                stageId: input.stageId,
              }))
            }
          },
          include: { quotes: true }
        });

        // 2. Ensure Quote exists
        let quote = request.quotes[0];
        if (!quote) {
          quote = await tx.quote.create({
            data: { requestId: request.id }
          });
        }

        // 3. Update Suppliers
        // We delete all and recreate for simplicity in syncing the form state
        await tx.quoteSupplier.deleteMany({
          where: { quoteId: quote.id }
        });

        if (input.suppliers.length > 0) {
          await tx.quoteSupplier.createMany({
            data: input.suppliers.map(s => ({
              quoteId: quote.id,
              supplierName: s.supplierName,
              unitPrice: s.totalPrice / (input.items.length || 1), // approximation
              totalPrice: s.totalPrice,
              deliveryDays: s.deliveryDays,
              paymentTerms: s.paymentTerms,
              freight: s.freight,
              isWinner: s.isWinner || false
            }))
          });
        }

        return request;
      });
    }),

  deleteQuotation: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.prisma.purchaseRequest.findUnique({
        where: { id: input.requestId },
        include: { quotes: { include: { order: true } } }
      });

      if (!request) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Cotação não encontrada.' });
      }

      // Check for related orders
      const hasOrder = request.quotes.some(q => q.order);
      if (hasOrder) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Não é possível excluir uma cotação que já possui uma Ordem de Compra gerada. Cancele a ordem primeiro.' 
        });
      }

      return ctx.prisma.purchaseRequest.delete({
        where: { id: input.requestId }
      });
    }),

  deleteOrder: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.purchaseOrder.findUnique({
        where: { id: input.orderId },
        include: { 
          goodsReceipts: true,
          financialEntries: true
        }
      });

      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ordem de Compra não encontrada.' });
      }

      // 1. Block if there are goods receipts
      if (order.goodsReceipts.length > 0) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Não é possível excluir uma ordem que já possui recebimentos físicos de materiais.' 
        });
      }

      // 2. Block if any financial entry is PAID
      const hasPaidEntries = order.financialEntries.some(e => e.status === 'PAID');
      if (hasPaidEntries) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Não é possível excluir uma ordem que já possui parcelas financeiras pagas.' 
        });
      }

      return ctx.prisma.$transaction(async (tx: any) => {
        // 3. Delete financial entries
        await tx.financialEntry.deleteMany({
          where: { purchaseOrderId: order.id }
        });

        // 4. Delete the order
        return tx.purchaseOrder.delete({
          where: { id: order.id }
        });
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
      where: { quote: { request: { companyId: ctx.companyId! } } },
      orderBy: { createdAt: 'desc' },
      include: {
        quote: {
          include: { 
            suppliers: { where: { isWinner: true } },
            request: { 
              include: { 
                project: { select: { name: true } },
                approver: { select: { name: true } },
                items: true // Incluindo itens da requisição para ver preços individuais
              } 
            }
          }
        },
        approver: { select: { name: true } },
        financialEntries: true,
        goodsReceipts: {
          include: { items: true }
        }
      }
    });
  }),

  getOrderById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.prisma.purchaseOrder.findUnique({
        where: { id: input.id },
        include: {
          quote: {
            include: { 
              suppliers: { where: { isWinner: true } },
              request: { 
                include: { 
                  project: { select: { name: true } },
                  approver: { select: { name: true } },
                  items: {
                    include: {
                      project: { select: { name: true } },
                      stage: { select: { name: true } }
                    }
                  }
                } 
              }
            }
          },
          approver: { select: { name: true } },
          financialEntries: true,
          goodsReceipts: {
            include: { items: true }
          }
        }
      });

      if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ordem de compra não encontrada.' });
      
      // Verificação de segurança: garantir que a ordem pertence à empresa do usuário
      if (order.quote.request.companyId !== ctx.companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para acessar esta ordem.' });
      }

      return order;
    }),

  getNextOrderNumber: protectedProcedure.query(async ({ ctx }) => {
    const orders = await ctx.prisma.purchaseOrder.findMany({
      where: { 
        quote: { 
          request: { 
            companyId: ctx.companyId! 
          } 
        } 
      },
      select: { number: true }
    });
    const numbers = orders
      .map((o: any) => parseInt(o.number || "0"))
      .filter((n: number) => !isNaN(n));
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    return (maxNumber + 1).toString();
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
    }),

  createDirectOrder: protectedProcedure
    .input(z.object({
      supplierId: z.string(),
      supplierName: z.string(),
      projectId: z.string().optional().nullable(),
      stageId: z.string().optional().nullable(),
      items: z.array(z.object({
        description: z.string(),
        unit: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative(),
        projectId: z.string().optional().nullable(),
        stageId: z.string().optional().nullable(),
      })),
      freight: z.number().default(0),
      otherExpenses: z.number().default(0),
      taxes: z.number().default(0),
      discounts: z.number().default(0),
      deliveryDays: z.number().default(0),
      paymentTerms: z.string().default('À Vista'),
      installments: z.number().min(1).default(1),
      firstDueDate: z.string(), // ISO date
      category: z.string().default('Materiais'),
      orderNumber: z.string().optional(),
      status: z.enum(['OPEN', 'NEGOTIATING', 'PENDING_APPROVAL', 'REJECTED', 'ISSUED', 'AWAITING_RECEIPT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'PARTIALLY_PAID', 'PAID']).default('OPEN'),
      approverId: z.string().optional(),
      billingType: z.enum(['COMPANY', 'CLIENT', 'DIRECT', 'MANUAL']).default('COMPANY'),
      billingManualName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const itemsAmount = input.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const totalAmount = itemsAmount + input.freight + input.otherExpenses + input.taxes - input.discounts;

      return ctx.prisma.$transaction(async (tx: any) => {
        // 0. Auto-calculate Order Number if not provided
        let nextNumber = input.orderNumber;
        if (!nextNumber) {
          const orders = await tx.purchaseOrder.findMany({
            where: { quote: { request: { companyId: ctx.companyId! } } },
            select: { number: true }
          });
          const numbers = orders
            .map((o: any) => parseInt(o.number || "0"))
            .filter((n: number) => !isNaN(n));
          const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
          nextNumber = (maxNumber + 1).toString();
        }

        // 1. Create PurchaseRequest (Approved)
        const request = await tx.purchaseRequest.create({
          data: {
            status: 'APPROVED',
            projectId: input.projectId,
            stageId: input.stageId,
            requesterId: ctx.user.id,
            companyId: ctx.companyId!,
            approverId: ctx.user.id,
            items: {
              create: input.items.map(i => ({
                description: i.description,
                unit: i.unit,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                projectId: i.projectId,
                stageId: i.stageId
              }))
            }
          }
        });

        // 2. Create Quote
        const quote = await tx.quote.create({
          data: { requestId: request.id }
        });

        // 3. Create QuoteSupplier (Winner)
        const winner = await tx.quoteSupplier.create({
          data: {
            quoteId: quote.id,
            supplierName: input.supplierName,
            unitPrice: itemsAmount / input.items.length, // approximation
            totalPrice: itemsAmount,
            deliveryDays: input.deliveryDays,
            paymentTerms: input.paymentTerms,
            freight: input.freight,
            isWinner: true
          }
        });

        // 4. Create PurchaseOrder
        const order = await tx.purchaseOrder.create({
          data: {
            quoteId: quote.id,
            status: input.status,
            number: nextNumber,
            approverId: input.approverId,
            billingType: input.billingType,
            billingManualName: input.billingManualName,
          }
        });

        // 5. Generate Installments (FinancialEntries)
        const installmentAmount = totalAmount / input.installments;
        const firstDate = new Date(input.firstDueDate);

        const entries = Array.from({ length: input.installments }).map((_: any, idx: number) => {
          const dueDate = new Date(firstDate);
          dueDate.setMonth(dueDate.getMonth() + idx);
          
          return {
            type: 'EXPENSE' as const,
            category: input.category,
            description: `Parcela ${idx + 1}/${input.installments} - ${input.supplierName} (Pedido Direto #${order.id.slice(-6).toUpperCase()})`,
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
      });
    }),

  toggleOrderApproval: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.purchaseOrder.findUnique({
        where: { id: input.orderId }
      });

      if (!order) throw new TRPCError({ code: 'NOT_FOUND' });

      return ctx.prisma.purchaseOrder.update({
        where: { id: input.orderId },
        data: {
          status: order.status === 'AWAITING_RECEIPT' ? 'PENDING_APPROVAL' : 'AWAITING_RECEIPT'
        }
      });
    }),

  updateDirectOrder: protectedProcedure
    .input(z.object({
      orderId: z.string(),
      projectId: z.string().optional().nullable(),
      stageId: z.string().optional().nullable(),
      supplierName: z.string(),
        items: z.array(z.object({
        id: z.string().optional(),
        description: z.string(),
        unit: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative(),
        projectId: z.string().optional().nullable(),
        stageId: z.string().optional().nullable(),
      })),
      freight: z.number().default(0),
      otherExpenses: z.number().default(0),
      taxes: z.number().default(0),
      discounts: z.number().default(0),
      deliveryDays: z.number().default(0),
      paymentTerms: z.string().default('À Vista'),
      installments: z.number().min(1).default(1),
      firstDueDate: z.string(),
      category: z.string().default('Materiais'),
      orderNumber: z.string().optional(),
      status: z.enum(['OPEN', 'NEGOTIATING', 'PENDING_APPROVAL', 'REJECTED', 'ISSUED', 'AWAITING_RECEIPT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'PARTIALLY_PAID', 'PAID']).optional(),
      approverId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch existing order and check if editable
      const existingOrder = await ctx.prisma.purchaseOrder.findUnique({
        where: { id: input.orderId },
        include: { 
          quote: { 
            include: { 
              request: true,
              suppliers: { where: { isWinner: true } }
            } 
          } 
        }
      });

      if (!existingOrder) throw new TRPCError({ code: 'NOT_FOUND' });
      
      // BLOQUEIO: Se já tiver recebimentos físicos ou status for RECEIVED/PARTIALLY_RECEIVED
      if (existingOrder.status !== 'AWAITING_RECEIPT' && existingOrder.status !== 'ISSUED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta ordem não pode ser editada pois já possui recebimentos ou status avançado.' });
      }

      const itemsAmount = input.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const totalAmount = itemsAmount + input.freight + input.otherExpenses + input.taxes - input.discounts;

      return ctx.prisma.$transaction(async (tx: any) => {
        // 2. Update PurchaseRequest
        await tx.purchaseRequest.update({
          where: { id: existingOrder.quote.request.id },
          data: {
            projectId: input.projectId,
            stageId: input.stageId,
            items: {
              deleteMany: {}, // Simplificado: remove tudo e recria para manter sync com o form
              create: input.items.map(i => ({
                description: i.description,
                unit: i.unit,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                projectId: i.projectId,
                stageId: i.stageId
              }))
            }
          }
        });

        // 3. Update QuoteSupplier (Winner)
        const winner = existingOrder.quote.suppliers[0];
        if (winner) {
          await tx.quoteSupplier.update({
            where: { id: winner.id },
            data: {
              supplierName: input.supplierName,
              unitPrice: itemsAmount / (input.items.length || 1),
              totalPrice: itemsAmount,
              deliveryDays: input.deliveryDays,
              paymentTerms: input.paymentTerms,
              freight: input.freight
            }
          });
        }

        // 4. Update Financial Entries (Delete and recreate)
        await tx.financialEntry.deleteMany({
          where: { purchaseOrderId: existingOrder.id }
        });

        const installmentAmount = totalAmount / input.installments;
        const firstDate = new Date(input.firstDueDate);

        const entries = Array.from({ length: input.installments }).map((_: any, idx: number) => {
          const dueDate = new Date(firstDate);
          dueDate.setMonth(dueDate.getMonth() + idx);
          
          return {
            type: 'EXPENSE' as const,
            category: input.category,
            description: `Parcela ${idx + 1}/${input.installments} - ${input.supplierName} (Pedido Direto #${existingOrder.id.slice(-6).toUpperCase()})`,
            amount: parseFloat(installmentAmount.toFixed(2)),
            dueDate,
            companyId: ctx.companyId!,
            purchaseOrderId: existingOrder.id
          };
        });

        await tx.financialEntry.createMany({
          data: entries
        });

        // 5. Update Order metadata
        await tx.purchaseOrder.update({
          where: { id: existingOrder.id },
          data: {
            number: input.orderNumber,
            status: input.status,
            approverId: input.approverId,
          }
        });

        return existingOrder;
      });
    })
});
