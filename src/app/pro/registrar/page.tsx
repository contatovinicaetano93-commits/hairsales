import { Metadata } from 'next'
import { ProShell } from '@/app/pro/_components/ProShell'
import { RegisterForm } from './_components/RegisterForm'

export const metadata: Metadata = {
  title: 'Registrar',
}

export default function RegisterPage() {
  return (
    <ProShell>
      <div className="mx-auto max-w-md space-y-6 px-4 py-12">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Criar Conta</h1>
          <p className="text-sm text-muted-foreground">
            Preencha os dados abaixo para começar
          </p>
        </div>

        <RegisterForm />

        <p className="text-center text-sm">
          Já tem conta?{' '}
          <a href="/pro/login" className="font-semibold text-primary hover:underline">
            Faça login
          </a>
        </p>
      </div>
    </ProShell>
  )
}
