import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const biRouter = router({
  getOverviewKpis: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      projectId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { prisma, companyId } = ctx;
      
      const projectWhere = {
        companyId,
        ...(input.projectId ? { id: input.projectId } : {}),
      };

      const projects = await prisma.project.findMany({
        where: projectWhere,
        include: {
          stages: true,
        }
      });

      const totalBudget = projects.reduce((acc: number, p: any) => acc + (p.budget || 0), 0);
      
      // Calculate Total Spent from FinancialEntries
      const spentWhere = {
        companyId,
        type: 'EXPENSE' as const,
        status: 'PAID' as const,
        ...(input.startDate && input.endDate ? {
          paidDate: {
            gte: new Date(input.startDate),
            lte: new Date(input.endDate),
          }
        } : {}),
        // If specific project, we need to filter splits
      };

      let totalSpent = 0;
      
      if (input.projectId) {
        // Find splits for this project and sum them
        const splits = await prisma.financialEntrySplit.findMany({
          where: {
            projectId: input.projectId,
            financialEntry: spentWhere
          },
          include: { financialEntry: true }
        });
        totalSpent = (splits as any[]).reduce((acc: number, split: any) => acc + split.amount, 0);
      } else {
        const expenses = await prisma.financialEntry.aggregate({
          where: spentWhere,
          _sum: { amount: true }
        });
        totalSpent = expenses._sum.amount || 0;
      }

      const overBudgetAmount = Math.max(0, totalSpent - totalBudget);
      const percentOverBudget = totalBudget > 0 ? (overBudgetAmount / totalBudget) * 100 : 0;

      const projectStatusCounts = {
        completed: projects.filter((p: any) => p.status === 'COMPLETED').length,
        inProgress: projects.filter((p: any) => p.status === 'IN_PROGRESS').length,
        paused: projects.filter((p: any) => p.status === 'PAUSED').length,
        planning: projects.filter((p: any) => p.status === 'PLANNING').length,
      };

      // Project summaries for charts
      const projectSummaries = projects.map((p: any) => ({
        name: p.name,
        orcado: p.budget || 0,
        realizado: p.stages.reduce((acc: number, s: any) => acc + s.actualCost, 0)
      }));

      // Simple heuristic for "on time vs delayed": if endDate is past and status is not COMPLETED
      const now = new Date();
      let delayedCount = 0;
      let onTimeCount = 0;
      
      projects.forEach((p: any) => {
        if (p.status !== 'COMPLETED' && p.status !== 'CANCELLED') {
          if (p.endDate && new Date(p.endDate) < now) {
            delayedCount++;
          } else {
            onTimeCount++;
          }
        }
      });

      return {
        totalBudget,
        totalSpent,
        overBudgetAmount,
        percentOverBudget,
        projectStatusCounts,
        delayedCount,
        onTimeCount,
        projectSummaries
      };
    }),

  getProjectDashboards: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      projectId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { prisma, companyId } = ctx;
      
      const projectWhere = {
        companyId,
        ...(input.projectId ? { id: input.projectId } : {}),
      };

      // 1. Budget vs Actual per Stage
      const stages = await prisma.projectStage.findMany({
        where: { project: projectWhere },
        select: { name: true, plannedCost: true, actualCost: true }
      });

      const budgetVsActual = stages.map((s: any) => ({
        name: s.name,
        planned: s.plannedCost,
        actual: s.actualCost
      }));

      // 2. Cost Breakdown by Category
      const spentWhere = {
        companyId,
        type: 'EXPENSE' as const,
        status: 'PAID' as const,
        ...(input.startDate && input.endDate ? {
          paidDate: {
            gte: new Date(input.startDate),
            lte: new Date(input.endDate),
          }
        } : {}),
      };

      let categoryExpenses;
      if (input.projectId) {
        const splits = await prisma.financialEntrySplit.findMany({
          where: { projectId: input.projectId, financialEntry: spentWhere },
          include: { financialEntry: true }
        });
        
        const categoryMap = new Map<string, number>();
        splits.forEach((s: any) => {
          const cat = s.financialEntry.category || 'Outros';
          categoryMap.set(cat, (categoryMap.get(cat) || 0) + s.amount);
        });
        
        categoryExpenses = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
      } else {
        const aggs = await prisma.financialEntry.groupBy({
          by: ['category'],
          where: spentWhere,
          _sum: { amount: true }
        });
        categoryExpenses = aggs.map((a: any) => ({
          name: a.category || 'Outros',
          value: a._sum.amount || 0
        }));
      }

      // 3. S-Curve Data (Mock for plotting, actual requires complex time-series aggregation)
      // Normally we'd use StageDistributions and daily costs. Here we aggregate by month.
      const sCurve = [
        { month: 'Jan', planned: 10000, actual: 12000 },
        { month: 'Fev', planned: 25000, actual: 28000 },
        { month: 'Mar', planned: 45000, actual: 40000 },
        { month: 'Abr', planned: 70000, actual: 65000 },
        { month: 'Mai', planned: 100000, actual: 95000 },
      ];

      return {
        budgetVsActual,
        categoryExpenses,
        sCurve
      };
    }),

  getPurchasesDashboard: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      projectId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { prisma, companyId } = ctx;

      const orderWhere = {
        quote: { request: { project: { companyId, ...(input.projectId ? { id: input.projectId } : {}) } } },
        ...(input.startDate && input.endDate ? {
          createdAt: {
            gte: new Date(input.startDate),
            lte: new Date(input.endDate),
          }
        } : {}),
      };

      const orders = await prisma.purchaseOrder.findMany({
        where: orderWhere,
        include: {
          quote: {
            include: { suppliers: true, request: true }
          }
        }
      });

      const supplierTotals = new Map<string, number>();
      let totalSavings = 0;
      let savingsCount = 0;
      let totalCycleTimeDays = 0;
      let cycleCount = 0;

      orders.forEach((o: any) => {
        const winner = (o.quote.suppliers as any[]).find((s: any) => s.isWinner);
        if (winner) {
          supplierTotals.set(winner.supplierName, (supplierTotals.get(winner.supplierName) || 0) + winner.totalPrice);
          
          // Savings: highest quote minus winner
          const highestQuote = Math.max(...(o.quote.suppliers as any[]).map((s: any) => s.totalPrice));
          if (highestQuote > winner.totalPrice) {
             totalSavings += (highestQuote - winner.totalPrice);
             savingsCount++;
          }
        }

        // Cycle Time: from Request Creation to Order Creation (Simplified here as lead time)
        const reqDate = o.quote.request.createdAt.getTime();
        const ordDate = o.createdAt.getTime();
        const diffDays = (ordDate - reqDate) / (1000 * 3600 * 24);
        totalCycleTimeDays += diffDays;
        cycleCount++;
      });

      const spentPerSupplier = Array.from(supplierTotals.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10

      const avgSavings = savingsCount > 0 ? totalSavings / savingsCount : 0;
      const avgCycleTime = cycleCount > 0 ? totalCycleTimeDays / cycleCount : 0;

      return {
        spentPerSupplier,
        avgSavings,
        avgCycleTime
      };
    }),

  getCommercialDashboard: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      projectId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { prisma, companyId } = ctx;

      // 1. Won vs Lost (In Progress/Completed vs Cancelled)
      const projects = await prisma.project.findMany({
        where: { companyId },
        select: { status: true, budget: true, createdAt: true }
      });

      const won = projects.filter((p: any) => ['IN_PROGRESS', 'COMPLETED', 'PAUSED'].includes(p.status)).length;
      const lost = projects.filter((p: any) => p.status === 'CANCELLED').length;
      const planning = projects.filter((p: any) => p.status === 'PLANNING').length;

      const wonProjects = projects.filter((p: any) => ['IN_PROGRESS', 'COMPLETED', 'PAUSED'].includes(p.status));
      const avgContractValue = wonProjects.length > 0 ? 
        wonProjects.reduce((acc: number, p: any) => acc + (p.budget || 0), 0) / wonProjects.length : 0;

      // 2. Revenue by Month
      const incomeWhere = {
        companyId,
        type: 'INCOME' as const,
        status: 'PAID' as const,
        ...(input.startDate && input.endDate ? {
          paidDate: {
            gte: new Date(input.startDate),
            lte: new Date(input.endDate),
          }
        } : {}),
      };

      const incomes = await prisma.financialEntry.findMany({
        where: incomeWhere,
        select: { amount: true, paidDate: true }
      });

      const revenueMap = new Map<string, number>();
      incomes.forEach((inc: any) => {
        if (inc.paidDate) {
           const month = inc.paidDate.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
           revenueMap.set(month, (revenueMap.get(month) || 0) + inc.amount);
        }
      });

      const revenueByMonth = Array.from(revenueMap.entries())
        .map(([month, revenue]) => ({ month, revenue }));
      
      return {
        winLoss: [
          { name: 'Ganhos', value: won },
          { name: 'Perdidos', value: lost },
          { name: 'Em Negociação', value: planning }
        ],
        avgContractValue,
        revenueByMonth
      };
    }),

  getProjectOverview: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { prisma, companyId } = ctx;
      const { projectId } = input;

      // 1. Get Project with stages and client
      const project = await prisma.project.findFirst({
        where: { id: projectId, companyId },
        include: {
          client: { select: { name: true } },
          stages: true
        }
      });

      if (!project) throw new Error("Obra não encontrada");

      // 2. Get Budget Data (Budgeted Costs)
      const budgetItems = await prisma.budgetItem.findMany({
        where: { projectStage: { projectId } },
        include: { catalogItem: true }
      });

      const budgeted = {
        labor: 0,
        material: 0,
        equipment: 0,
        others: 0,
        total: 0
      };

      budgetItems.forEach((item: any) => {
        if (item.children && item.children.length > 0) return; // Only leaf items
        
        const total = item.total || 0;
        const type = item.catalogItem?.type || item.type;

        if (type === 'LABOR') budgeted.labor += total;
        else if (type === 'MATERIAL') budgeted.material += total;
        else if (type === 'EQUIPMENT') budgeted.equipment += total;
        else budgeted.others += total;
      });
      budgeted.total = budgeted.labor + budgeted.material + budgeted.equipment + budgeted.others;

      // 3. Get Real Data (Actual Paid Costs)
      const splits = await prisma.financialEntrySplit.findMany({
        where: {
          projectId,
          financialEntry: {
            companyId,
            type: 'EXPENSE',
            status: 'PAID'
          }
        },
        include: { financialEntry: true }
      });

      const actual = {
        labor: 0,
        material: 0,
        equipment: 0,
        others: 0,
        total: 0
      };

      const mapCategory = (category: string) => {
        const cat = (category || "").toLowerCase();
        if (cat.includes('mão de obra') || cat.includes('mão-de-obra') || cat.includes('mao de obra') || cat.includes('salário') || cat.includes('encargo')) return 'labor';
        if (cat.includes('material')) return 'material';
        if (cat.includes('equipamento') || cat.includes('locação')) return 'equipment';
        return 'others';
      };

      splits.forEach((s: any) => {
        const category = mapCategory(s.financialEntry.category);
        actual[category as keyof typeof actual] += s.amount;
      });
      actual.total = actual.labor + actual.material + actual.equipment + actual.others;

      // 4. Calculate KPIs
      const evolutionPercent = project.stages.length > 0
        ? project.stages.reduce((acc: number, s: any) => acc + (s.percentageComplete || 0), 0) / project.stages.length
        : 0;

      const earnedValue = budgeted.total * (evolutionPercent / 100);
      const balance = budgeted.total - actual.total;

      // 5. Data for Charts
      const distribution = [
        { name: 'Mão de Obra', value: actual.labor },
        { name: 'Materiais', value: actual.material },
        { name: 'Equipamentos', value: actual.equipment },
        { name: 'Outros', value: actual.others },
      ].filter(d => d.value > 0);

      const summaryBars = [
        { name: 'Orçado', value: budgeted.total, color: '#7b98d1' },
        { name: 'Valor Agregado', value: earnedValue, color: '#4facfe' },
        { name: 'Realizado', value: actual.total, color: '#ffbb28' },
        { name: 'Variação de custos', value: earnedValue - actual.total, color: '#4ade80' },
      ];

      return {
        project: {
          id: project.id,
          name: project.name,
          code: project.code,
          clientName: project.client?.name,
          totalArea: project.totalArea,
          areaUnit: project.areaUnit,
          startDate: project.startDate,
          endDate: project.endDate,
          status: project.status,
          evolutionPercent,
        },
        costs: {
          budgeted,
          actual,
          balance: {
            labor: budgeted.labor - actual.labor,
            material: budgeted.material - actual.material,
            equipment: budgeted.equipment - actual.equipment,
            others: budgeted.others - actual.others,
            total: balance
          }
        },
        kpis: {
          earnedValue,
        },
        charts: {
          distribution,
          summaryBars
        }
      };
    }),

  getProjectCostManagement: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { prisma, companyId } = ctx;
      const { projectId } = input;

      // 1. Fetch Stages with Budget Items and Splits
      const stages = await prisma.projectStage.findMany({
        where: { projectId, project: { companyId } },
        include: {
          budgetItems: {
            include: { children: true }
          },
          financialSplits: {
            where: {
              financialEntry: {
                status: 'PAID',
                type: 'EXPENSE'
              }
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      const stageData = stages.map(stage => {
        // Budgeted: Sum of leaf items
        const budgeted = stage.budgetItems.reduce((acc: number, item: any) => {
          if (item.children && item.children.length > 0) return acc;
          return acc + (item.total || 0);
        }, 0);

        // Actual: Sum of paid splits
        const actual = stage.financialSplits.reduce((acc: number, split: any) => acc + split.amount, 0);

        return {
          id: stage.id,
          name: stage.name,
          budgeted,
          actual,
          balance: budgeted - actual,
          percentageComplete: stage.percentageComplete || 0
        };
      });

      // 2. Unallocated Costs (Splits without stage)
      const unallocatedSplits = await prisma.financialEntrySplit.findMany({
        where: {
          projectId,
          projectStageId: null,
          financialEntry: {
            companyId,
            status: 'PAID',
            type: 'EXPENSE'
          }
        }
      });

      const unallocatedAmount = unallocatedSplits.reduce((acc: number, s: any) => acc + s.amount, 0);

      // 3. Totals
      const totalBudgeted = stageData.reduce((acc, s) => acc + s.budgeted, 0);
      const totalActual = stageData.reduce((acc, s) => acc + s.actual, 0) + unallocatedAmount;
      const totalBalance = totalBudgeted - totalActual;
      const totalPhysicalProgress = stageData.length > 0 
        ? stageData.reduce((acc, s) => acc + s.percentageComplete, 0) / stageData.length 
        : 0;

      return {
        stages: stageData,
        unallocated: {
          amount: unallocatedAmount,
          percentOfTotal: totalActual > 0 ? (unallocatedAmount / totalActual) * 100 : 0
        },
        totals: {
          budgeted: totalBudgeted,
          actual: totalActual,
          balance: totalBalance,
          physicalProgress: totalPhysicalProgress,
          costPercent: totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0
        }
      };
    }),

  getProjectSCurve: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { prisma, companyId } = ctx;
      const { projectId } = input;

      const project = await prisma.project.findFirst({
        where: { id: projectId, companyId },
        select: { startDate: true, endDate: true }
      });

      if (!project) throw new Error("Obra não encontrada");

      // Set default range if dates are missing
      const startDate = project.startDate || new Date();
      const endDate = project.endDate || new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000);

      // 1. Fetch Stages for Planned Costs
      const stages = await prisma.projectStage.findMany({
        where: { projectId },
        include: { distributions: true },
      });

      // 2. Fetch Measurements for Measured Costs
      const measurements = await prisma.measurement.findMany({
        where: { projectId, status: 'APPROVED' },
        select: { grossValue: true, createdAt: true, approvedAt: true }
      });

      // 3. Fetch Financial Splits for Actual Costs
      const splits = await prisma.financialEntrySplit.findMany({
        where: { 
          projectId, 
          financialEntry: { 
            status: 'PAID', 
            type: 'EXPENSE' 
          } 
        },
        include: { financialEntry: { select: { paidDate: true } } }
      });

      // Helper to group by month (YYYY-MM)
      const getMonthKey = (date: Date) => {
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      };

      const monthlyData: Record<string, { orcado: number, medido: number, realizado: number }> = {};

      // Initialize months range
      let current = new Date(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1);
      const last = new Date(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1);
      
      // Ensure we have at least until current month or latest data point
      const dataDates = [
        ...measurements.map(m => m.approvedAt || m.createdAt),
        ...splits.map(s => s.financialEntry.paidDate).filter(Boolean) as Date[]
      ];
      const maxDataDate = dataDates.length > 0 ? new Date(Math.max(...dataDates.map(d => d.getTime()))) : new Date();
      const finalEndDate = maxDataDate > last ? new Date(maxDataDate.getUTCFullYear(), maxDataDate.getUTCMonth(), 1) : last;

      let iter = new Date(current);
      while (iter <= finalEndDate) {
        monthlyData[getMonthKey(iter)] = { orcado: 0, medido: 0, realizado: 0 };
        iter.setUTCMonth(iter.getUTCMonth() + 1);
      }

      // Distribute Planned Costs
      stages.forEach(stage => {
        if (stage.plannedCost <= 0) return;
        
        if (stage.distributions && stage.distributions.length > 0) {
          stage.distributions.forEach(dist => {
             const key = getMonthKey(dist.periodStart);
             if (monthlyData[key]) {
               monthlyData[key].orcado += (stage.plannedCost * (dist.percentage / 100));
             }
          });
        } else {
          // Linear fallback
          const sStart = stage.startDate || startDate;
          const sEnd = stage.endDate || endDate;
          
          let sCurrent = new Date(sStart.getUTCFullYear(), sStart.getUTCMonth(), 1);
          const sLast = new Date(sEnd.getUTCFullYear(), sEnd.getUTCMonth(), 1);
          
          const monthCount = (sLast.getUTCFullYear() - sCurrent.getUTCFullYear()) * 12 + (sLast.getUTCMonth() - sCurrent.getUTCMonth()) + 1;
          const perMonth = stage.plannedCost / monthCount;

          let sIter = new Date(sCurrent);
          while (sIter <= sLast) {
            const key = getMonthKey(sIter);
            if (monthlyData[key]) {
              monthlyData[key].orcado += perMonth;
            }
            sIter.setUTCMonth(sIter.getUTCMonth() + 1);
          }
        }
      });

      // Aggregate Measured Costs
      measurements.forEach(m => {
        const date = m.approvedAt || m.createdAt;
        const key = getMonthKey(date);
        if (monthlyData[key]) {
          monthlyData[key].medido += m.grossValue;
        }
      });

      // Aggregate Actual Costs
      splits.forEach(s => {
        if (s.financialEntry.paidDate) {
          const key = getMonthKey(s.financialEntry.paidDate);
          if (monthlyData[key]) {
            monthlyData[key].realizado += s.amount;
          }
        }
      });

      // Transform and Calculate Accumulations
      const result = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .reduce((acc, [month, values]) => {
          const prev = acc.length > 0 ? acc[acc.length - 1] : { orcadoAcumulado: 0, medidoAcumulado: 0, realizadoAcumulado: 0 };
          
          acc.push({
            month,
            ...values,
            orcadoAcumulado: prev.orcadoAcumulado + values.orcado,
            medidoAcumulado: prev.medidoAcumulado + values.medido,
            realizadoAcumulado: prev.realizadoAcumulado + values.realizado
          });
          return acc;
        }, [] as any[]);

      return result;
    }),

  getProjectInputsReport: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { prisma, companyId } = ctx;
      const { projectId, search } = input;

      // 1. Fetch Budget Items with their compositions and children
      const budgetItems = await prisma.budgetItem.findMany({
        where: { projectStage: { projectId } },
        include: { 
          composition: { 
            include: { 
              items: { 
                include: { catalogItem: true } 
              } 
            } 
          },
          children: true
        }
      });

      const reportMap = new Map<string, {
        description: string;
        orcadoQty: number;
        orcadoUnitPrice: number;
        realizadoQty: number;
        realizadoUnitPrice: number;
      }>();

      // Function to add or update entry
      const addOrcado = (desc: string, qty: number, unitPrice: number) => {
        if (search && !desc.toLowerCase().includes(search.toLowerCase())) return;
        
        let entry = reportMap.get(desc);
        if (!entry) {
          entry = { description: desc, orcadoQty: 0, orcadoUnitPrice: unitPrice, realizadoQty: 0, realizadoUnitPrice: 0 };
          reportMap.set(desc, entry);
        }
        entry.orcadoQty += qty;
        if (unitPrice > 0) entry.orcadoUnitPrice = unitPrice;
      };

      budgetItems.forEach(item => {
        // If it's a leaf input/item
        if ((item.type === 'INPUT' || item.type === 'ITEM') && (!item.children || item.children.length === 0)) {
          addOrcado(item.description, item.quantity, item.unitPrice);
        } 
        // If it's a composition, expand it
        else if (item.type === 'COMPOSITION' && item.composition) {
          item.composition.items.forEach(ci => {
            const qty = item.quantity * ci.quantity;
            addOrcado(ci.catalogItem.description, qty, ci.catalogItem.unitCost);
          });
        }
      });

      // 2. Fetch Measurements for Realized values
      const measurements = await prisma.measurement.findMany({
        where: { projectId, status: 'APPROVED' },
        include: { 
          items: { 
            include: { 
              budgetItem: {
                include: {
                  composition: { include: { items: { include: { catalogItem: true } } } }
                }
              }
            } 
          } 
        }
      });

      measurements.forEach(m => {
        m.items.forEach(mi => {
          if (!mi.budgetItem) return;
          
          if (mi.budgetItem.type === 'COMPOSITION' && mi.budgetItem.composition) {
            mi.budgetItem.composition.items.forEach(ci => {
              const qty = mi.quantity * ci.quantity;
              const desc = ci.catalogItem.description;
              let entry = reportMap.get(desc);
              if (!entry) {
                entry = { description: desc, orcadoQty: 0, orcadoUnitPrice: ci.catalogItem.unitCost, realizadoQty: 0, realizadoUnitPrice: 0 };
                reportMap.set(desc, entry);
              }
              entry.realizadoQty += qty;
              if (entry.realizadoUnitPrice === 0) entry.realizadoUnitPrice = ci.catalogItem.unitCost;
            });
          } else {
            const desc = mi.budgetItem.description;
            let entry = reportMap.get(desc);
            if (!entry) {
              entry = { description: desc, orcadoQty: 0, orcadoUnitPrice: mi.budgetItem.unitPrice, realizadoQty: 0, realizadoUnitPrice: 0 };
              reportMap.set(desc, entry);
            }
            entry.realizadoQty += mi.quantity;
            if (entry.realizadoUnitPrice === 0) entry.realizadoUnitPrice = mi.budgetItem.unitPrice;
          }
        });
      });

      // 3. Enrich with real financial data (Heuristic matching by description)
      const splits = await prisma.financialEntrySplit.findMany({
        where: { projectId, financialEntry: { status: 'PAID', type: 'EXPENSE' } },
        include: { financialEntry: true }
      });

      splits.forEach(s => {
        const desc = s.financialEntry.description;
        for (const [key, entry] of reportMap.entries()) {
          if (desc.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(desc.toLowerCase())) {
            if (entry.realizadoUnitPrice === 0 || entry.orcadoUnitPrice === 0) {
              entry.realizadoUnitPrice = s.amount / (entry.realizadoQty || 1);
            }
            break;
          }
        }
      });

      const result = Array.from(reportMap.values()).map(item => {
        const orcadoTotal = item.orcadoQty * item.orcadoUnitPrice;
        const realizadoTotal = item.realizadoQty * item.realizadoUnitPrice;
        
        return {
          ...item,
          saldoQty: item.orcadoQty - item.realizadoQty,
          diferencaUnitPrice: item.orcadoUnitPrice - item.realizadoUnitPrice,
          orcadoTotal,
          realizadoTotal,
          diferencaTotal: orcadoTotal - realizadoTotal
        };
      });

      return result;
    }),

  getProjectABCReport: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      mode: z.enum(['budgeted', 'realized']).default('budgeted'),
    }))
    .query(async ({ ctx, input }) => {
      const { prisma, companyId } = ctx;
      const { projectId, mode } = input;

      // Fetch all budget items with compositions
      const budgetItems = await prisma.budgetItem.findMany({
        where: { projectStage: { projectId } },
        include: { 
          composition: { include: { items: { include: { catalogItem: true } } } },
          children: true,
          catalogItem: true
        }
      });

      const reportMap = new Map<string, {
        description: string;
        orcadoQty: number;
        orcadoUnitPrice: number;
        realizadoQty: number;
        realizadoUnitPrice: number;
        type: string;
        group: string;
      }>();

      const getOrAdd = (desc: string, type: string = "-", group: string = "-") => {
        let entry = reportMap.get(desc);
        if (!entry) {
          entry = { description: desc, orcadoQty: 0, orcadoUnitPrice: 0, realizadoQty: 0, realizadoUnitPrice: 0, type, group };
          reportMap.set(desc, entry);
        }
        return entry;
      };

      budgetItems.forEach(item => {
        if ((item.type === 'INPUT' || item.type === 'ITEM') && (!item.children || item.children.length === 0)) {
          const entry = getOrAdd(item.description, item.type, item.catalogItem?.typeCategory || "-");
          entry.orcadoQty += item.quantity;
          if (item.unitPrice > 0) entry.orcadoUnitPrice = item.unitPrice;
        } 
        else if (item.type === 'COMPOSITION' && item.composition) {
          item.composition.items.forEach(ci => {
            const entry = getOrAdd(ci.catalogItem.description, ci.catalogItem.type, ci.catalogItem.typeCategory || "-");
            entry.orcadoQty += item.quantity * ci.quantity;
            if (ci.catalogItem.unitCost > 0) entry.orcadoUnitPrice = ci.catalogItem.unitCost;
          });
        }
      });

      // Fetch Measurements for Realized
      const measurements = await prisma.measurement.findMany({
        where: { projectId, status: 'APPROVED' },
        include: { 
          items: { 
            include: { 
              budgetItem: {
                include: {
                  composition: { include: { items: { include: { catalogItem: true } } } }
                }
              }
            } 
          } 
        }
      });

      measurements.forEach(m => {
        m.items.forEach(mi => {
          if (!mi.budgetItem) return;
          if (mi.budgetItem.type === 'COMPOSITION' && mi.budgetItem.composition) {
            mi.budgetItem.composition.items.forEach(ci => {
              const entry = getOrAdd(ci.catalogItem.description, ci.catalogItem.type, ci.catalogItem.typeCategory || "-");
              entry.realizadoQty += mi.quantity * ci.quantity;
              if (entry.realizadoUnitPrice === 0) entry.realizadoUnitPrice = ci.catalogItem.unitCost;
            });
          } else {
            const entry = getOrAdd(mi.budgetItem.description, mi.budgetItem.type, "-");
            entry.realizadoQty += mi.quantity;
            if (entry.realizadoUnitPrice === 0) entry.realizadoUnitPrice = mi.budgetItem.unitPrice;
          }
        });
      });

      const items = Array.from(reportMap.values()).map(item => ({
        description: item.description,
        type: item.type,
        group: item.group,
        total: mode === 'budgeted' ? (item.orcadoQty * item.orcadoUnitPrice) : (item.realizadoQty * item.realizadoUnitPrice),
        qty: mode === 'budgeted' ? item.orcadoQty : item.realizadoQty,
        unitPrice: mode === 'budgeted' ? item.orcadoUnitPrice : item.realizadoUnitPrice,
      })).filter(i => i.total > 0);

      items.sort((a, b) => b.total - a.total);

      const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

      let cumulativeCost = 0;
      const result = items.map(item => {
        cumulativeCost += item.total;
        const percent = (item.total / grandTotal) * 100;
        const cumulativePercent = (cumulativeCost / grandTotal) * 100;
        
        let classification: 'A' | 'B' | 'C' = 'C';
        if (cumulativePercent <= 80.0001) classification = 'A';
        else if (cumulativePercent <= 95.0001) classification = 'B';
        
        return {
          ...item,
          percent,
          cumulativeCost,
          cumulativePercent,
          classification
        };
      });

      return result;
    }),

  getProjectAreaCostsReport: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      mode: z.enum(['budgeted', 'realized']).default('budgeted'),
    }))
    .query(async ({ ctx, input }) => {
      const { prisma, companyId } = ctx;
      const { projectId, mode } = input;

      const project = await prisma.project.findFirst({
        where: { id: projectId, companyId },
        select: { totalArea: true, areaUnit: true }
      });

      const totalArea = project?.totalArea || 1;
      const areaUnit = project?.areaUnit || 'm';

      // 1. Fetch Stages
      const stages = await prisma.projectStage.findMany({
        where: { projectId },
        include: { 
          budgetItems: { 
            include: { 
              catalogItem: true, 
              composition: { include: { items: { include: { catalogItem: true } } } } 
            } 
          },
          financialSplits: {
            where: { financialEntry: { status: 'PAID', type: 'EXPENSE' } },
            include: { financialEntry: true }
          }
        }
      });

      const items = stages.map(stage => {
        const categories = { labor: 0, material: 0, equipment: 0, others: 0 };
        
        if (mode === 'budgeted') {
          stage.budgetItems.forEach(bi => {
            if (bi.type === 'COMPOSITION' && bi.composition) {
              bi.composition.items.forEach(ci => {
                const cost = bi.quantity * ci.quantity * ci.catalogItem.unitCost;
                const type = ci.catalogItem.type;
                if (type === 'LABOR') categories.labor += cost;
                else if (type === 'MATERIAL') categories.material += cost;
                else if (type === 'EQUIPMENT') categories.equipment += cost;
                else categories.others += cost;
              });
            } else if (bi.type === 'INPUT' || bi.type === 'ITEM') {
              const type = bi.catalogItem?.type || 'MATERIAL';
              if (type === 'LABOR') categories.labor += bi.total;
              else if (type === 'MATERIAL') categories.material += bi.total;
              else if (type === 'EQUIPMENT') categories.equipment += bi.total;
              else categories.others += bi.total;
            }
          });
        } else {
          stage.financialSplits.forEach(split => {
            categories.others += split.amount;
          });
        }
        
        const total = categories.labor + categories.material + categories.equipment + categories.others;
        
        return {
          id: stage.id,
          name: stage.name,
          labor: categories.labor,
          material: categories.material,
          equipment: categories.equipment,
          others: categories.others,
          total,
          areaCost: total / totalArea
        };
      });

      // Handle Unallocated (Outros) for Realized
      let unallocated = { name: "Outros", labor: 0, material: 0, equipment: 0, others: 0, total: 0, areaCost: 0 };
      if (mode === 'realized') {
        const unallocatedSplits = await prisma.financialEntrySplit.findMany({
          where: { projectId, projectStageId: null, financialEntry: { status: 'PAID', type: 'EXPENSE' } }
        });
        unallocated.others = unallocatedSplits.reduce((sum, s) => sum + s.amount, 0);
        unallocated.total = unallocated.others;
        unallocated.areaCost = unallocated.total / totalArea;
      }

      const grandTotal = items.reduce((sum, item) => sum + item.total, 0) + unallocated.total;

      return {
        items: items.map(i => ({ ...i, percent: grandTotal > 0 ? (i.total / grandTotal) * 100 : 0 })),
        unallocated: { ...unallocated, percent: grandTotal > 0 ? (unallocated.total / grandTotal) * 100 : 0 },
        totalArea,
        areaUnit,
        grandTotal
      };
    }),

  getProjectCategoryCostsReport: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { prisma, companyId } = ctx;
      const { projectId } = input;

      const project = await prisma.project.findFirst({
        where: { id: projectId, companyId },
        select: { totalArea: true, areaUnit: true }
      });

      const totalArea = project?.totalArea || 1;
      const areaUnit = project?.areaUnit || 'm';

      const splits = await prisma.financialEntrySplit.findMany({
        where: { projectId, financialEntry: { status: 'PAID', type: 'EXPENSE' } },
        include: { financialEntry: true }
      });

      const categoryMap = new Map<string, {
        category: string;
        group: string;
        total: number;
      }>();

      splits.forEach(s => {
        const category = s.financialEntry.description;
        const desc = category.toLowerCase();
        
        let group = "Outros";
        if (desc.includes("mão de obra") || desc.includes("salário") || desc.includes("pro labore") || desc.includes("vale alimentação")) {
          if (desc.includes("terceirizada")) group = "Mão de Obra (Terceirizada)";
          else if (desc.includes("salário") || desc.includes("pro labore")) group = "Mão de Obra (Salários)";
          else group = "Mão de Obra (Encargos)";
        } else if (desc.includes("combustível") || desc.includes("manutenção") || desc.includes("equipamento")) {
          group = "Equipamentos";
        } else if (desc.includes("material") || desc.includes("compra")) {
          group = "Materiais";
        }

        const entry = categoryMap.get(category) || { category, group, total: 0 };
        entry.total += s.amount;
        categoryMap.set(category, entry);
      });

      const items = Array.from(categoryMap.values());
      const grandTotal = items.reduce((sum, i) => sum + i.total, 0);

      const result = items.map(item => ({
        ...item,
        areaCost: item.total / totalArea,
        percent: grandTotal > 0 ? (item.total / grandTotal) * 100 : 0
      }));

      result.sort((a, b) => b.total - a.total);

      return {
        items: result,
        grandTotal,
        areaUnit,
        totalArea
      };
    }),

  getProjectFinancialResultReport: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { prisma, companyId } = ctx;
      const { projectId } = input;

      const project = await prisma.project.findFirst({
        where: { id: projectId, companyId },
        include: { 
          stages: {
            include: {
              budgetItems: {
                include: { catalogItem: true, composition: { include: { items: { include: { catalogItem: true } } } } }
              }
            }
          }
        }
      });

      if (!project) throw new Error("Project not found");

      // 1. Incomes
      const orcadoReceitas = project.budget;
      const realizedReceitas = await prisma.financialEntry.aggregate({
        where: { projectId, type: 'INCOME', status: 'PAID' },
        _sum: { amount: true }
      });
      const realReceitas = realizedReceitas._sum.amount || 0;

      // 2. Expenses
      let orcadoDespesas = 0;
      const orcadoCategories = { labor: 0, material: 0, equipment: 0, others: 0 };
      
      project.stages.forEach(stage => {
        stage.budgetItems.forEach(bi => {
          orcadoDespesas += bi.total;
          if (bi.type === 'COMPOSITION' && bi.composition) {
            bi.composition.items.forEach(ci => {
              const cost = bi.quantity * ci.quantity * ci.catalogItem.unitCost;
              const type = ci.catalogItem.type;
              if (type === 'LABOR') orcadoCategories.labor += cost;
              else if (type === 'MATERIAL') orcadoCategories.material += cost;
              else if (type === 'EQUIPMENT') orcadoCategories.equipment += cost;
              else orcadoCategories.others += cost;
            });
          } else {
            const type = bi.catalogItem?.type || 'MATERIAL';
            if (type === 'LABOR') orcadoCategories.labor += bi.total;
            else if (type === 'MATERIAL') orcadoCategories.material += bi.total;
            else if (type === 'EQUIPMENT') orcadoCategories.equipment += bi.total;
            else orcadoCategories.others += bi.total;
          }
        });
      });

      const realizedExpenses = await prisma.financialEntrySplit.findMany({
        where: { projectId, financialEntry: { status: 'PAID', type: 'EXPENSE' } },
        include: { financialEntry: true }
      });
      
      const realDespesas = realizedExpenses.reduce((sum, s) => sum + s.amount, 0);
      const realCategories = { labor: 0, material: 0, equipment: 0, others: 0 };
      
      realizedExpenses.forEach(s => {
        const desc = s.financialEntry.description.toLowerCase();
        if (desc.includes("mão de obra") || desc.includes("salário")) realCategories.labor += s.amount;
        else if (desc.includes("material") || desc.includes("compra")) realCategories.material += s.amount;
        else if (desc.includes("equipamento") || desc.includes("combustível")) realCategories.equipment += s.amount;
        else realCategories.others += s.amount;
      });

      // 3. Stock Transfers
      const movements = await prisma.stockMovement.findMany({
        where: { projectStage: { projectId } }
      });
      
      const estoqueDebito = movements.filter(m => m.type === 'EXIT').reduce((sum, m) => sum + (m.quantity * m.unitCost), 0);
      const estoqueCredito = movements.filter(m => m.type === 'ENTRY').reduce((sum, m) => sum + (m.quantity * m.unitCost), 0);
      const estoqueNet = estoqueCredito - estoqueDebito;

      // 4. Summary
      const orcadoResult = orcadoReceitas - orcadoDespesas;
      const realResult = realReceitas - realDespesas + estoqueNet;

      return {
        table: [
          { name: "Receitas", orcado: orcadoReceitas, realized: realReceitas },
          { name: "Despesas", orcado: orcadoDespesas, realized: realDespesas },
          { name: "Mão de Obra", orcado: orcadoCategories.labor, realized: realCategories.labor, isSub: true },
          { name: "Material", orcado: orcadoCategories.material, realized: realCategories.material, isSub: true },
          { name: "Equipamento", orcado: orcadoCategories.equipment, realized: realCategories.equipment, isSub: true },
          { name: "Outros", orcado: orcadoCategories.others, realized: realCategories.others, isSub: true },
          { name: "Compra de Terreno", orcado: 0, realized: 0 },
          { name: "Transferências de Estoque", orcado: 0, realized: estoqueNet },
          { name: "Crédito", orcado: 0, realized: estoqueCredito, isSub: true },
          { name: "Débito", orcado: 0, realized: -estoqueDebito, isSub: true },
          { name: "Resultado", orcado: orcadoResult, realized: realResult, isTotal: true },
        ],
        chart: [
          { name: "Receitas", orcado: orcadoReceitas, realized: realReceitas },
          { name: "Despesas", orcado: -orcadoDespesas, realized: -realDespesas },
          { name: "Compra de Terreno", orcado: 0, realized: 0 },
          { name: "Estoque", orcado: 0, realized: estoqueNet },
          { name: "Resultados", orcado: orcadoResult, realized: realResult },
        ]
      };
    })
});
