import { initTRPC, TRPCError } from '@trpc/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@construtora-erp/db';

export async function createContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let companyId: string | null = null;
  let role: string | null = null;
  
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { companyId: true, role: true }
    });
    companyId = dbUser?.companyId || null;
    role = dbUser?.role || null;
  }

  return {
    user,
    role,
    companyId,
    prisma
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || !ctx.companyId || !ctx.role) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated or linked to a company' });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      role: ctx.role,
      companyId: ctx.companyId,
    },
  });
});

// Middleware for strict access to Projects
export const projectAccessMiddleware = t.middleware(async ({ ctx, next, getRawInput }) => {
  const rawInput = await getRawInput();
  const input = rawInput as { projectId?: string, id?: string };
  const targetId = input?.projectId || input?.id;

  if (targetId && ctx.companyId) {
    const project = await prisma.project.findUnique({
      where: { id: targetId },
      select: { companyId: true }
    });
    
    // Se o projeto existe, mas é de outra empresa = FORBIDDEN
    if (project && project.companyId !== ctx.companyId) {
      throw new TRPCError({ 
        code: 'FORBIDDEN', 
        message: 'You do not have permission to access or modify this project.' 
      });
    }
  }
  
  return next();
});

// Protected procedure + Project Access Verification
export const projectProtectedProcedure = protectedProcedure.use(projectAccessMiddleware);
