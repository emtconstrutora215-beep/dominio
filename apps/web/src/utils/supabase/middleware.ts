import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // --- ONBOARDING CHECK ---
  // Se o usuário está logado, e a rota não é de setup nem estática/api
  if (user && 
      !request.nextUrl.pathname.startsWith('/onboarding') && 
      !request.nextUrl.pathname.startsWith('/auth') &&
      !request.nextUrl.pathname.startsWith('/api') &&
      !request.nextUrl.pathname.startsWith('/_next')
  ) {
    try {
      // Use direct Supabase query instead of Prisma to keep middleware bundle small (< 1MB)
      const { data: dbUser } = await supabase
        .from('User')
        .select('company:Company(onboardingCompleted)')
        .eq('id', user.id)
        .single();

      const typedUser = dbUser as any;
      if (typedUser && typedUser.company && !typedUser.company.onboardingCompleted) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }
    } catch (err) {
      console.error("[Middleware] Falha ao verificar onboarding", err);
    }
  }

  return supabaseResponse
}
