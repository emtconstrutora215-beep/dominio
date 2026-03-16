import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { parseStringPromise } from 'xml2js';

export const nfeRouter = router({
  parseAndSuggest: protectedProcedure
    .input(z.object({
      xmlContent: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      let parsed;
      try {
        parsed = await parseStringPromise(input.xmlContent);
      } catch {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Erro ao interpretar XML da NF-e.' });
      }

      // 1. Extrair Dados
      const infNFe = parsed?.nfeProc?.NFe?.[0]?.infNFe?.[0] || parsed?.NFe?.infNFe?.[0];
      if (!infNFe) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Arquivo XML parece não ser uma NF-e válida.' });
      }

      const emit = infNFe.emit?.[0];
      const supplierName = emit?.xNome?.[0] || 'Fornecedor Desconhecido';
      const cnpj = emit?.CNPJ?.[0];

      const ide = infNFe.ide?.[0];
      const issueDateStr = ide?.dhEmi?.[0] || ide?.dEmi?.[0]; // dEmi in older NFe versions
      const issueDate = new Date(issueDateStr || new Date());

      const total = infNFe.total?.[0]?.ICMSTot?.[0];
      const totalValue = parseFloat(total?.vNF?.[0] || 0);

      // Extract Items
      const dets = infNFe.det || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = dets.map((d: Record<string, any>) => {
        const prod = d.prod?.[0];
        return {
          description: prod?.xProd?.[0] || 'Item sem nome',
          unit: prod?.uCom?.[0] || 'UN',
          quantity: parseFloat(prod?.qCom?.[0] || 0),
          unitPrice: parseFloat(prod?.vUnCom?.[0] || 0),
          totalPrice: parseFloat(prod?.vProd?.[0] || 0)
        };
      });

      // 2. Procurar Ordem de Compra (Match ±10% do Valor)
      const openOrders = await ctx.prisma.purchaseOrder.findMany({
        where: {
          status: { in: ['AWAITING_RECEIPT', 'PARTIALLY_RECEIVED'] },
          quote: { request: { project: { companyId: ctx.companyId } } }
        },
        include: {
          quote: {
            include: { suppliers: { where: { isWinner: true } }, request: { include: { items: true, project: true } } }
          }
        }
      });

      const suggestions = [];

      for (const order of openOrders) {
        const winner = order.quote.suppliers[0];
        if (!winner) continue;

        const valDiffPerc = Math.abs(winner.totalPrice - totalValue) / (totalValue || 1);
        
        // Let's also check if supplier name matches partially
        const nameMatches = winner.supplierName.toLowerCase().includes(supplierName.substring(0, 5).toLowerCase()) ||
                            supplierName.toLowerCase().includes(winner.supplierName.substring(0, 5).toLowerCase());
        
        if (nameMatches || valDiffPerc <= 0.10) {
           suggestions.push({
             orderInfo: {
               id: order.id,
               supplierName: winner.supplierName,
               project: order.quote.request.project?.name,
               totalPrice: winner.totalPrice,
               items: order.quote.request.items
             },
             discrepancy: {
               hasPriceDiscrepancy: valDiffPerc > 0.05, // Warn if difference is > 5%
               differenceAmount: Math.abs(winner.totalPrice - totalValue)
             }
           });
        }
      }

      return {
        parsedData: {
          supplierName,
          cnpj,
          issueDate,
          totalValue,
          items
        },
        suggestions
      };
    }),

  confirmNfe: protectedProcedure
    .input(z.object({
      supplierName: z.string(),
      issueDate: z.string(), // ISO String
      totalValue: z.number(),
      dueDate: z.string(), // Extracted manually in UI or same as issueDate
      linkedPurchaseOrderId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      
      const entry = await ctx.prisma.financialEntry.create({
        data: {
          companyId: ctx.companyId,
          type: 'EXPENSE',
          category: 'Compra (NF-e Importada)',
          description: `NF-e: Fornecedor ${input.supplierName}`,
          amount: input.totalValue,
          competencyDate: new Date(input.issueDate), // Regime de Competência => Data Emissão NF
          dueDate: new Date(input.dueDate),          // Vencimento
          status: 'PENDING',
          purchaseOrderId: input.linkedPurchaseOrderId || null
        }
      });

      // Se vinculou a um PO, a entrada de estoque (Recebimento Físico)
      // deverá ser feito pela página de Recebimentos Físicos, 
      // ou poderíamos automatizar aqui tbm se quisermos dar baixa cega.
      // The user specifically separated Physical Receipt from XML. 
      // XML strictly creates AP, and linking to PO helps cross-check.

      return entry;
    })
});
