import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const contactRouter = router({
  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const clientsCount = await ctx.prisma.contact.count({
      where: { companyId: ctx.companyId!, roles: { has: 'CLIENT' } }
    });
    
    const suppliersCount = await ctx.prisma.contact.count({
      where: { companyId: ctx.companyId!, roles: { has: 'SUPPLIER' } }
    });

    const professionalsCount = await ctx.prisma.contact.count({
      where: { companyId: ctx.companyId!, roles: { has: 'PROFESSIONAL' } }
    });

    const recentContacts = await ctx.prisma.contact.findMany({
      where: { companyId: ctx.companyId! },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        roles: true,
        email: true,
        createdAt: true
      }
    });

    return {
      clients: clientsCount,
      suppliers: suppliersCount,
      professionals: professionalsCount,
      recent: recentContacts
    };
  }),

  list: protectedProcedure
    .input(z.object({
      type: z.enum(['CLIENT', 'SUPPLIER', 'PROFESSIONAL']),
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(100).default(10),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.perPage;
      const whereClause = {
        companyId: ctx.companyId!,
        roles: { has: input.type },
        ...(input.search ? {
          name: {
            contains: input.search,
            mode: 'insensitive' as const
          }
        } : {})
      };

      const [items, totalCount] = await Promise.all([
        ctx.prisma.contact.findMany({
          where: whereClause,
          skip,
          take: input.perPage,
          orderBy: { name: 'asc' },
        }),
        ctx.prisma.contact.count({
          where: whereClause
        })
      ]);

      return {
        items,
        totalCount,
        totalPages: Math.ceil(totalCount / input.perPage)
      };
    }),

  create: protectedProcedure
    .input(z.object({
      type: z.enum(['CLIENT', 'SUPPLIER', 'PROFESSIONAL']),
      alsoSupplier: z.boolean().optional(),
      alsoClient: z.boolean().optional(),
      personType: z.enum(['PHYSICAL', 'LEGAL']).default('LEGAL'),
      name: z.string().min(1, 'Nome é obrigatório'),
      tradeName: z.string().optional(),
      document: z.string().optional(),
      stateRegistration: z.string().optional(),
      municipalRegistration: z.string().optional(),
      birthDate: z.string().optional(),
      email: z.string().email('Email inválido').optional().or(z.literal('')),
      phone: z.string().optional(),
      notes: z.string().optional(),
      cep: z.string().optional(),
      street: z.string().optional(),
      number: z.string().optional(),
      complement: z.string().optional(),
      neighborhood: z.string().optional(),
      state: z.string().optional(),
      city: z.string().optional(),
      
      // HR Fields
      gender: z.enum(['MALE', 'FEMALE']).optional(),
      rg: z.string().optional(),
      rgUf: z.string().optional(),
      childrenCount: z.number().int().min(0).optional(),
      motherName: z.string().optional(),
      fatherName: z.string().optional(),
      workRegime: z.enum(['HOURLY', 'DAILY', 'MONTHLY', 'CONTRACTOR']).optional(),
      remunerationValue: z.number().optional(),
      jobRoleId: z.string().optional(),
      skillLevel: z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED']).optional(),
      admissionDate: z.string().optional(),
      dismissalDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const birthDateObj = input.birthDate ? new Date(input.birthDate) : null;
      const admissionDateObj = input.admissionDate ? new Date(input.admissionDate) : null;
      const dismissalDateObj = input.dismissalDate ? new Date(input.dismissalDate) : null;
      
      const rolesToSave = [input.type];
      if (input.alsoSupplier && !rolesToSave.includes('SUPPLIER')) rolesToSave.push('SUPPLIER');
      if (input.alsoClient && !rolesToSave.includes('CLIENT')) rolesToSave.push('CLIENT');
      
      return ctx.prisma.contact.create({
        data: {
          companyId: ctx.companyId!,
          roles: rolesToSave,
          personType: input.personType,
          name: input.name,
          tradeName: input.tradeName || null,
          document: input.document || null,
          stateRegistration: input.stateRegistration || null,
          municipalRegistration: input.municipalRegistration || null,
          birthDate: birthDateObj,
          email: input.email || null,
          phone: input.phone || null,
          notes: input.notes || null,
          cep: input.cep || null,
          street: input.street || null,
          number: input.number || null,
          complement: input.complement || null,
          neighborhood: input.neighborhood || null,
          state: input.state || null,
          city: input.city || null,
          
          gender: input.gender,
          rg: input.rg || null,
          rgUf: input.rgUf || null,
          childrenCount: input.childrenCount,
          motherName: input.motherName || null,
          fatherName: input.fatherName || null,
          workRegime: input.workRegime,
          remunerationValue: input.remunerationValue ?? null,
          jobRoleId: input.jobRoleId || null,
          skillLevel: input.skillLevel,
          admissionDate: admissionDateObj,
          dismissalDate: dismissalDateObj,
        }
      });
    })
});
