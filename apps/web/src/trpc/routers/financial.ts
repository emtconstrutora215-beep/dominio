import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const financialRouter = router({
  getDashboardData: protectedProcedure.query(async ({ ctx }) => {
    const entries = await ctx.prisma.financialEntry.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { dueDate: 'asc' }
    });

    const totalIncome = entries
      .filter((e: any) => e.type === 'INCOME')
      .reduce((acc: number, curr: any) => acc + curr.amount, 0);

    const totalExpense = entries
      .filter((e: any) => e.type === 'EXPENSE')
      .reduce((acc: number, curr: any) => acc + curr.amount, 0);

    return {
      entries,
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense
      }
    };
  }),

  getCreateOptions: protectedProcedure.query(async ({ ctx }) => {
    const [
      contacts, 
      bankAccounts, 
      purchaseOrders, 
      goodsReceipts, 
      contracts, 
      measurements, 
      projects
    ] = await Promise.all([
      ctx.prisma.contact.findMany({ where: { companyId: ctx.companyId }, select: { id: true, name: true, document: true } }),
      ctx.prisma.bankAccount.findMany({ where: { companyId: ctx.companyId }, select: { id: true, name: true, currentBalance: true } }),
      ctx.prisma.purchaseOrder.findMany({ 
        where: { 
          quote: { request: { companyId: ctx.companyId } },
          status: { in: ['ISSUED', 'AWAITING_RECEIPT', 'PARTIALLY_RECEIVED', 'RECEIVED'] }
        }, 
        include: { 
          quote: { 
            include: { 
              suppliers: { 
                where: { isWinner: true },
                select: { totalPrice: true }
              } 
            } 
          } 
        } 
      }),
      ctx.prisma.goodsReceipt.findMany({ 
        where: { purchaseOrder: { quote: { request: { companyId: ctx.companyId } } } }, 
        select: { id: true, createdAt: true, purchaseOrder: { select: { number: true } } } 
      }),
      ctx.prisma.contract.findMany({ 
        where: { project: { companyId: ctx.companyId } }, 
        select: { id: true, supplierName: true, totalValue: true, project: { select: { name: true } } } 
      }),
      ctx.prisma.measurement.findMany({ 
        where: { contract: { project: { companyId: ctx.companyId } }, status: 'APPROVED' }, 
        select: { id: true, netValue: true, contract: { select: { supplierName: true } } } 
      }),
      ctx.prisma.project.findMany({ 
        where: { companyId: ctx.companyId }, 
        select: { id: true, name: true, code: true, stages: { select: { id: true, name: true } } } 
      }),
    ]);

    return { contacts, bankAccounts, purchaseOrders, goodsReceipts, contracts, measurements, projects };
  }),

  createEntry: protectedProcedure
    .input(z.object({
      type: z.enum(['INCOME', 'EXPENSE']),
      category: z.string(),
      description: z.string(),
      amount: z.number(),
      dueDate: z.string(),
      competencyDate: z.string().optional(),
      documentNumber: z.string().optional(),
      paymentCondition: z.string().optional(),
      paymentMethod: z.string().optional(),
      contactId: z.string().optional(),
      bankAccountId: z.string().optional(),
      purchaseOrderId: z.string().optional(),
      goodsReceiptId: z.string().optional(),
      contractId: z.string().optional(),
      measurementId: z.string().optional(),
      retentions: z.number().optional(),
      observations: z.string().optional(),
      payerType: z.string().optional(),
      status: z.enum(['PENDING', 'PAID']).optional(),
      splits: z.array(z.object({
        projectId: z.string(),
        projectStageId: z.string().optional(),
        percentage: z.number(),
        amount: z.number()
      })).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { splits, ...data } = input;
      
      if (input.bankAccountId) {
        const bank = await ctx.prisma.bankAccount.findUnique({
          where: { id: input.bankAccountId }
        });
        if (bank?.isLocked) {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'Esta conta bancária está bloqueada para novas movimentações.' 
          });
        }
      }

      const entry = await ctx.prisma.financialEntry.create({
        data: {
          ...data,
          dueDate: new Date(input.dueDate),
          competencyDate: input.competencyDate ? new Date(input.competencyDate) : new Date(input.dueDate),
          paidDate: input.status === 'PAID' ? new Date() : null,
          status: (input.status as any) || 'PENDING',
          companyId: ctx.companyId,
          attachmentUrls: [],
          splits: splits ? {
            create: splits.map(s => ({
              projectId: s.projectId,
              projectStageId: s.projectStageId,
              percentage: s.percentage,
              amount: s.amount
            }))
          } : undefined
        }
      });

      return entry;
    }),

  getEntries: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      search: z.string().optional(),
      bankAccountId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = {
        companyId: ctx.companyId,
      };

      if (input.startDate || input.endDate) {
        where.competencyDate = {};
        if (input.startDate) where.competencyDate.gte = new Date(input.startDate);
        if (input.endDate) where.competencyDate.lte = new Date(input.endDate);
      }

      if (input.search) {
        where.OR = [
          { description: { contains: input.search, mode: 'insensitive' } },
          { documentNumber: { contains: input.search, mode: 'insensitive' } },
          { contact: { name: { contains: input.search, mode: 'insensitive' } } },
        ];
      }

      if (input.bankAccountId) {
        where.bankTransaction = {
          bankAccountId: input.bankAccountId
        };
      }

      return ctx.prisma.financialEntry.findMany({
        where,
        include: {
          contact: { select: { id: true, name: true } },
          bankAccount: { select: { id: true, name: true } },
          splits: {
            include: {
              project: { select: { id: true, name: true } },
              projectStage: { select: { id: true, name: true } }
            }
          },
          purchaseOrder: { select: { number: true } }
        },
        orderBy: { competencyDate: 'desc' }
      });
    }),

  getPaymentSummary: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);
    
    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);

    const entries = await ctx.prisma.financialEntry.findMany({
      where: { 
        companyId: ctx.companyId,
        type: 'EXPENSE',
        status: { in: ['PENDING', 'PARTIALLY_PAID'] }
      },
      select: { amount: true, dueDate: true }
    });

    const summary = {
      today: 0,
      sevenDays: 0,
      thirtyDays: 0
    };

    entries.forEach(e => {
      const dueDate = new Date(e.dueDate);
      dueDate.setHours(0,0,0,0);

      if (dueDate.getTime() === today.getTime()) {
        summary.today += e.amount;
      }
      
      if (dueDate >= today && dueDate <= in7Days) {
        summary.sevenDays += e.amount;
      }
      
      if (dueDate >= today && dueDate <= in30Days) {
        summary.thirtyDays += e.amount;
      }
    });

    return summary;
  }),

  getReceiptSummary: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);
    
    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);

    const entries = await ctx.prisma.financialEntry.findMany({
      where: { 
        companyId: ctx.companyId,
        type: 'INCOME',
        status: { in: ['PENDING', 'PARTIALLY_PAID'] }
      },
      select: { amount: true, dueDate: true }
    });

    const summary = {
      today: 0,
      sevenDays: 0,
      thirtyDays: 0
    };

    entries.forEach(e => {
      const dueDate = new Date(e.dueDate);
      dueDate.setHours(0,0,0,0);

      if (dueDate.getTime() === today.getTime()) {
        summary.today += e.amount;
      }
      
      if (dueDate >= today && dueDate <= in7Days) {
        summary.sevenDays += e.amount;
      }
      
      if (dueDate >= today && dueDate <= in30Days) {
        summary.thirtyDays += e.amount;
      }
    });

    return summary;
  }),

  statusToggle: protectedProcedure
    .input(z.object({ entryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.prisma.financialEntry.findUnique({
        where: { id: input.entryId }
      });

      if (!entry) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lançamento não encontrado' });

      const newStatus = entry.status === 'PAID' ? 'PENDING' : 'PAID';
      const paidDate = newStatus === 'PAID' ? new Date() : null;

      return ctx.prisma.financialEntry.update({
        where: { id: input.entryId },
        data: { 
          status: newStatus as any,
          paidDate
        }
      });
    }),

  getCashFlow: protectedProcedure
    .query(async ({ ctx }) => {
      const entries = await ctx.prisma.financialEntry.findMany({
        where: { companyId: ctx.companyId },
        orderBy: { dueDate: 'asc' }
      });

      // Group by date
      const flowMap: Record<string, { date: string; income: number; expense: number; balance: number }> = {};

      entries.forEach((e: any) => {
        const dateObj = e.status === 'PAID' && e.paidDate ? e.paidDate : e.dueDate;
        const date = dateObj.toISOString().split('T')[0];
        if (!flowMap[date]) flowMap[date] = { date, income: 0, expense: 0, balance: 0 };
        
        if (e.type === 'INCOME') flowMap[date].income += e.amount;
        if (e.type === 'EXPENSE') flowMap[date].expense += e.amount;
      });

      const flowArray = Object.values(flowMap).sort((a,b) => a.date.localeCompare(b.date));
      let cumulative = 0;
      return flowArray.map((f: any) => {
         cumulative += (f.income - f.expense);
         return { ...f, balance: cumulative };
      });
    }),

  getDRE: protectedProcedure
    .input(z.object({
      regime: z.enum(['CASH', 'ACCRUAL']),
      startDate: z.string(),
      endDate: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const gte = new Date(input.startDate);
      const lte = new Date(input.endDate);

      // Where clauses based on regime
      const dateFilter = input.regime === 'CASH' 
        ? { paidDate: { gte, lte }, status: 'PAID' as const }
        : { competencyDate: { gte, lte } };

      const entries = await ctx.prisma.financialEntry.findMany({
        where: {
          companyId: ctx.companyId,
          ...dateFilter
        }
      });

      // DRE generally groups by category and shows subtotals
      const categories: Record<string, { name: string; type: 'INCOME' | 'EXPENSE'; amount: number }> = {};
      let totalIncome = 0;
      let totalExpense = 0;

      entries.forEach((e: any) => {
        if (!categories[e.category]) {
           categories[e.category] = { name: e.category, type: e.type, amount: 0 };
        }
        categories[e.category].amount += e.amount;
        
        if (e.type === 'INCOME') totalIncome += e.amount;
        if (e.type === 'EXPENSE') totalExpense += e.amount;
      });

      return {
        regime: input.regime,
        period: { start: input.startDate, end: input.endDate },
        categories: Object.values(categories).sort((a, b) => b.amount - a.amount),
        summary: {
           grossRevenue: totalIncome,
           operatingExpenses: totalExpense,
           netResult: totalIncome - totalExpense
        }
      };
    }),

  addEntrySplit: protectedProcedure
    .input(z.object({
      entryId: z.string(),
      splits: z.array(z.object({
        projectId: z.string(),
        percentage: z.number(),
        amount: z.number()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      const totalPercent = input.splits.reduce((acc: number, s: any) => acc + s.percentage, 0);
      if (Math.abs(totalPercent - 100) > 0.01) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'A soma das porcentagens deve ser 100%.' });
      }

      return ctx.prisma.$transaction(async (tx: any) => {
        // Remove existing splits
        await tx.financialEntrySplit.deleteMany({ where: { financialEntryId: input.entryId } });
        // Create new ones
        return tx.financialEntrySplit.createMany({
          data: input.splits.map((s: any) => ({
            financialEntryId: input.entryId,
            projectId: s.projectId,
            percentage: s.percentage,
            amount: s.amount
          }))
        });
      });
    }),

  getEntrySplits: protectedProcedure
    .input(z.object({ entryId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.financialEntrySplit.findMany({
        where: { financialEntryId: input.entryId },
        include: { project: { select: { name: true } } }
      });
    }),

  removeEntrySplit: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.financialEntrySplit.delete({ where: { id: input.id } });
    }),

  getDRE_Report: protectedProcedure
    .input(z.object({
      year: z.number(),
      regime: z.enum(['CASH', 'ACCRUAL']),
      filterType: z.enum(['all', 'empresa', 'obra']).optional(),
      projectId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const gte = new Date(input.year, 0, 1);
      const lte = new Date(input.year, 11, 31, 23, 59, 59);

      const dateField = input.regime === 'CASH' ? 'paidDate' : 'competencyDate';
      
      const where: any = {
        companyId: ctx.companyId,
        [dateField]: { gte, lte },
      };

      if (input.regime === 'CASH') {
        where.status = 'PAID';
      }

      if (input.filterType === 'obra' && input.projectId && input.projectId !== 'all') {
        where.splits = {
          some: { projectId: input.projectId }
        };
      } else if (input.filterType === 'empresa') {
        // Entries specifically for 'Empresa' (General/Admin) usually have no splits 
        // or splits not linked to a construction project.
        where.splits = {
          none: {}
        };
      }

      const entries = await ctx.prisma.financialEntry.findMany({
        where,
        include: {
          splits: true
        }
      });

      // Structure initialization
      const months = Array.from({ length: 12 }, (_, i) => i);
      const rows: Record<string, { label: string; values: number[]; total: number; isHeader?: boolean; isSubtotal?: boolean; isMargin?: boolean; parent?: string }> = {};

      const addRow = (id: string, label: string, options: { isHeader?: boolean; isSubtotal?: boolean; isMargin?: boolean; parent?: string } = {}) => {
        rows[id] = { label, values: new Array(12).fill(0), total: 0, ...options };
      };

      // Define Hierarchy based on the model
      addRow("ROB", "Receita Operacional Bruta", { isHeader: true });
      addRow("outras_receitas", "Outras receitas", { parent: "ROB" });
      addRow("prestacao_servicos", "Prestação de Serviços", { parent: "ROB" });
      addRow("medicao", "Medição", { parent: "ROB" });
      
      addRow("impostos", "Impostos");
      
      addRow("ROL", "Receita Operacional Líquida", { isSubtotal: true });
      
      addRow("despesas_variaveis", "Despesas Variáveis", { isHeader: true });
      addRow("mao_de_obra", "Mão de Obra", { parent: "despesas_variaveis" });
      addRow("mao_de_obra_terceirizada", "Mão de Obra Terceirizada", { parent: "despesas_variaveis" });
      addRow("materiais", "Materials", { parent: "despesas_variaveis" });
      addRow("equipamentos", "Equipamentos", { parent: "despesas_variaveis" });
      addRow("outras_despesas", "Outras Despesas", { parent: "despesas_variaveis" });
      
      addRow("lucro_bruto", "Lucro Bruto", { isSubtotal: true });
      addRow("margem_bruta", "Margem Bruta (%)", { isMargin: true });
      
      addRow("despesas_operacionais", "Despesas Operacionais", { isHeader: true });
      addRow("gerais_administrativas", "Gerais e Administrativas", { parent: "despesas_operacionais" });
      addRow("aluguel_condominio_iptu", "Aluguel, Condomínio e IPTU", { parent: "despesas_operacionais" });
      addRow("pro_labore", "Pro Labore", { parent: "despesas_operacionais" });
      
      addRow("perc_despesas_operacionais", "% Despesas Operacionais", { isMargin: true });
      
      addRow("lucro_operacional", "Lucro Operacional", { isSubtotal: true });
      addRow("margem_operacional", "Margem Operacional (%)", { isMargin: true });
      
      addRow("resultado_financeiro", "Resultado Financeiro", { isHeader: true });
      addRow("descontos", "Descontos de Pagamentos", { parent: "resultado_financeiro" });
      addRow("despesas_financeiras", "Despesas Financeiras", { parent: "resultado_financeiro" });
      addRow("juros", "Juros de Pagamentos", { parent: "resultado_financeiro" });
      
      addRow("lucro_liquido", "Lucro Líquido", { isSubtotal: true });
      addRow("margem_liquida", "Margem Líquida (%)", { isMargin: true });

      // Categorization Helper
      const getRowId = (category: string, type: string) => {
        const cat = category.toLowerCase();
        
        if (type === 'INCOME') {
          if (cat.includes('medição')) return 'medicao';
          if (cat.includes('serviço')) return 'prestacao_servicos';
          return 'outras_receitas';
        } else {
          if (cat.includes('imposto')) return 'impostos';
          if (cat.includes('obra')) return 'mao_de_obra';
          if (cat.includes('terceirizada')) return 'mao_de_obra_terceirizada';
          if (cat.includes('material')) return 'materiais';
          if (cat.includes('equipamento')) return 'equipamentos';
          
          if (cat.includes('administrativa') || cat.includes('geral')) return 'gerais_administrativas';
          if (cat.includes('aluguel') || cat.includes('condomínio') || cat.includes('iptu')) return 'aluguel_condominio_iptu';
          if (cat.includes('pro labore') || cat.includes('pró-labore')) return 'pro_labore';
          
          if (cat.includes('desconto')) return 'descontos';
          if (cat.includes('financeira')) return 'despesas_financeiras';
          if (cat.includes('juro')) return 'juros';
          
          // Default for expenses
          if (cat.includes('despesa') && cat.includes('variável')) return 'outras_despesas';
          return 'outras_despesas';
        }
      };

      // Populate data
      entries.forEach(e => {
        const date = e[dateField] as Date;
        const month = date.getMonth();
        const rowId = getRowId(e.category, e.type);
        
        // Handle splits if projectId is selected
        let amount = e.amount;
        if (input.projectId && input.projectId !== 'all') {
          const split = e.splits.find(s => s.projectId === input.projectId);
          amount = split ? split.amount : 0;
        }

        if (rows[rowId]) {
          rows[rowId].values[month] += amount;
          rows[rowId].total += amount;
        }
      });

      // Calculate Subtotals and Headers
      months.forEach(m => {
        // ROB
        rows["ROB"].values[m] = rows["outras_receitas"].values[m] + rows["prestacao_servicos"].values[m] + rows["medicao"].values[m];
        
        // ROL
        rows["ROL"].values[m] = rows["ROB"].values[m] - rows["impostos"].values[m];
        
        // Despesas Variáveis
        rows["despesas_variaveis"].values[m] = rows["mao_de_obra"].values[m] + rows["mao_de_obra_terceirizada"].values[m] + rows["materiais"].values[m] + rows["equipamentos"].values[m] + rows["outras_despesas"].values[m];
        
        // Lucro Bruto
        rows["lucro_bruto"].values[m] = rows["ROL"].values[m] - rows["despesas_variaveis"].values[m];
        
        // Margem Bruta
        rows["margem_bruta"].values[m] = rows["ROL"].values[m] !== 0 ? (rows["lucro_bruto"].values[m] / rows["ROL"].values[m]) * 100 : 0;
        
        // Despesas Operacionais Header
        rows["despesas_operacionais"].values[m] = rows["gerais_administrativas"].values[m] + rows["aluguel_condominio_iptu"].values[m] + rows["pro_labore"].values[m];
        
        // % Despesas Operacionais
        rows["perc_despesas_operacionais"].values[m] = rows["ROL"].values[m] !== 0 ? (rows["despesas_operacionais"].values[m] / rows["ROL"].values[m]) * 100 : 0;
        
        // Lucro Operacional
        rows["lucro_operacional"].values[m] = rows["lucro_bruto"].values[m] - rows["despesas_operacionais"].values[m];
        
        // Margem Operacional
        rows["margem_operacional"].values[m] = rows["ROL"].values[m] !== 0 ? (rows["lucro_operacional"].values[m] / rows["ROL"].values[m]) * 100 : 0;
        
        // Resultado Financeiro Header
        rows["resultado_financeiro"].values[m] = rows["descontos"].values[m] - rows["despesas_financeiras"].values[m] - rows["juros"].values[m];
        
        // Lucro Líquido
        rows["lucro_liquido"].values[m] = rows["lucro_operacional"].values[m] + rows["resultado_financeiro"].values[m];
        
        // Margem Líquida
        rows["margem_liquida"].values[m] = rows["ROL"].values[m] !== 0 ? (rows["lucro_liquido"].values[m] / rows["ROL"].values[m]) * 100 : 0;
      });

      // Recalculate Totals for subheaders and margins
      Object.keys(rows).forEach(id => {
        if (rows[id].isMargin) {
          const rolTotal = rows["ROL"].total;
          if (id === "margem_bruta") rows[id].total = rolTotal !== 0 ? (rows["lucro_bruto"].total / rolTotal) * 100 : 0;
          if (id === "perc_despesas_operacionais") rows[id].total = rolTotal !== 0 ? (rows["despesas_operacionais"].total / rolTotal) * 100 : 0;
          if (id === "margem_operacional") rows[id].total = rolTotal !== 0 ? (rows["lucro_operacional"].total / rolTotal) * 100 : 0;
          if (id === "margem_liquida") rows[id].total = rolTotal !== 0 ? (rows["lucro_liquido"].total / rolTotal) * 100 : 0;
        } else if (rows[id].isHeader || rows[id].isSubtotal) {
          rows[id].total = rows[id].values.reduce((acc, v) => acc + v, 0);
        }
      });

      return {
        year: input.year,
        regime: input.regime,
        rows: Object.entries(rows).map(([id, data]) => ({ id, ...data }))
      };
    }),

  getDetailedCashFlow: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      viewType: z.enum(['DAILY', 'MONTHLY']),
      projectId: z.string().optional(), // Centro de Custo = Obra specific
      ownerType: z.string().optional(), // Proprietario (EMPRESA/CLIENTE)
      bankAccountId: z.string().optional(),
      includeInitialBalance: z.boolean().default(true)
    }))
    .query(async ({ ctx, input }) => {
      const gte = new Date(input.startDate);
      const lte = new Date(input.endDate);

      // 1. Get Bank Accounts
      const bankWhere: any = { companyId: ctx.companyId };
      if (input.bankAccountId) bankWhere.id = input.bankAccountId;
      if (input.ownerType) bankWhere.ownerType = input.ownerType;
      
      const bankAccounts = await ctx.prisma.bankAccount.findMany({ where: bankWhere });
      const initialBankBalances = bankAccounts.reduce((acc, b) => acc + b.initialBalance, 0);

      // 2. Calculate Saldo Inicial (Transactions before startDate)
      const prevEntriesWhere: any = {
        companyId: ctx.companyId,
        status: 'PAID',
        paidDate: { lt: gte }
      };
      if (input.projectId) {
        prevEntriesWhere.splits = { some: { projectId: input.projectId } };
      }
      if (input.bankAccountId) {
        prevEntriesWhere.bankAccountId = input.bankAccountId;
      }
      if (input.ownerType) {
        prevEntriesWhere.bankAccount = { ownerType: input.ownerType };
      }

      const prevEntries = await ctx.prisma.financialEntry.aggregate({
        where: prevEntriesWhere,
        _sum: { amount: true }
      });
      // Important: prevEntries sum needs to be split by type
      const prevIncome = await ctx.prisma.financialEntry.aggregate({
        where: { ...prevEntriesWhere, type: 'INCOME' },
        _sum: { amount: true }
      });
      const prevExpense = await ctx.prisma.financialEntry.aggregate({
        where: { ...prevEntriesWhere, type: 'EXPENSE' },
        _sum: { amount: true }
      });

      // 3. Bank Transfers before startDate
      const prevTransfersOut = await ctx.prisma.bankTransfer.aggregate({
        where: { companyId: ctx.companyId, status: 'PAID', date: { lt: gte }, fromAccountId: input.bankAccountId || undefined },
        _sum: { amount: true }
      });
      const prevTransfersIn = await ctx.prisma.bankTransfer.aggregate({
        where: { companyId: ctx.companyId, status: 'PAID', date: { lt: gte }, toAccountId: input.bankAccountId || undefined },
        _sum: { amount: true }
      });

      // Simple starting balance if including initial bank balances
      let startingBalance = input.includeInitialBalance ? initialBankBalances : 0;
      startingBalance += (prevIncome._sum.amount || 0) - (prevExpense._sum.amount || 0);
      // Transfers between accounts don't change TOTAL balance, but if filtered by bankAccount they DO.
      if (input.bankAccountId) {
        startingBalance += (prevTransfersIn._sum.amount || 0) - (prevTransfersOut._sum.amount || 0);
      }

      // 4. Get Current Period Data
      const currentEntriesWhere: any = {
        companyId: ctx.companyId,
        status: 'PAID',
        paidDate: { gte, lte }
      };
      if (input.projectId) {
        currentEntriesWhere.splits = { some: { projectId: input.projectId } };
      }
      if (input.bankAccountId) {
        currentEntriesWhere.bankAccountId = input.bankAccountId;
      }
      if (input.ownerType) {
        currentEntriesWhere.bankAccount = { ownerType: input.ownerType };
      }

      const entries = await ctx.prisma.financialEntry.findMany({
        where: currentEntriesWhere,
        include: { splits: true }
      });

      const transfersWhere: any = { companyId: ctx.companyId, status: 'PAID', date: { gte, lte } };
      const transfers = await ctx.prisma.bankTransfer.findMany({ where: transfersWhere });

      // 5. Categorization Lists
      const OPERACIONAL_CATEGORIES = ["Prestação de Serviços", "Execução de Obras", "Taxa de Administração", "Venda de Imóveis", "Projetos", "Venda", "Contrato", "Medição", "Licitação", "Aditivo de Contrato", "Venda de Materiais", "Venda de Equipamentos e Instalações"];
      const FINANCEIRA_CATEGORIES = ["Reembolso", "Juros de Aplicações Financeiras", "Empréstimo", "Aporte de Capital", "Distrato", "Juros", "Multa", "Financiamento Bancário", "Aporte de Investidor", "Juros de Contrato", "Estorno"];

      // 6. Group by Date and Category
      const periods: Record<string, any> = {};
      const categoryRows: Record<string, Record<string, number>> = {
        "Saldo Inicial": {},
        "Saldo Inicial de Conta": {},
        "Saldo Transferência": {},
        "Receitas": {},
        "Receita Operacional Bruta": {},
        "Receitas Financeiras": {},
        "Despesas": {},
        "Saldo": {}
      };

      // Fill periods
      let curr = new Date(gte);
      while (curr <= lte) {
        const key = input.viewType === 'DAILY' 
          ? curr.toISOString().split('T')[0]
          : `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`;
        
        if (!periods[key]) periods[key] = { key, income: 0, expense: 0, balance: 0, transfers: 0 };
        
        if (input.viewType === 'DAILY') {
          curr.setDate(curr.getDate() + 1);
        } else {
          curr.setMonth(curr.getMonth() + 1);
          curr.setDate(1);
        }
      }

      // Populate Entry data
      entries.forEach(e => {
        const d = e.paidDate!;
        const key = input.viewType === 'DAILY' 
          ? d.toISOString().split('T')[0]
          : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        
        if (!periods[key]) return;

        if (e.type === 'INCOME') {
          periods[key].income += e.amount;
          const isOperacional = OPERACIONAL_CATEGORIES.includes(e.category);
          const group = isOperacional ? "Receita Operacional Bruta" : "Receitas Financeiras";
          
          if (!categoryRows[group][key]) categoryRows[group][key] = 0;
          categoryRows[group][key] += e.amount;
          
          if (!categoryRows["Receitas"][key]) categoryRows["Receitas"][key] = 0;
          categoryRows["Receitas"][key] += e.amount;

          // Nested category rows (dynamic)
          if (!categoryRows[e.category]) categoryRows[e.category] = {};
          if (!categoryRows[e.category][key]) categoryRows[e.category][key] = 0;
          categoryRows[e.category][key] += e.amount;
        } else {
          periods[key].expense += e.amount;
          if (!categoryRows["Despesas"][key]) categoryRows["Despesas"][key] = 0;
          categoryRows["Despesas"][key] += e.amount;

          // Nested expense rows
          if (!categoryRows[e.category]) categoryRows[e.category] = {};
          if (!categoryRows[e.category][key]) categoryRows[e.category][key] = 0;
          categoryRows[e.category][key] += e.amount;
        }
      });

      // Populate Transfer data (only if filtered by bankAccount)
      if (input.bankAccountId) {
        transfers.forEach(t => {
          const d = t.date;
          const key = input.viewType === 'DAILY' 
            ? d.toISOString().split('T')[0]
            : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          
          if (!periods[key]) return;

          if (t.fromAccountId === input.bankAccountId) {
            periods[key].transfers -= t.amount;
            if (!categoryRows["Saldo Transferência"][key]) categoryRows["Saldo Transferência"][key] = 0;
            categoryRows["Saldo Transferência"][key] -= t.amount;
          }
          if (t.toAccountId === input.bankAccountId) {
            periods[key].transfers += t.amount;
            if (!categoryRows["Saldo Transferência"][key]) categoryRows["Saldo Transferência"][key] = 0;
            categoryRows["Saldo Transferência"][key] += t.amount;
          }
        });
      }

      // Calculate running balance and Saldo Inicial rows
      const sortedKeys = Object.keys(periods).sort();
      let cumulativeBalance = startingBalance;
      
      const chartData = sortedKeys.map(key => {
        const p = periods[key];
        const startOfPeriod = cumulativeBalance;
        cumulativeBalance += (p.income - p.expense + p.transfers);
        
        categoryRows["Saldo Inicial"][key] = startOfPeriod;
        categoryRows["Saldo"][key] = cumulativeBalance;

        return {
          date: key,
          balance: cumulativeBalance,
          income: p.income,
          expense: p.expense
        };
      });

      return {
        periods: sortedKeys,
        categoryRows,
        chartData,
        summary: {
          startingBalance,
          finalBalance: cumulativeBalance,
          totalIncome: Object.values(periods).reduce((acc, p) => acc + p.income, 0),
          totalExpense: Object.values(periods).reduce((acc, p) => acc + p.expense, 0)
        }
      };
    })
});
