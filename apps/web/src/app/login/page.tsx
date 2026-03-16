'use client'

import { useActionState } from 'react'

import { login, signup } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
  const [, loginAction, isLoginPending] = useActionState(
    async (prevState: unknown, formData: FormData) => {
      const result = await login(formData)
      if (result?.error) {
        toast.error("Erro no login", {
          description: result.error,
        })
      }
      return result
    },
    null
  )

  const [, signupAction, isSignupPending] = useActionState(
    async (prevState: unknown, formData: FormData) => {
      const result = await signup(formData)
      if (result?.error) {
        toast.error("Erro no cadastro", {
          description: result.error,
        })
      } else if (result?.success) {
        toast.success("Conta criada", {
          description: "Sua conta foi criada com sucesso!",
        })
      }
      return result
    },
    null
  )

  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Construtora ERP</CardTitle>
          <CardDescription>
            Entre com seu email e senha ou crie uma nova conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="auth-form" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="nome@empresa.com.br"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button
            className="w-full"
            form="auth-form"
            formAction={loginAction}
            disabled={isLoginPending}
          >
            {isLoginPending ? 'Entrando...' : 'Entrar'}
          </Button>
          <Button
            className="w-full"
            variant="outline"
            form="auth-form"
            formAction={signupAction}
            disabled={isSignupPending}
          >
            {isSignupPending ? 'Criando...' : 'Criar Conta'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
