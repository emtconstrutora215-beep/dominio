import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

// Helper recursivo para recalcular totais de baixo para cima
async function rollupBudgetItem(prisma: any, itemId: string) {
  const item = await prisma.budgetItem.findUnique({
    where: { id: itemId },
    include: { children: true }
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
  }
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
      return ctx.prisma.budget.upsert({
        where: { projectId: input.projectId },
        update: { bdi: input.bdi },
        create: { projectId: input.projectId, bdi: input.bdi }
      });
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
    }))
    .mutation(async ({ ctx, input }) => {
      // Atualiza o código na obra se fornecido
      if (input.code) {
        await ctx.prisma.project.update({
          where: { id: input.projectId },
          data: { code: input.code }
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
      name: z.string().min(1)
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.projectStage.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          plannedCost: 0,
          actualCost: 0,
          percentageComplete: 0
        }
      });
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
        }
      });

      if (newItem.parentId) {
        await rollupBudgetItem(ctx.prisma, newItem.parentId);
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
        data
      });

      // Se o total mudou ou o item tem pai, precisamos rodar o rollup
      if (updated.parentId) {
        await rollupBudgetItem(ctx.prisma, updated.parentId);
      }

      return updated;
    }),

  deleteBudgetItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.budgetItem.findUnique({ where: { id: input.id } });
      
      const deleted = await ctx.prisma.budgetItem.delete({
        where: { id: input.id }
      });

      if (item?.parentId) {
        await rollupBudgetItem(ctx.prisma, item.parentId);
      }

      return deleted;
    }),

  deleteStage: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.projectStage.delete({
        where: { id: input.id }
      });
    }),
});

