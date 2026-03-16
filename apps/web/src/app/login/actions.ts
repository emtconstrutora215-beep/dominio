'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { rateLimiters } from '@/lib/rate-limit'

const authSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
})

export async function login(formData: FormData) {
  const reqHeaders = await headers();
  const ip = reqHeaders.get("x-forwarded-for") ?? "127.0.0.1";
  
  if (rateLimiters.authLogin) {
    const { success } = await rateLimiters.authLogin.limit(ip);
    if (!success) {
      return { error: 'Muitas tentativas. Aguarde um momento e tente novamente.' }
    }
  }

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const result = authSchema.safeParse({ email, password })

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  })

  if (error) {
    return { error: 'Credenciais inválidas' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const reqHeaders = await headers();
  const ip = reqHeaders.get("x-forwarded-for") ?? "127.0.0.1";
  
  if (rateLimiters.authRegister) {
    const { success } = await rateLimiters.authRegister.limit(ip);
    if (!success) {
      return { error: 'Muitas tentativas. Aguarde um momento e tente novamente.' }
    }
  }

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const result = authSchema.safeParse({ email, password })

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: 'Ocorreu um erro ao sair' }
  }

  revalidatePath('/', 'layout')
  redirect('/login')
}
