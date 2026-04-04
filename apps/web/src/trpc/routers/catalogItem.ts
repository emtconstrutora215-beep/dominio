import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const catalogItemRouter = router({
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(100).default(15),
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
        ctx.prisma.catalogItem.findMany({
          where: whereClause,
          skip,
          take: input.perPage,
          orderBy: { description: 'asc' },
        }),
        ctx.prisma.catalogItem.count({ where: whereClause })
      ]);

      return {
        items,
        totalCount,
        totalPages: Math.ceil(totalCount / input.perPage)
      };
    }),

  listAll: protectedProcedure.query(async ({ ctx }) => {
    // Para selects rápidos (limite de 1000 para não travar navegador)
    return ctx.prisma.catalogItem.findMany({
      where: { companyId: ctx.companyId! },
      orderBy: { description: 'asc' },
      take: 1000,
    });
  }),

  listAllTypes: protectedProcedure.query(async ({ ctx }) => {
    // Buscar categorias unicas
    const results = await ctx.prisma.catalogItem.findMany({
      where: { companyId: ctx.companyId!, typeCategory: { not: null } },
      select: { typeCategory: true },
      distinct: ['typeCategory']
    });
    return results.map((r: any) => r.typeCategory).filter(Boolean);
  }),

  create: protectedProcedure
    .input(z.object({
      code: z.string().optional(),
      description: z.string().min(1, 'A descrição é obrigatória'),
      unit: z.string().min(1, 'A unidade é obrigatória'),
      type: z.enum(['MATERIAL', 'LABOR', 'EQUIPMENT', 'SERVICE']), // DB Enum (no UI=Grupo)
      typeCategory: z.string().optional(), // No UI = Tipo
      base: z.string().optional(),
      salary: z.number().optional(),
      charges: z.number().optional(),
      benefits: z.number().optional(),
      unitCost: z.number().min(0).default(0), // No UI = Custo ou Calculado
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.code) {
        const existing = await ctx.prisma.catalogItem.findFirst({
          where: { code: input.code, companyId: ctx.companyId! }
        });
        if (existing) {
          throw new Error('Um insumo com este código já existe.');
        }
      }

      return ctx.prisma.catalogItem.create({
        data: {
          code: input.code || null,
          description: input.description,
          unit: input.unit,
          type: input.type,
          typeCategory: input.typeCategory || null,
          base: input.base || null,
          salary: input.salary || null,
          charges: input.charges || null,
          benefits: input.benefits || null,
          unitCost: input.unitCost,
          companyId: ctx.companyId!,
        }
      });
    })
});
