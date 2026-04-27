import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const compositionRouter = router({
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(100).default(10),
      search: z.string().optional(),
      base: z.string().optional(),
      type: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.perPage;
      const whereClause: any = {
        companyId: ctx.companyId!,
      };

      if (input.isActive !== undefined) {
        whereClause.isActive = input.isActive;
      }

      if (input.base && input.base !== "Todas") {
        whereClause.base = input.base;
      }

      if (input.type && input.type !== "Todas") {
        whereClause.type = input.type;
      }

      if (input.search) {
        whereClause.OR = [
          { description: { contains: input.search, mode: 'insensitive' as const } },
          { code: { contains: input.search, mode: 'insensitive' as const } }
        ];
      }

      const [items, totalCount] = await Promise.all([
        ctx.prisma.composition.findMany({
          where: whereClause,
          skip,
          take: input.perPage,
          orderBy: { description: 'asc' },
          include: {
            items: {
              include: {
                catalogItem: true,
                childComposition: {
                  include: {
                    items: {
                      include: {
                        catalogItem: true,
                        childComposition: {
                          include: {
                            items: {
                              include: {
                                catalogItem: true
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }),
        ctx.prisma.composition.count({ where: whereClause })
      ]);

      // Função para calcular custo de forma recursiva (reutilizada)
      const getCompCost = (comp: any): number => {
        if (!comp.items || comp.items.length === 0) {
          return (comp.laborCost || 0) + (comp.materialCost || 0) + (comp.equipmentCost || 0) + (comp.serviceCost || 0);
        }
        return comp.items.reduce((acc: number, item: any) => {
          const unitPrice = item.catalogItemId 
            ? (item.catalogItem?.unitCost || 0)
            : (item.childComposition ? getCompCost(item.childComposition) : 0);
          return acc + (item.quantity * unitPrice);
        }, 0);
      };

      const processedItems = items.map((comp: any) => ({
        ...comp,
        computedCost: getCompCost(comp)
      }));

      return {
        items: processedItems,
        totalCount,
        totalPages: Math.ceil(totalCount / input.perPage)
      };
    }),

  get: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const composition = await ctx.prisma.composition.findUnique({
        where: { id: input, companyId: ctx.companyId! },
        include: {
          items: {
            include: {
              catalogItem: true,
              childComposition: {
                include: {
                  items: {
                    include: {
                      catalogItem: true,
                      childComposition: {
                        include: {
                          items: {
                            include: {
                              catalogItem: true
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!composition) {
        throw new Error('Composição não encontrada');
      }

      // Função para calcular custo de forma recursiva
      const getCompCost = (comp: any): number => {
        if (!comp.items || comp.items.length === 0) {
          return (comp.laborCost || 0) + (comp.materialCost || 0) + (comp.equipmentCost || 0) + (comp.serviceCost || 0);
        }
        return comp.items.reduce((acc: number, item: any) => {
          const unitPrice = item.catalogItemId 
            ? (item.catalogItem?.unitCost || 0)
            : (item.childComposition ? getCompCost(item.childComposition) : 0);
          return acc + (item.quantity * unitPrice);
        }, 0);
      };

      return {
        ...composition,
        computedCost: getCompCost(composition)
      };
    }),

  create: protectedProcedure
    .input(z.object({
      code: z.string().optional().nullable(),
      description: z.string().min(1, 'A descrição é obrigatória'),
      unit: z.string().min(1, 'A unidade é obrigatória'),
      type: z.string().optional().nullable(),
      base: z.string().optional().nullable(),
      isActive: z.boolean().default(true),
      detailedDescription: z.string().optional().nullable(),
      bdi: z.number().default(0),
      laborCost: z.number().optional().default(0),
      materialCost: z.number().optional().default(0),
      equipmentCost: z.number().optional().default(0),
      serviceCost: z.number().optional().default(0),
      items: z.array(z.object({
        catalogItemId: z.string().optional().nullable(),
        childCompositionId: z.string().optional().nullable(),
        quantity: z.number().min(0.000001, 'Positivo'),
      })).optional().default([])
    }))
    .mutation(async ({ ctx, input }) => {
      let finalCode = input.code?.trim();

      if (!finalCode) {
        // Gerador de código automático para Composições
        const lastComp = await ctx.prisma.composition.findFirst({
          where: { 
            companyId: ctx.companyId!, 
            AND: [
              { code: { not: null } },
              { code: { not: "" } }
            ]
          },
          orderBy: { code: 'desc' },
        });

        let nextNum = 1;
        if (lastComp?.code) {
          const matched = lastComp.code.match(/\d+/);
          if (matched) {
            nextNum = parseInt(matched[0], 10) + 1;
          }
        }
        finalCode = nextNum.toString().padStart(4, '0');
      }

      // Verificar se o código (manual ou gerado) já existe
      const existing = await ctx.prisma.composition.findFirst({
        where: { code: finalCode, companyId: ctx.companyId! }
      });

      if (existing) {
        if (input.code) {
          throw new Error(`Uma composição com o código ${finalCode} já existe.`);
        } else {
          // Se o gerado colidir (raro), tentamos incrementar até achar um vago
          let attempt = 1;
          while(true) {
            const collision = await ctx.prisma.composition.findFirst({
              where: { code: finalCode, companyId: ctx.companyId! }
            });
            if (!collision) break;
            const num: number = parseInt(finalCode || "0", 10) + 1;
            finalCode = num.toString().padStart(4, '0');
            attempt++;
            if (attempt > 20) break;
          }
        }
      }

      return ctx.prisma.$transaction(async (tx) => {
        const { items, ...data } = input;
        const composition = await tx.composition.create({
          data: {
            ...data,
            code: finalCode,
            companyId: ctx.companyId!,
            items: {
              create: items?.map(item => ({
                catalogItemId: item.catalogItemId || null,
                childCompositionId: item.childCompositionId || null,
                quantity: item.quantity
              }))
            }
          }
        });
        return composition;
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      code: z.string().optional().nullable(),
      description: z.string().min(1, 'A descrição é obrigatória'),
      unit: z.string().min(1, 'A unidade é obrigatória'),
      type: z.string().optional().nullable(),
      base: z.string().optional().nullable(),
      isActive: z.boolean(),
      detailedDescription: z.string().optional().nullable(),
      bdi: z.number(),
      laborCost: z.number().optional().default(0),
      materialCost: z.number().optional().default(0),
      equipmentCost: z.number().optional().default(0),
      serviceCost: z.number().optional().default(0),
      items: z.array(z.object({
        catalogItemId: z.string().optional().nullable(),
        childCompositionId: z.string().optional().nullable(),
        quantity: z.number().min(0.000001, 'Positivo'),
      })).optional().default([])
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, items, ...data } = input;

      return ctx.prisma.$transaction(async (tx) => {
        await tx.compositionItem.deleteMany({
          where: { compositionId: id }
        });

        return tx.composition.update({
          where: { id, companyId: ctx.companyId! },
          data: {
            ...data,
            items: {
              create: items?.map(item => ({
                catalogItemId: item.catalogItemId || null,
                childCompositionId: item.childCompositionId || null,
                quantity: item.quantity
              }))
            }
          }
        });
      });
    }),

  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.composition.delete({
        where: { id: input, companyId: ctx.companyId! }
      });
    })
});
