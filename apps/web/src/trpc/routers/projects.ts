import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const projectsRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.project.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        stages: true,
        dailyReports: {
          take: 2,
          orderBy: { date: 'desc' }
        }
      }
    });
  }),
  
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(50).default(10),
      search: z.string().optional(),
      status: z.enum(['BUDGETING', 'PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional()
    }))
    .query(async ({ ctx, input }) => {
      const { page, perPage, search } = input;
      
      const whereFilters: any = {
        companyId: ctx.companyId,
      };

      if (input.status) {
        whereFilters.status = input.status;
      }

      if (search && search.trim().length > 0) {
        whereFilters.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { client: { name: { contains: search, mode: 'insensitive' } } }
        ];
      }

      const totalCount = await ctx.prisma.project.count({
        where: whereFilters
      });

      const items = await ctx.prisma.project.findMany({
        where: whereFilters,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          client: true,
          users: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      return {
        items,
        totalCount,
        totalPages: Math.ceil(totalCount / perPage),
        page
      };
    }),
  
  listInfinite: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(15),
      cursor: z.string().nullish(), // id do projeto para cursor
      search: z.string().optional(),
      status: z.enum(['BUDGETING', 'PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional()
    }))
    .query(async ({ ctx, input }) => {
      const { limit, cursor, search } = input;
      
      const whereFilters: any = {
        companyId: ctx.companyId,
      };

      if (input.status) {
        whereFilters.status = input.status;
      }

      if (search && search.trim().length > 0) {
        whereFilters.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { client: { name: { contains: search, mode: 'insensitive' } } }
        ];
      }

      const items = await ctx.prisma.project.findMany({
        take: limit + 1,
        where: whereFilters,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          client: true,
          budget: true,
          users: { select: { id: true, name: true, email: true } }
        }
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items,
        nextCursor,
      };
    }),
  
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          stages: {
            include: { budgetItems: true }
          },
          dailyReports: {
            take: 5,
            orderBy: { date: 'desc' }
          }
        }
      });
      return project;
    }),

  formOptions: protectedProcedure.query(async ({ ctx }) => {
    const users = await ctx.prisma.user.findMany({
      where: { companyId: ctx.companyId },
      select: { id: true, name: true, email: true, role: true }
    });
    
    const bankAccounts = await ctx.prisma.bankAccount.findMany({
      where: { companyId: ctx.companyId },
      select: { id: true, name: true, agency: true, accountNumber: true }
    });

    const clients = await ctx.prisma.contact.findMany({
      where: { companyId: ctx.companyId, roles: { has: 'CLIENT' } },
      select: { 
        id: true, 
        name: true, 
        document: true,
        email: true,
        phone: true,
        cep: true,
        street: true,
        number: true,
        complement: true,
        neighborhood: true,
        city: true,
        state: true,
        personType: true
      }
    });

    const projects = await ctx.prisma.project.findMany({
      where: { companyId: ctx.companyId },
      select: { 
        id: true, 
        name: true, 
        code: true, 
        clientId: true,
        address: true,
        cep: true,
        street: true,
        number: true,
        complement: true,
        neighborhood: true,
        city: true,
        state: true,
        totalArea: true,
        areaUnit: true,
        budget: true,
        technicalLeadId: true,
        projectManagerId: true,
        showInFinancial: true,
        showInInvoicing: true,
        showInPurchasing: true,
        status: true,
        number: true,
        paymentResponsibility: true,
        defaultBankAccountId: true
      }
    });

    return { users, bankAccounts, clients, projects };
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "O nome da obra é obrigatório"),
      type: z.string().optional(),
      status: z.enum(['BUDGETING', 'PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']).default('PLANNING'),
      code: z.string().optional(),
      clientId: z.string().optional().transform(v => v === "" ? undefined : v),
      
      address: z.string().optional(),
      budget: z.number().optional().nullable(),

      totalArea: z.number().optional().nullable(),
      areaUnit: z.string().optional(),
      art: z.string().optional(),
      ceiCno: z.string().optional(),
      technicalLeadId: z.string().optional().transform(v => v === "" ? undefined : v),
      projectManagerId: z.string().optional().transform(v => v === "" ? undefined : v),

      users: z.array(z.string()).optional(),

      cep: z.string().optional(),
      street: z.string().optional(),
      number: z.string().optional(),
      complement: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),

      paymentResponsibility: z.enum(['COMPANY', 'CLIENT', 'CLIENT_REIMBURSEMENT', 'DIRECT_BILLING']).optional().nullable(),
      defaultBankAccountId: z.string().optional().nullable().transform(v => v === "" ? undefined : v),

      projectContacts: z.array(z.object({
        name: z.string(),
        role: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional()
      })).optional(),

      invoicingContact: z.object({
        personType: z.enum(['PHYSICAL', 'LEGAL']).default('LEGAL'),
        name: z.string(),
        document: z.string().optional(),
        stateRegistration: z.string().optional(),
        municipalRegistration: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        cep: z.string().optional(),
        street: z.string().optional(),
        number: z.string().optional(),
        complement: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional()
      }).optional().nullable(),

      showInFinancial: z.boolean().default(true),
      showInInvoicing: z.boolean().default(true),
      showInPurchasing: z.boolean().default(true),
      proposalStatus: z.enum(['UNDER_ELABORATION', 'SOLD', 'DISCONTINUED']).default('UNDER_ELABORATION'),
      totalCost: z.number().default(0)
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(async (tx) => {
        let invoicingContactId: string | null = null;

        // Se veio bloco de faturamento aninhado, cria ou atualiza o Contato
        if (input.invoicingContact) {
          const inv = input.invoicingContact;
          
          const contactData = {
            companyId: ctx.companyId,
            personType: inv.personType,
            name: inv.name,
            document: inv.document || null,
            stateRegistration: inv.stateRegistration || null,
            municipalRegistration: inv.municipalRegistration || null,
            email: inv.email || null,
            phone: inv.phone || null,
            cep: inv.cep || null,
            street: inv.street || null,
            number: inv.number || null,
            complement: inv.complement || null,
            neighborhood: inv.neighborhood || null,
            city: inv.city || null,
            state: inv.state || null
          };

          // Tenta encontrar por documento e empresa para evitar erro de unique constraint
          if (inv.document) {
            const existing = await tx.contact.findFirst({
              where: { 
                document: inv.document,
                companyId: ctx.companyId
              }
            });

            if (existing) {
              const updated = await tx.contact.update({
                where: { id: existing.id },
                data: contactData
              });
              invoicingContactId = updated.id;
            } else {
              const created = await tx.contact.create({
                data: contactData
              });
              invoicingContactId = created.id;
            }
          } else {
            // Sem documento, cria sempre um novo
            const created = await tx.contact.create({
              data: contactData
            });
            invoicingContactId = created.id;
          }
        }

        // Criar Project principal
        const project = await tx.project.create({
          data: {
            companyId: ctx.companyId,
            name: input.name,
            address: input.address,
            budget: input.budget || 0,
            type: input.type,
            status: input.status as any,
            code: input.code,
            clientId: input.clientId,
            
            totalArea: input.totalArea,
            areaUnit: input.areaUnit,
            art: input.art,
            ceiCno: input.ceiCno,
            technicalLeadId: input.technicalLeadId,
            projectManagerId: input.projectManagerId,

            cep: input.cep,
            street: input.street,
            number: input.number,
            complement: input.complement,
            neighborhood: input.neighborhood,
            city: input.city,
            state: input.state,

            paymentResponsibility: input.paymentResponsibility,
            defaultBankAccountId: input.defaultBankAccountId,
            invoicingContactId: invoicingContactId,

            showInFinancial: input.showInFinancial,
            showInInvoicing: input.showInInvoicing,
            showInPurchasing: input.showInPurchasing,
            proposalStatus: input.proposalStatus,
            totalCost: input.totalCost,

            // Relacionamento com Contatos da Obra
            projectContacts: input.projectContacts?.length ? {
              create: input.projectContacts
            } : undefined,

            // Relacionamento com Usuários (permissão de acesso)
            users: input.users && input.users.length > 0 ? {
              connect: input.users.map(id => ({ id }))
            } : undefined
          } as any
        });

        return project;
      });
    })
});
