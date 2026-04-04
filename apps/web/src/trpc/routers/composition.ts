import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const compositionRouter = router({
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(100).default(10),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.perPage;
      const whereClause = {
        companyId: ctx.companyId!,
        ...(input.search ? {
          OR: [
            { description: { contains: input.search, mode: 'insensitive' as const } },
            { code: { contains: input.search, mode: 'insensitive' as const } }
          ]
        } : {})
      };

      const [items, totalCount] = await Promise.all([
        ctx.prisma.composition.findMany({
          where: whereClause,
          skip,
          take: input.perPage,
          orderBy: { description: 'asc' },
          include: {
            // Relacionamento aninhado para podermos calcular o custo em tempo real também
            items: {
              include: {
                catalogItem: true
              }
            }
          }
        }),
        ctx.prisma.composition.count({ where: whereClause })
      ]);

      // Calculador de Custo Unitário em Tempo Real
      const processedItems = items.map((comp: any) => {
        const computedCost = comp.items.reduce((acc: number, currentItem: any) => {
          return acc + ((currentItem.quantity || 0) * (currentItem.catalogItem?.unitCost || 0));
        }, 0);
        return {
          ...comp,
          computedCost
        };
      });

      return {
        items: processedItems,
        totalCount,
        totalPages: Math.ceil(totalCount / input.perPage)
      };
    }),

  create: protectedProcedure
    .input(z.object({
      code: z.string().optional(),
      description: z.string().min(1, 'A descrição é obrigatória'),
      unit: z.string().min(1, 'A unidade é obrigatória'),
      items: z.array(z.object({
        catalogItemId: z.string(),
        quantity: z.number().min(0.000001, 'Positivo'),
      })).min(1, 'Adicione pelo menos um insumo à composição')
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.code) {
        const existing = await ctx.prisma.composition.findFirst({
          where: { code: input.code, companyId: ctx.companyId! }
        });
        if (existing) {
          throw new Error('Uma composição com este código já existe.');
        }
      }

      // Utilizando transação para evitar órfãos
      return ctx.prisma.$transaction(async (tx) => {
        const composition = await tx.composition.create({
          data: {
            code: input.code || null,
            description: input.description,
            unit: input.unit,
            companyId: ctx.companyId!,
            items: {
              create: input.items.map(item => ({
                catalogItemId: item.catalogItemId,
                quantity: item.quantity
              }))
            }
          }
        });
        return composition;
      });
    })
});
