import Link from 'next/link'
import { getProBrand } from '@/lib/pro/brand'

export const metadata = {
  title: 'Termos de uso · HairSales',
}

export default function ProTermosPage() {
  const brand = getProBrand()

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-5 py-10">
      <Link href="/pro/login" className="text-sm font-semibold text-gold-strong hover:underline">
        ← Voltar
      </Link>

      <div>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-gold-strong">
          {brand.productLine}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight">Termos de uso</h1>
        <p className="mt-2 text-sm text-muted">Última atualização: julho de 2026.</p>
      </div>

      <div className="flex flex-col gap-5 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="font-serif text-lg font-bold">1. O que é o {brand.name}</h2>
          <p className="mt-1 text-muted">
            O {brand.name} é um aplicativo para profissionais autônomos de beleza (cabeleireiros,
            manicures, esteticistas e afins) gerenciarem sua agenda, clientes, metas e assistente
            de IA pessoal. Não é o painel de gestão do salão/equipe — cada assinante vê e
            gerencia apenas os próprios dados.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold">2. Cadastro e conta</h2>
          <p className="mt-1 text-muted">
            Você é responsável por manter sua senha em sigilo e pelas informações que cadastra —
            incluindo os dados dos seus próprios clientes (nome, telefone, histórico de serviços).
            Não compartilhe sua conta com terceiros.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold">3. Planos e cobrança</h2>
          <p className="mt-1 text-muted">
            O {brand.name} oferece os planos Standard e Pro, com valores exibidos na tela de
            assinatura. Cobranças recorrentes são processadas por um provedor de pagamento
            terceiro (Stripe); cancelamentos podem ser feitos a qualquer momento pelo portal de
            cobrança, sem multa.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold">4. Integrações</h2>
          <p className="mt-1 text-muted">
            O app pode se conectar, a seu critério, com sua agenda (Avec ou Trinks), Telegram e
            WhatsApp Cloud API. Essas integrações são opcionais e exigem sua autorização explícita
            antes de qualquer sincronização de dados.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold">5. Uso aceitável</h2>
          <p className="mt-1 text-muted">
            Não use o {brand.name} para armazenar dados que você não tem autorização para tratar,
            enviar mensagens não solicitadas em massa, ou tentar acessar dados de outros
            assinantes.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold">6. Cancelamento e exclusão de conta</h2>
          <p className="mt-1 text-muted">
            Você pode excluir sua conta a qualquer momento, direto no app (Conectar → Excluir
            conta), o que apaga permanentemente seus dados cadastrados. Veja mais na nossa{' '}
            <Link href="/pro/privacidade" className="text-gold-strong underline">
              Política de privacidade
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold">7. Contato</h2>
          <p className="mt-1 text-muted">
            Dúvidas sobre estes termos podem ser enviadas pelos canais de suporte informados no
            app.
          </p>
        </section>
      </div>
    </div>
  )
}
