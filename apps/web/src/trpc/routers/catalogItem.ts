import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const catalogItemRouter = router({
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(100).default(15),
      search: z.string().optional(),
      base: z.string().optional(),
      type: z.enum(['MATERIAL', 'LABOR', 'EQUIPMENT', 'SERVICE']).optional(),
      typeCategory: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.perPage;
      const whereClause: any = {
        companyId: ctx.companyId!,
      };

      if (input.search) {
        whereClause.OR = [
          { description: { contains: input.search, mode: 'insensitive' as const } },
          { code: { contains: input.search, mode: 'insensitive' as const } }
        ];
      }

      if (input.base && input.base !== 'Todas') {
        whereClause.base = input.base;
      }

      if (input.type) {
        whereClause.type = input.type;
      }

      if (input.typeCategory && input.typeCategory !== 'Todas') {
        whereClause.typeCategory = input.typeCategory;
      }

      if (typeof input.isActive === 'boolean') {
        whereClause.isActive = input.isActive;
      }

      const [items, totalCount] = await Promise.all([
        ctx.prisma.catalogItem.findMany({
          where: whereClause,
          skip,
          take: input.perPage,
          orderBy: { code: 'asc' },
        }),
        ctx.prisma.catalogItem.count({ where: whereClause })
      ]);

      return {
        items,
        totalCount,
        totalPages: Math.ceil(totalCount / input.perPage)
      };
    }),

  getFilterOptions: protectedProcedure.query(async ({ ctx }) => {
    const [bases, categories] = await Promise.all([
      ctx.prisma.catalogItem.findMany({
        where: { companyId: ctx.companyId!, base: { not: null } },
        select: { base: true },
        distinct: ['base']
      }),
      ctx.prisma.catalogItem.findMany({
        where: { companyId: ctx.companyId!, typeCategory: { not: null } },
        select: { typeCategory: true },
        distinct: ['typeCategory']
      })
    ]);

    return {
      bases: bases.map(b => b.base).filter(Boolean) as string[],
      categories: categories.map(c => c.typeCategory).filter(Boolean) as string[]
    };
  }),

  listAll: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.prisma.catalogItem.findMany({
        where: { companyId: ctx.companyId!, isActive: true },
        orderBy: { description: 'asc' },
      });
    }),

  create: protectedProcedure
    .input(z.object({
      code: z.string().optional(),
      description: z.string().min(1, 'A descrição é obrigatória'),
      unit: z.string().min(1, 'A unidade é obrigatória'),
      type: z.enum(['MATERIAL', 'LABOR', 'EQUIPMENT', 'SERVICE']),
      typeCategory: z.string().optional(),
      base: z.string().optional(),
      salary: z.number().optional(),
      charges: z.number().optional(),
      benefits: z.number().optional(),
      unitCost: z.number().min(0).default(0),
      observations: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      let finalCode = input.code;

      if (!finalCode) {
        // Logica de numeracao sequencial
        const lastItem = await ctx.prisma.catalogItem.findFirst({
          where: { companyId: ctx.companyId!, code: { not: null } },
          orderBy: { code: 'desc' },
        });

        let nextNum = 1;
        if (lastItem?.code) {
          const matched = lastItem.code.match(/\d+/);
          if (matched) {
            nextNum = parseInt(matched[0], 10) + 1;
          }
        }
        finalCode = nextNum.toString().padStart(4, '0');
      }

      // Verificar duplicidade
      const existing = await ctx.prisma.catalogItem.findFirst({
        where: { code: finalCode, companyId: ctx.companyId! }
      });
      if (existing) {
        let attempt = 1;
        while(true) {
            const collision = await ctx.prisma.catalogItem.findFirst({
                where: { code: finalCode, companyId: ctx.companyId! }
            });
            if (!collision) break;
            
            const num: number = parseInt(finalCode || "0", 10) + 1;
            finalCode = num.toString().padStart(4, '0');
            attempt++;
            if (attempt > 10) break;
        }
      }

      return ctx.prisma.catalogItem.create({
        data: {
          code: finalCode,
          description: input.description,
          unit: input.unit,
          type: input.type,
          typeCategory: input.typeCategory || null,
          base: input.base || null,
          salary: input.salary || null,
          charges: input.charges || null,
          benefits: input.benefits || null,
          unitCost: input.unitCost,
          observations: input.observations || null,
          companyId: ctx.companyId!,
          isActive: true
        }
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      code: z.string().optional(),
      description: z.string().min(1),
      unit: z.string().min(1),
      type: z.enum(['MATERIAL', 'LABOR', 'EQUIPMENT', 'SERVICE']),
      typeCategory: z.string().optional(),
      base: z.string().optional(),
      unitCost: z.number(),
      isActive: z.boolean(),
      observations: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.catalogItem.update({
        where: { id, companyId: ctx.companyId! },
        data: {
          ...data,
          typeCategory: data.typeCategory || null,
          base: data.base || null,
          observations: data.observations || null,
        }
      });
    }),

  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.catalogItem.delete({
        where: { id: input, companyId: ctx.companyId! }
      });
    })
});
