import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
// @ts-expect-error - no types available
import ofxParser from 'node-ofx-parser';
import { differenceInDays } from 'date-fns';

export const bankRouter = router({
  getAccounts: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.bankAccount.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { name: 'asc' }
    });
  }),

  createAccount: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      agency: z.string().optional(),
      accountNumber: z.string().optional(),
      initialBalance: z.number().default(0)
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.bankAccount.create({
        data: {
          ...input,
          companyId: ctx.companyId,
          currentBalance: input.initialBalance
        }
      });
    }),

  // Upload and parse OFX, then run matching engine
  uploadOfx: protectedProcedure
    .input(z.object({
      bankAccountId: z.string(),
      ofxContent: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Verify Account
      const account = await ctx.prisma.bankAccount.findUnique({
        where: { id: input.bankAccountId, companyId: ctx.companyId }
      });
      if (!account) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conta bancária não encontrada.' });

      // 2. Parse OFX
      let parsedData;
      try {
        parsedData = ofxParser.parse(input.ofxContent);
      } catch {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Erro ao processar arquivo OFX. Formato inválido.' });
      }

      const stmtTrnRs = parsedData.OFX?.BANKMSGSRSV1?.STMTTRNRS || parsedData.OFX?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS;
      const transactionsData = stmtTrnRs?.STMTRS?.BANKTRANLIST?.STMTTRN || stmtTrnRs?.CCSTMTRS?.BANKTRANLIST?.STMTTRN;
      
      if (!transactionsData) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nenhuma transação encontrada no arquivo OFX.' });
      }

      // Handle both single object and array from parser
      const rawTxList = Array.isArray(transactionsData) ? transactionsData : [transactionsData];
      
      let importedCount = 0;
      
      for (const t of rawTxList) {
        if (!t.FITID) continue;
        const fitId = String(t.FITID);
        const amount = parseFloat(t.TRNAMT);
        const type = amount >= 0 ? 'INCOME' : 'EXPENSE';
        // Date format is YYYYMMDDHHMMSS or similar. e.g 20231015120000
        const dateStr = String(t.DTPOSTED).substring(0, 8); // get YYYYMMDD
        const date = new Date(`${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}T00:00:00Z`);
        
        // Upsert to avoid duplicates
        await ctx.prisma.bankTransaction.upsert({
          where: { fitId },
          update: {}, // if exists, do nothing
          create: {
            fitId,
            bankAccountId: input.bankAccountId,
            description: String(t.MEMO || t.NAME || 'Transação'),
            amount: Math.abs(amount),
            type,
            date
          }
        });
        importedCount++;
      }

      return { success: true, count: importedCount };
    }),

  getReconciliationSuggestions: protectedProcedure
    .input(z.object({
      bankAccountId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      // Fetch unreconciled bank transactions
      const unreconciledTx = await ctx.prisma.bankTransaction.findMany({
        where: { bankAccountId: input.bankAccountId, isReconciled: false },
        orderBy: { date: 'desc' }
      });

      // Fetch potential financial entries (not yet linked to a bank tx)
      const pendingEntries = await ctx.prisma.financialEntry.findMany({
        where: { companyId: ctx.companyId, bankTransactionId: null },
        orderBy: { dueDate: 'asc' }
      });

      const results = unreconciledTx.map(tx => {
        let bestMatch = null;
        let matchConfidence = 'UNRECONCILED';

        // Filter valid targets (same type: INCOME/EXPENSE)
        const candidates = pendingEntries.filter(e => e.type === tx.type);

        for (const candidate of candidates) {
          const diffDays = Math.abs(differenceInDays(tx.date, candidate.dueDate));
          const valDiffPerc = Math.abs(tx.amount - candidate.amount) / candidate.amount;

          // HIGH: Exact value + within 3 days
          if (valDiffPerc < 0.001 && diffDays <= 3) {
             matchConfidence = 'HIGH';
             bestMatch = candidate;
             break; // Strongest possible, break loop
          }
          // MEDIUM: Exact value + within 7 days
          else if (valDiffPerc < 0.001 && diffDays <= 7) {
            if (matchConfidence !== 'HIGH') {
               matchConfidence = 'MEDIUM';
               bestMatch = candidate;
            }
          }
          // LOW: Value within 2% + within 5 days
          else if (valDiffPerc <= 0.02 && diffDays <= 5) {
            if (matchConfidence === 'UNRECONCILED') {
               matchConfidence = 'LOW';
               bestMatch = candidate;
            }
          }
        }

        return {
          transaction: tx,
          suggestion: bestMatch,
          confidence: matchConfidence, // 'HIGH', 'MEDIUM', 'LOW', 'UNRECONCILED'
        };
      });

      return results;
    }),

  confirmReconciliation: protectedProcedure
    .input(z.object({
      mappings: z.array(z.object({
        bankTransactionId: z.string(),
        financialEntryId: z.string().optional(), // if missing, could create a new entry inside this mutation or mark as ignored.
        action: z.enum(['LINK', 'CREATE', 'IGNORE'])
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      let linked = 0;
      
      for (const map of input.mappings) {
        if (map.action === 'LINK' && map.financialEntryId) {
           await ctx.prisma.$transaction([
             ctx.prisma.bankTransaction.update({
               where: { id: map.bankTransactionId },
               data: { isReconciled: true }
             }),
             ctx.prisma.financialEntry.update({
               where: { id: map.financialEntryId },
               data: { 
                 bankTransactionId: map.bankTransactionId, 
                 status: 'PAID',
                 paidDate: new Date() 
               }
             })
           ]);
           linked++;
        }
        else if (map.action === 'CREATE') {
          // Creates a new financial entry out of the blue (balcão do banco)
          const tx = await ctx.prisma.bankTransaction.findUnique({ where: { id: map.bankTransactionId } });
          const bank = await ctx.prisma.bankAccount.findUnique({ where: { id: tx?.bankAccountId } });
          if(tx && bank) {
            await ctx.prisma.financialEntry.create({
               data: {
                 companyId: bank.companyId,
                 type: tx.type,
                 category: 'Reconciliação Avulsa',
                 description: tx.description,
                 amount: tx.amount,
                 dueDate: tx.date,
                 paidDate: tx.date,
                 competencyDate: tx.date,
                 status: 'PAID',
                 bankTransactionId: tx.id
               }
            });
            await ctx.prisma.bankTransaction.update({
              where: { id: tx.id },
              data: { isReconciled: true }
            });
            linked++;
          }
        }
        else if (map.action === 'IGNORE') {
           await ctx.prisma.bankTransaction.update({
               where: { id: map.bankTransactionId },
               data: { isReconciled: true, description: `[IGNORADO] - ${map.bankTransactionId}` } // Optional: mark it internally
           });
           linked++;
        }
      }
      
      return { success: true, count: linked };
    })
});
