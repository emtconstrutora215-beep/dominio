import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

const STANDARD_TYPES = [
  { name: 'Alvenaria' },
  { name: 'Revestimento' },
  { name: 'Pintura' },
  { name: 'Instalações Elétricas' },
  { name: 'Instalações Hidráulicas' },
  { name: 'Pisos e Pavimentação' },
  { name: 'Esquadrias' },
  { name: 'Louças e Metais' },
  { name: 'Cobertura' },
  { name: 'Limpeza e Entrega' },
  { name: 'Infraestrutura' },
  { name: 'Superestrutura' },
  { name: 'Sintética' },
  { name: 'Analítica' },
];

export const compositionTypeRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const types = await ctx.prisma.compositionType.findMany({
        where: { companyId: ctx.companyId! },
        orderBy: { name: 'asc' }
      });

      // Seed on demand
      if (types.length === 0) {
        await ctx.prisma.compositionType.createMany({
          data: STANDARD_TYPES.map(t => ({
            ...t,
            companyId: ctx.companyId!
          }))
        });
        return ctx.prisma.compositionType.findMany({
          where: { companyId: ctx.companyId! },
          orderBy: { name: 'asc' }
        });
      }

      return types;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(50).transform(s => s.trim())
    }))
    .mutation(async ({ ctx, input }) => {
      const normalizedName = input.name;

      const existing = await ctx.prisma.compositionType.findFirst({
        where: { 
          name: { equals: normalizedName, mode: 'insensitive' }, 
          companyId: ctx.companyId! 
        }
      });

      if (existing) {
        throw new Error('Este tipo já está cadastrado.');
      }

      return ctx.prisma.compositionType.create({
        data: {
          name: normalizedName,
          companyId: ctx.companyId!
        }
      });
    })
});
