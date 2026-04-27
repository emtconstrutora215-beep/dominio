import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

// Helper recursivo para recalcular totais de baixo para cima
async function rollupBudgetItem(prisma: any, itemId: string) {
  const item = await prisma.budgetItem.findUnique({
    where: { id: itemId },
    include: { 
      children: true,
      projectStage: true 
    }
  });

  if (!item) return;

  // Se for um nó pai (Etapa, Subetapa, Item com composições), seu custo total é a soma dos filhos
  if (item.children.length > 0) {
    const childrenTotal = item.children.reduce((acc: number, child: any) => acc + child.total, 0);
    
    await prisma.budgetItem.update({
      where: { id: itemId },
      data: { 
        unitPrice: item.quantity > 0 ? childrenTotal / item.quantity : 0,
        total: childrenTotal 
      }
    });
  }

  // Recurse para o pai
  if (item.parentId) {
    await rollupBudgetItem(prisma, item.parentId);
  } else {
    // Se chegou na raiz de uma etapa, recalcula o total da etapa e do projeto
    await recalculateProjectTotals(prisma, item.projectStage.projectId);
  }
}

// Helper para recalcular totais do projeto (Preço e Custo)
export async function recalculateProjectTotals(prisma: any, projectId: string) {
  const stages = await prisma.projectStage.findMany({
    where: { projectId },
    include: {
      budgetItems: {
        where: { parentId: null }
      }
    }
  });

  // Buscar configuração de orçamento para BDI Global
  const budget = await prisma.budget.findUnique({
    where: { projectId }
  });
  const globalBdi = budget?.bdi || 0;

  let projectTotalCost = 0;
  let projectTotalPrice = 0;

  for (const stage of stages) {

    const stageCost = stage.budgetItems.reduce((acc: number, item: any) => acc + item.total, 0);
    const stagePrice = stage.budgetItems.reduce((acc: number, item: any) => {
      // Hierarquia: BDI do Item -> BDI da Etapa -> BDI Global
      const bdi = item.bdi || stage.bdi || globalBdi;
      return acc + (item.total * (1 + bdi / 100));
    }, 0);

    // Atualiza o stage
    await prisma.projectStage.update({
      where: { id: stage.id },
      data: { plannedCost: stageCost }
    });

    projectTotalCost += stageCost;
    projectTotalPrice += stagePrice;
  }


  // Buscar info do projeto para aplicar desconto global
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { discountValue: true, discountType: true }
  });

  let finalBudget = projectTotalPrice;
  if (project?.discountValue) {
    if (project.discountType === 'PERCENTAGE') {
      finalBudget = projectTotalPrice * (1 - project.discountValue / 100);
    } else {
      finalBudget = Math.max(0, projectTotalPrice - project.discountValue);
    }
  }

  // Atualiza o projeto
  await prisma.project.update({
    where: { id: projectId },
    data: {
      totalCost: projectTotalCost,
      budget: finalBudget
    }
  });

  // Garantir que existe um registro Budget para visibilidade na lista
  await prisma.budget.upsert({
    where: { projectId },
    update: {},
    create: {
      projectId,
      bdi: 0
    }
  });


}

