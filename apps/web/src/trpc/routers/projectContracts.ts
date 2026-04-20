import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const projectContractsRouter = router({
  getProjectContracts: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.projectContract.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: 'desc' }
      });
    }),

  getProjectContractById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const doc = await ctx.prisma.projectContract.findUnique({
        where: { id: input.id }
      });
      if (!doc) throw new TRPCError({ code: 'NOT_FOUND' });
      return doc;
    }),

  generateFromTemplate: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      templateId: z.string(),
      name: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
        include: { client: true, company: true }
      });

      const template = await ctx.prisma.contractTemplate.findUnique({
        where: { id: input.templateId }
      });

      if (!project || !template) throw new TRPCError({ code: 'NOT_FOUND' });

      // Variable Injection Logic
      let content = template.content;
      const variables: Record<string, string> = {
        '{{projeto_nome}}': project.name || '',
        '{{projeto_codigo}}': project.code || '',
        '{{projeto_valor}}': new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.budget || 0),
        '{{cliente_nome}}': project.client?.name || '',
        '{{cliente_documento}}': project.client?.document || '',
        '{{empresa_nome}}': project.company?.name || '',
        '{{empresa_cnpj}}': project.company?.cnpj || '',
        '{{data_hoje}}': format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      };

      Object.entries(variables).forEach(([key, value]) => {
        content = content.replace(new RegExp(key, 'g'), value);
      });

      return ctx.prisma.projectContract.create({
        data: {
          name: input.name,
          content: content,
          projectId: input.projectId,
          templateId: input.templateId,
          status: 'DRAFT'
        }
      });
    }),

  updateDocument: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string(),
      content: z.string(),
      status: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.projectContract.update({
        where: { id: input.id },
        data: {
          name: input.name,
          content: input.content,
          status: input.status
        }
      });
    }),

  deleteDocument: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.projectContract.delete({
        where: { id: input.id }
      });
    })
});
