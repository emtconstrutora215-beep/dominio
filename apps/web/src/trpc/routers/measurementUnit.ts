import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

const STANDARD_UNITS = [
  { symbol: 'm²', description: 'Metro Quadrado' },
  { symbol: 'm³', description: 'Metro Cúbico' },
  { symbol: 'kg', description: 'Quilograma' },
  { symbol: 'UN', description: 'Unidade' },
  { symbol: 'h', description: 'Hora' },
  { symbol: 'm', description: 'Metro' },
  { symbol: 't', description: 'Tonelada' },
  { symbol: 'VB', description: 'Verba' },
  { symbol: 'MES', description: 'Mês' },
  { symbol: 'DIA', description: 'Dia' },
  { symbol: 'CJ', description: 'Conjunto' },
  { symbol: 'L', description: 'Litro' },
];

export const measurementUnitRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const units = await ctx.prisma.measurementUnit.findMany({
        where: { companyId: ctx.companyId! },
        orderBy: { symbol: 'asc' }
      });

      // Seed on demand: Se a empresa não tem nenhuma unidade, cria as básicas
      if (units.length === 0) {
        await ctx.prisma.measurementUnit.createMany({
          data: STANDARD_UNITS.map(u => ({
            ...u,
            companyId: ctx.companyId!
          }))
        });
        return ctx.prisma.measurementUnit.findMany({
          where: { companyId: ctx.companyId! },
          orderBy: { symbol: 'asc' }
        });
      }

      return units;
    }),

  create: protectedProcedure
    .input(z.object({
      symbol: z.string().min(1).max(10).transform(s => s.trim()),
      description: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Normalização para evitar duplicidade m3 vs M3
      const normalizedSymbol = input.symbol;

      const existing = await ctx.prisma.measurementUnit.findFirst({
        where: { 
          symbol: { equals: normalizedSymbol, mode: 'insensitive' }, 
          companyId: ctx.companyId! 
        }
      });

      if (existing) {
        throw new Error('Esta unidade já está cadastrada.');
      }

      return ctx.prisma.measurementUnit.create({
        data: {
          symbol: normalizedSymbol,
          description: input.description || null,
          companyId: ctx.companyId!
        }
      });
    })
});