export const budgetRouter = router({
  getBudgetParams: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const budget = await ctx.prisma.budget.findUnique({
        where: { projectId: input.projectId }
      });
      return budget;
    }),

  updateBDI: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      bdi: z.number()
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.budget.upsert({
        where: { projectId: input.projectId },
        update: { bdi: input.bdi },
        create: { projectId: input.projectId, bdi: input.bdi }
      });

      // Recalcular totais para refletir o novo BDI na lista de obras
      await recalculateProjectTotals(ctx.prisma, input.projectId);

      return result;

    }),

  getProjectBudget: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const budget = await ctx.prisma.budget.findUnique({
        where: { projectId: input.projectId }
      });

      const stages = await ctx.prisma.projectStage.findMany({
        where: { projectId: input.projectId },
        include: {
          budgetItems: {
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      // Construção da árvore em memória para cada etapa
      const stagesWithTree = stages.map(stage => {
        const itemMap = new Map();
        stage.budgetItems.forEach(item => {
          itemMap.set(item.id, { ...item, children: [] });
        });

        const rootItems: any[] = [];
        stage.budgetItems.forEach(item => {
          const node = itemMap.get(item.id);
          if (item.parentId && itemMap.has(item.parentId)) {
            itemMap.get(item.parentId).children.push(node);
          } else {
            rootItems.push(node);
          }
        });

        return {
          ...stage,
          budgetItems: rootItems
        };
      });

      return { stages: stagesWithTree, budget };
    }),

  createBudget: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      code: z.string().optional(),
      status: z.enum(['BUDGETING', 'PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Atualiza o código na obra se fornecido
      if (input.code || input.status) {
        await ctx.prisma.project.update({
          where: { id: input.projectId },
          data: { 
            code: input.code,
            status: input.status
          }
        });
      }

      // Cria a configuração de orçamento se não existir
      return ctx.prisma.budget.upsert({
        where: { projectId: input.projectId },
        update: {},
        create: {
          projectId: input.projectId,
          bdi: 0
        }
      });
    }),

  addStage: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1),
      bdi: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const stage = await ctx.prisma.projectStage.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          bdi: input.bdi ?? 0,
          plannedCost: 0,
          actualCost: 0,
          percentageComplete: 0
        }
      });
      await recalculateProjectTotals(ctx.prisma, input.projectId);
      return stage;
    }),

  updateStage: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      bdi: z.number().optional(),
      propagateBdi: z.boolean().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, propagateBdi, ...data } = input;
      
      const updated = await ctx.prisma.projectStage.update({
        where: { id },
        data
      });

      if (propagateBdi && typeof input.bdi === 'number') {
        const stageBdi = input.bdi;
        // Atualiza todos os itens do orçamento vinculados a esta etapa
        await ctx.prisma.budgetItem.updateMany({
          where: { projectStageId: id },
          data: { bdi: stageBdi }
        });
      }

      await recalculateProjectTotals(ctx.prisma, updated.projectId);
      return updated;
    }),

  addBudgetItem: protectedProcedure
    .input(z.object({
      projectStageId: z.string(),
      parentId: z.string().optional(),
      description: z.string().min(1),
      type: z.enum(['STAGE', 'SUB_STAGE', 'ITEM', 'COMPOSITION', 'INPUT']).default('ITEM'),
      unit: z.string().default('UN'),
      quantity: z.number().default(1),
      unitPrice: z.number().default(0),
      bdi: z.number().optional(),
      order: z.number().default(0),
      catalogItemId: z.string().optional(),
      compositionId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const total = input.quantity * input.unitPrice;
      
      const newItem = await ctx.prisma.budgetItem.create({
        data: {
          projectStageId: input.projectStageId,
          parentId: input.parentId,
          description: input.description,
          type: input.type,
          unit: input.unit,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          bdi: input.bdi ?? 0,
          total: total,
          order: input.order,
          catalogItemId: input.catalogItemId,
          compositionId: input.compositionId,
        },
        include: { projectStage: true }
      });

      if (newItem.parentId) {
        await rollupBudgetItem(ctx.prisma, newItem.parentId);
      } else {
        await recalculateProjectTotals(ctx.prisma, newItem.projectStage.projectId);
      }

      return newItem;
    }),

  updateBudgetItem: protectedProcedure
    .input(z.object({
      id: z.string(),
      description: z.string().optional(),
      unit: z.string().optional(),
      quantity: z.number().optional(),
      unitPrice: z.number().optional(),
      bdi: z.number().optional(),
      order: z.number().optional(),
      type: z.enum(['STAGE', 'SUB_STAGE', 'ITEM', 'COMPOSITION', 'INPUT']).optional(),
      propagateBdi: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      
      const current = await ctx.prisma.budgetItem.findUnique({ 
        where: { id },
        include: { children: true }
      });

      if (!current) throw new Error("Item não encontrado");

      // Se for um item folha (sem filhos), calculamos o total baseado em Qtd * Preço
      if (current.children.length === 0) {
        const q = data.quantity ?? current.quantity;
        const p = data.unitPrice ?? current.unitPrice;
        (data as any).total = q * p;
      }

      const updated = await ctx.prisma.budgetItem.update({
        where: { id },
        data: {
          ...data,
          propagateBdi: undefined // Remove do prisma update
        } as any,
        include: { projectStage: true }
      });

      if (input.propagateBdi && typeof input.bdi === 'number') {
        const targetBdi = input.bdi;
        
        // Função auxiliar para atualização recursiva (caso existam múltiplos níveis de sub-etapas)
        const updateChildrenRecursively = async (parentId: string) => {
          const children = await ctx.prisma.budgetItem.findMany({ where: { parentId } });
          for (const child of children) {
            await ctx.prisma.budgetItem.update({
              where: { id: child.id },
              data: { bdi: targetBdi }
            });
            await updateChildrenRecursively(child.id);
          }
        };

        await updateChildrenRecursively(id);
      }

      // Se o total mudou ou o item tem pai, precisamos rodar o rollup
      if (updated.parentId) {
        await rollupBudgetItem(ctx.prisma, updated.parentId);
      } else {
        await recalculateProjectTotals(ctx.prisma, updated.projectStage.projectId);
      }

      return updated;
    }),

  deleteBudgetItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.budgetItem.findUnique({ 
        where: { id: input.id },
        include: { projectStage: true }
      });
      
      const deleted = await ctx.prisma.budgetItem.delete({
        where: { id: input.id }
      });

      if (item?.parentId) {
        await rollupBudgetItem(ctx.prisma, item.parentId);
      } else if (item) {
        await recalculateProjectTotals(ctx.prisma, item.projectStage.projectId);
      }

      return deleted;
    }),

  deleteStage: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const stage = await ctx.prisma.projectStage.findUnique({
        where: { id: input.id }
      });
      
      const deleted = await ctx.prisma.projectStage.delete({
        where: { id: input.id }
      });

      if (stage) {
        await recalculateProjectTotals(ctx.prisma, stage.projectId);
      }

      return deleted;
    }),

  getBudgetReports: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { projectId } = input;

      // Buscar todos os itens do orçamento com seus tipos de catálogo
      const budgetItems = await ctx.prisma.budgetItem.findMany({
        where: { projectStage: { projectId } },
        include: {
          catalogItem: true,
          projectStage: true,
          children: true,
        },
      });

      const projectGroups = await ctx.prisma.projectStage.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' }
      });

      // 1. Relatório por Etapa
      const stageReport = projectGroups.map((stage: any) => {
        const stageItems = budgetItems.filter((item: any) => item.projectStageId === stage.id);
        
        let labor = 0;
        let material = 0;
        let equipment = 0;
        let others = 0;

        // Função recursiva para somar apenas as folhas (insumos)
        const processItem = (item: any) => {
          if (item.children && item.children.length > 0) {
            // Se tem filhos, não somamos o total dele (pois o total dele é a soma dos filhos)
            // mas processamos os filhos que já estão no nosso budgetItems (flattened)
            return;
          }

          const total = item.total || 0;
          const type = item.catalogItem?.type;

          if (type === 'LABOR') labor += total;
          else if (type === 'MATERIAL') material += total;
          else if (type === 'EQUIPMENT') equipment += total;
          else others += total;
        };

        stageItems.forEach(processItem);

        const totalCost = labor + material + equipment + others;

        return {
          id: stage.id,
          name: stage.name,
          labor,
          material,
          equipment,
          others,
          totalCost,
        };
      });

      // 2. Curva ABC (apenas insumos/folhas)
      const allInputs = budgetItems
        .filter((item: any) => !item.children || item.children.length === 0)
        .map((item: any) => ({
          id: item.id,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          type: item.catalogItem?.type || 'OUTROS',
          group: item.catalogItem?.typeCategory || 'Geral',
        }))
        .sort((a: any, b: any) => b.total - a.total);

      const totalValue = allInputs.reduce((acc: number, item: any) => acc + item.total, 0);
      let accumulatedAmount = 0;

      const abcCurve = allInputs.map((item: any) => {
        accumulatedAmount += item.total;
        const percentage = totalValue > 0 ? (item.total / totalValue) * 100 : 0;
        const accumulatedPercentage = totalValue > 0 ? (accumulatedAmount / totalValue) * 100 : 0;

        return {
          ...item,
          percentage,
          accumulatedAmount,
          accumulatedPercentage,
        };
      });

      return {
        stageReport,
        abcCurve,
        totalValue,
      };
    }),
});

