import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { recalculateProjectTotals } from './budget';

async function syncBudgetToContract(prisma: any, projectId: string, companyId: string) {
  // 1. Verificar se já existe um contrato com itens
  const existingContract = await prisma.contract.findFirst({
    where: { projectId },
    include: { items: { take: 1 } }
  });

  if (existingContract && existingContract.items.length > 0) {
    return existingContract; // Já sincronizado
  }

  // 2. Criar ou obter contrato
  const contract = existingContract || await prisma.contract.create({
    data: {
      projectId,
      supplierName: "Contrato Próprio", 
      totalValue: 0,
      retentionPercentage: 0
    }
  });

  // 3. Buscar estágios e itens do orçamento
  const stages = await prisma.projectStage.findMany({
    where: { projectId },
    include: {
      budgetItems: {
        orderBy: { order: 'asc' }
      }
    }
  });

  let contractTotal = 0;

  for (const stage of stages) {
    const rootItems = stage.budgetItems.filter((item: any) => !item.parentId);
    
    // Mapa para manter controle de IDs originais -> IDs novos do contrato para manter hierarquia
    const idMap = new Map<string, string>();

    const copyItems = async (items: any[], parentContractItemId: string | null = null) => {
      for (const item of items) {
        // Preço de venda = Custo * (1 + BDI%)
        const bdi = item.bdi || stage.bdi || 0;
        const saleUnitPrice = item.unitPrice * (1 + bdi / 100);
        const saleTotalValue = item.total * (1 + bdi / 100);

        const newContractItem = await prisma.contractItem.create({
          data: {
            contractId: contract.id,
            projectStageId: stage.id,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: saleUnitPrice,
            totalValue: saleTotalValue,
            type: item.type,
            parentId: parentContractItemId,
            catalogItemId: item.catalogItemId,
            compositionId: item.compositionId,
          }
        });

        idMap.set(item.id, newContractItem.id);
        
        if (!parentContractItemId) {
          contractTotal += saleTotalValue;
        }

        // Buscar filhos do item original
        const children = stage.budgetItems.filter((i: any) => i.parentId === item.id);
        if (children.length > 0) {
          await copyItems(children, newContractItem.id);
        }
      }
    };

    await copyItems(rootItems);
  }

  // 4. Atualizar total do contrato
  await prisma.contract.update({
    where: { id: contract.id },
    data: { totalValue: contractTotal }
  });

  return contract;
}

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
      status: z.union([
        z.enum(['BUDGETING', 'PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']),
        z.array(z.enum(['BUDGETING', 'PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']))
      ]).optional(),

      onlyWithBudget: z.boolean().optional()


    }))
    .query(async ({ ctx, input }) => {
      const { page, perPage, search } = input;
      
      const whereFilters: any = {
        companyId: ctx.companyId,
      };

      if (input.status) {
        if (Array.isArray(input.status)) {
          whereFilters.status = { in: input.status };
        } else {
          whereFilters.status = input.status;
        }
      }

      if (input.onlyWithBudget) {
        whereFilters.OR = [
          { budgetConfig: { isNot: null } },
          { status: 'BUDGETING' }
        ];
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
      status: z.union([
        z.enum(['BUDGETING', 'PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']),
        z.array(z.enum(['BUDGETING', 'PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']))
      ]).optional(),

      onlyWithBudget: z.boolean().optional()


    }))
    .query(async ({ ctx, input }) => {
      const { limit, cursor, search } = input;
      
      const whereFilters: any = {
        companyId: ctx.companyId,
      };

      if (input.status) {
        if (Array.isArray(input.status)) {
          whereFilters.status = { in: input.status };
        } else {
          whereFilters.status = input.status;
        }
      }

      if (input.onlyWithBudget) {
        whereFilters.OR = [
          { budgetConfig: { isNot: null } },
          { status: 'BUDGETING' }
        ];
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
      try {
        const project = await ctx.prisma.project.findFirst({
          where: { 
            id: input.id, 
            companyId: ctx.companyId 
          },
          include: {
            client: true,
            technicalLead: true,
            projectManager: true,
            users: {
              select: { id: true, name: true, email: true }
            },
            comments: {
              include: { user: true },
              orderBy: { createdAt: 'desc' }
            },
            stages: {
              include: { budgetItems: true }
            },
            contracts: true,
            defaultBankAccount: true,
            projectContacts: true,
            invoicingContact: true,
            dailyReports: {
              orderBy: { date: 'desc' },
              take: 10
            }
          }
        });

        if (!project) {
          console.warn('Project not found in DB for given ID and CompanyId');
        }

        return project;
      } catch (error) {
        console.error('Error fetching project by ID:', error);
        throw error;
      }
    }),

  addComment: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      text: z.string().min(1)
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.projectComment.create({
        data: {
          projectId: input.projectId,
          text: input.text,
          userId: ctx.user.id
        },
        include: { user: true }
      });
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
      proposalStatus: z.enum(['UNDER_ELABORATION', 'INITIAL_CONTACT', 'SENT_TO_COMMERCIAL', 'UNDER_REVISION', 'SENT_TO_CLIENT', 'SOLD', 'LOST', 'DISCONTINUED']).default('UNDER_ELABORATION'),
      proposalDeliveryDate: z.coerce.date().optional().nullable(),
      proposalSaleDate: z.coerce.date().optional().nullable(),
      paymentCondition: z.string().optional().nullable(),
      measurementPeriod: z.string().optional().nullable(),
      installmentCount: z.number().optional().nullable(),
      downPaymentValue: z.number().optional().nullable(),
      discountValue: z.number().optional().nullable(),
      discountType: z.string().optional().nullable(),
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
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      type: z.string().optional(),
      status: z.enum(['BUDGETING', 'PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
      code: z.string().optional(),
      clientId: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      budget: z.number().optional().nullable(),
      
      totalArea: z.number().optional().nullable(),
      areaUnit: z.string().optional().nullable(),
      art: z.string().optional().nullable(),
      ceiCno: z.string().optional().nullable(),
      technicalLeadId: z.string().optional().nullable(),
      projectManagerId: z.string().optional().nullable(),

      cep: z.string().optional(),
      street: z.string().optional(),
      number: z.string().optional(),
      complement: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),

      paymentResponsibility: z.enum(['COMPANY', 'CLIENT', 'CLIENT_REIMBURSEMENT', 'DIRECT_BILLING']).optional().nullable(),
      defaultBankAccountId: z.string().optional().nullable(),
      
      showInFinancial: z.boolean().optional(),
      showInInvoicing: z.boolean().optional(),
      showInPurchasing: z.boolean().optional(),
      proposalStatus: z.enum(['UNDER_ELABORATION', 'INITIAL_CONTACT', 'SENT_TO_COMMERCIAL', 'UNDER_REVISION', 'SENT_TO_CLIENT', 'SOLD', 'LOST', 'DISCONTINUED']).optional(),
      
      // New proposal fields
      proposalDeliveryDate: z.coerce.date().optional().nullable(),
      proposalSaleDate: z.coerce.date().optional().nullable(),
      paymentCondition: z.string().optional().nullable(),
      measurementPeriod: z.string().optional().nullable(),
      installmentCount: z.number().optional().nullable(),
      downPaymentValue: z.number().optional().nullable(),
      discountValue: z.number().optional().nullable(),
      discountType: z.string().optional().nullable(),

      users: z.array(z.string()).optional(),
      projectContacts: z.array(z.object({
        name: z.string(),
        role: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional()
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, users, projectContacts, ...data } = input;
      
      const updated = await ctx.prisma.$transaction(async (tx: any) => {
        // Atualizar projeto básico
        const project = await tx.project.update({
          where: { id, companyId: ctx.companyId },
          data: {
            ...data,
            technicalLeadId: data.technicalLeadId === "" ? null : data.technicalLeadId,
            projectManagerId: data.projectManagerId === "" ? null : data.projectManagerId,
            clientId: data.clientId === "" ? null : data.clientId,
            defaultBankAccountId: data.defaultBankAccountId === "" ? null : data.defaultBankAccountId,
            
            // Atualizar usuários (limpa e reconecta)
            users: users ? {
              set: users.map(uid => ({ id: uid }))
            } : undefined,

            // Atualizar contatos da obra (limpa e recria)
            projectContacts: projectContacts ? {
              deleteMany: {},
              create: projectContacts
            } : undefined
          } as any
        });

        // Sincronizações extras
        if (data.proposalStatus === 'SOLD') {
          await syncBudgetToContract(tx, id, ctx.companyId);
        }
        await recalculateProjectTotals(tx, id);

        return project;
      });

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verificar se o projeto pertence à empresa do usuário
      const project = await ctx.prisma.project.findFirst({
        where: {
          id: input.id,
          companyId: ctx.companyId
        }
      });

      if (!project) {
        throw new Error("Obra não encontrada ou você não tem permissão para excluí-la.");
      }

      return ctx.prisma.project.delete({
        where: { id: input.id }
      });
    })
});
