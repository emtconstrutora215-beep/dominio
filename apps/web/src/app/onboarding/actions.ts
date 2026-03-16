'use server';

export async function updateOnboardingStatus() {
  const { prisma } = await import('@construtora-erp/db')
  const { revalidatePath } = await import('next/cache')
  const { createClient } = await import('@/utils/supabase/server')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Sem autorização" }
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { companyId: true }
  })

  if (dbUser?.companyId) {
    await prisma.company.update({
      where: { id: dbUser.companyId },
      data: { onboardingCompleted: true }
    })
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
