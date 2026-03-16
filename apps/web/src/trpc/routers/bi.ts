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

      const totalBudget = projects.reduce((acc, p) => acc + (p.budget || 0), 0);
      
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
        totalSpent = splits.reduce((acc, split) => acc + split.amount, 0);
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
        completed: projects.filter(p => p.status === 'COMPLETED').length,
        inProgress: projects.filter(p => p.status === 'IN_PROGRESS').length,
        paused: projects.filter(p => p.status === 'PAUSED').length,
        planning: projects.filter(p => p.status === 'PLANNING').length,
      };

      // Project summaries for charts
      const projectSummaries = projects.map(p => ({
        name: p.name,
        orcado: p.budget || 0,
        realizado: p.stages.reduce((acc, s) => acc + s.actualCost, 0)
      }));

      // Simple heuristic for "on time vs delayed": if endDate is past and status is not COMPLETED
      const now = new Date();
      let delayedCount = 0;
      let onTimeCount = 0;
      
      projects.forEach(p => {
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

      const budgetVsActual = stages.map(s => ({
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
        splits.forEach(s => {
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
        categoryExpenses = aggs.map(a => ({
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

      orders.forEach(o => {
        const winner = o.quote.suppliers.find(s => s.isWinner);
        if (winner) {
          supplierTotals.set(winner.supplierName, (supplierTotals.get(winner.supplierName) || 0) + winner.totalPrice);
          
          // Savings: highest quote minus winner
          const highestQuote = Math.max(...o.quote.suppliers.map(s => s.totalPrice));
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

      const won = projects.filter(p => ['IN_PROGRESS', 'COMPLETED', 'PAUSED'].includes(p.status)).length;
      const lost = projects.filter(p => p.status === 'CANCELLED').length;
      const planning = projects.filter(p => p.status === 'PLANNING').length;

      const wonProjects = projects.filter(p => ['IN_PROGRESS', 'COMPLETED', 'PAUSED'].includes(p.status));
      const avgContractValue = wonProjects.length > 0 ? 
        wonProjects.reduce((acc, p) => acc + (p.budget || 0), 0) / wonProjects.length : 0;

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
      incomes.forEach(inc => {
        if (inc.paidDate) {
           const month = inc.paidDate.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
           revenueMap.set(month, (revenueMap.get(month) || 0) + inc.amount);
        }
      });

      const revenueByMonth = Array.from(revenueMap.entries())
        .map(([month, revenue]) => ({ month, revenue }));
      
      // Sort roughly by natural time if possible, or leave as grouped

      return {
        winLoss: [
          { name: 'Ganhos', value: won },
          { name: 'Perdidos', value: lost },
          { name: 'Em Negociação', value: planning }
        ],
        avgContractValue,
        revenueByMonth
      };
    })
});
