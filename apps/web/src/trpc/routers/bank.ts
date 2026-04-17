import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
// @ts-expect-error - no types available
import ofxParser from 'node-ofx-parser';
import { differenceInDays } from 'date-fns';

export const bankRouter = router({
  getAccounts: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      isActive: z.boolean().optional(),
      ownerType: z.string().optional()
    }).optional())
    .query(async ({ ctx, input }) => {
      const where: any = { companyId: ctx.companyId };
      
      // Visibility Check: If not ADMIN, only show if user is in allowedUsers
      if (ctx.user.role !== 'ADMIN') {
        where.allowedUsers = {
          some: { id: ctx.user.id }
        };
      }

      if (input?.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { accountNumber: { contains: input.search, mode: "insensitive" } },
          { agency: { contains: input.search, mode: "insensitive" } },
        ];
      }

      if (input?.isActive !== undefined) {
        where.isActive = input.isActive;
      }

      if (input?.ownerType && input.ownerType !== "Todos os proprietários") {
        where.ownerType = input.ownerType.toUpperCase();
      }

      const accounts = await ctx.prisma.bankAccount.findMany({
        where,
        include: {
          transactions: {
            select: { amount: true, type: true }
          },
          allowedUsers: { select: { id: true, name: true } }
        },
        orderBy: { name: 'asc' }
      });

      return accounts.map(acc => {
        const calculatedBalance = acc.transactions.reduce((sum, tx) => {
          return tx.type === 'INCOME' ? sum + tx.amount : sum - tx.amount;
        }, acc.initialBalance);
        
        return {
          ...acc,
          currentBalance: calculatedBalance
        };
      });
    }),

  getVisibleUsers: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({
      where: { companyId: ctx.companyId },
      select: { id: true, name: true, email: true }
    });
  }),

  createAccount: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      agency: z.string().optional(),
      accountNumber: z.string().optional(),
      initialBalance: z.number().default(0),
      initialDate: z.string().optional(),
      ownerType: z.string().default("EMPRESA"),
      allowedUserIds: z.array(z.string()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { allowedUserIds, initialDate, ...data } = input;
      return ctx.prisma.bankAccount.create({
        data: {
          ...data,
          initialDate: initialDate ? new Date(initialDate) : new Date(),
          companyId: ctx.companyId,
          currentBalance: input.initialBalance,
          allowedUsers: allowedUserIds ? {
            connect: allowedUserIds.map(id => ({ id }))
          } : undefined
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

      const results = unreconciledTx.map((tx: any) => {
        let bestMatch = null;
        let matchConfidence = 'UNRECONCILED';

        // Filter valid targets (same type: INCOME/EXPENSE)
        const candidates = pendingEntries.filter((e: any) => e.type === tx.type);

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
    }),

  toggleLock: protectedProcedure
    .input(z.object({ id: z.string(), isLocked: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.bankAccount.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: { isLocked: input.isLocked }
      });
    }),

  toggleActive: protectedProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.bankAccount.update({
        where: { id: input.id, companyId: ctx.companyId },
        data: { isActive: input.isActive }
      });
    }),

  // TRANSFERS
  getTransfers: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      search: z.string().optional(),
      status: z.enum(['PENDING', 'PAID', 'ALL']).optional().default('ALL')
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { companyId: ctx.companyId };

      if (input.startDate && input.endDate) {
        where.date = {
          gte: new Date(input.startDate),
          lte: new Date(input.endDate)
        };
      }

      if (input.search) {
        where.description = { contains: input.search, mode: 'insensitive' };
      }

      if (input.status === 'PAID') where.status = 'PAID';
      if (input.status === 'PENDING') where.status = 'PENDING';

      return ctx.prisma.bankTransfer.findMany({
        where,
        include: {
          fromAccount: { select: { name: true } },
          toAccount: { select: { name: true } }
        },
        orderBy: { date: 'desc' }
      });
    }),

  createTransfer: protectedProcedure
    .input(z.object({
      description: z.string().min(1),
      amount: z.number().positive(),
      date: z.string(),
      fromAccountId: z.string(),
      toAccountId: z.string(),
      status: z.enum(['PENDING', 'PAID']).default('PAID')
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.fromAccountId === input.toAccountId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Contas de origem e destino devem ser diferentes.' });
      }

      return ctx.prisma.$transaction(async (tx) => {
        let fromTxId: string | undefined;
        let toTxId: string | undefined;

        if (input.status === 'PAID') {
          const fromTx = await tx.bankTransaction.create({
            data: {
              bankAccountId: input.fromAccountId,
              description: `Transferência para: ${input.description}`,
              amount: input.amount,
              type: 'EXPENSE',
              date: new Date(input.date),
              isReconciled: true
            }
          });
          fromTxId = fromTx.id;

          const toTx = await tx.bankTransaction.create({
            data: {
              bankAccountId: input.toAccountId,
              description: `Transferência de: ${input.description}`,
              amount: input.amount,
              type: 'INCOME',
              date: new Date(input.date),
              isReconciled: true
            }
          });
          toTxId = toTx.id;
        }

        return tx.bankTransfer.create({
          data: {
            description: input.description,
            amount: input.amount,
            date: new Date(input.date),
            status: input.status,
            fromAccountId: input.fromAccountId,
            toAccountId: input.toAccountId,
            fromTransactionId: fromTxId,
            toTransactionId: toTxId,
            companyId: ctx.companyId,
          }
        });
      });
    }),

  confirmTransfer: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const transfer = await ctx.prisma.bankTransfer.findUnique({
        where: { id: input.id, companyId: ctx.companyId }
      });

      if (!transfer || transfer.status === 'PAID') return transfer;

      return ctx.prisma.$transaction(async (tx) => {
        const fromTx = await tx.bankTransaction.create({
          data: {
            bankAccountId: transfer.fromAccountId,
            description: `Transferência para: ${transfer.description}`,
            amount: transfer.amount,
            type: 'EXPENSE',
            date: transfer.date,
            isReconciled: true
          }
        });

        const toTx = await tx.bankTransaction.create({
          data: {
            bankAccountId: transfer.toAccountId,
            description: `Transferência de: ${transfer.description}`,
            amount: transfer.amount,
            type: 'INCOME',
            date: transfer.date,
            isReconciled: true
          }
        });

        return tx.bankTransfer.update({
          where: { id: input.id },
          data: {
            status: 'PAID',
            fromTransactionId: fromTx.id,
            toTransactionId: toTx.id
          }
        });
      });
    }),

  deleteTransfer: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const transfer = await ctx.prisma.bankTransfer.findUnique({
        where: { id: input.id, companyId: ctx.companyId }
      });

      if (!transfer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Transferência não encontrada.' });

      return ctx.prisma.$transaction(async (tx) => {
        if (transfer.fromTransactionId) {
          await tx.bankTransaction.delete({ where: { id: transfer.fromTransactionId } });
        }
        if (transfer.toTransactionId) {
          await tx.bankTransaction.delete({ where: { id: transfer.toTransactionId } });
        }
        return tx.bankTransfer.delete({ where: { id: input.id } });
      });
    })
});
