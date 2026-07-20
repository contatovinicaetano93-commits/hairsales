import Link from 'next/link'
import { getProBrand } from '@/lib/pro/brand'

export const metadata = {
  title: 'Política de privacidade · HairSales',
}

export default function ProPrivacidadePage() {
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
        <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight">
          Política de privacidade
        </h1>
        <p className="mt-2 text-sm text-muted">
          Última atualização: julho de 2026. Tratamos seus dados conforme a Lei Geral de Proteção
          de Dados (LGPD, Lei 13.709/2018).
        </p>
      </div>

      <div className="flex flex-col gap-5 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="font-serif text-lg font-bold">1. Quais dados coletamos</h2>
          <p className="mt-1 text-muted">
            Dados da sua conta (nome, e-mail, senha criptografada), dados que você cadastra sobre
            os seus clientes (nome, telefone, histórico de serviços) quando conecta sua agenda, e
            dados de uso do app (mensagens trocadas com a assistente de IA, metas definidas).
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold">2. Como usamos esses dados</h2>
          <p className="mt-1 text-muted">
            Para operar o app (mostrar sua agenda, calcular suas metas, sugerir ações de
            reativação de clientes) e para a assistente de IA responder suas perguntas sobre o seu
            próprio negócio. Não vendemos seus dados nem os de seus clientes a terceiros.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold">3. Com quem compartilhamos</h2>
          <p className="mt-1 text-muted">
            Só com provedores estritamente necessários pra operar o serviço: Anthropic (respostas
            da assistente de IA), Stripe (cobrança de assinatura), e — apenas se você conectar —
            Avec/Trinks (sincronização de agenda), Telegram e/ou WhatsApp Cloud API (mensagens que
            você optar por enviar).
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold">4. Retenção e exclusão</h2>
          <p className="mt-1 text-muted">
            Mantemos seus dados enquanto sua conta estiver ativa. Você pode excluir sua conta a
            qualquer momento no app (Conectar → Excluir conta, com confirmação de senha) — isso
            apaga permanentemente seu cadastro, seus clientes, histórico da assistente e vínculos
            de Telegram/WhatsApp. Registros de cobrança são mantidos anonimizados (sem seus dados
            pessoais vinculados) pelo tempo exigido pela legislação fiscal.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold">5. Seus direitos (LGPD)</h2>
          <p className="mt-1 text-muted">
            Você pode, a qualquer momento: confirmar quais dados temos sobre você, corrigir dados
            incorretos, e solicitar a exclusão da sua conta (direto no app ou pelos nossos canais
            de contato). Como a exclusão de conta já está disponível dentro do app, é o jeito mais
            rápido de exercer seu direito ao esquecimento.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold">6. Segurança</h2>
          <p className="mt-1 text-muted">
            Senhas são armazenadas com hash (nunca em texto puro), a sessão usa cookie protegido
            contra acesso por JavaScript, e tokens de integração (Avec/Trinks) são criptografados
            no banco.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold">7. Contato</h2>
          <p className="mt-1 text-muted">
            Dúvidas sobre privacidade ou solicitações relacionadas aos seus dados podem ser
            enviadas pelos canais de suporte informados no app.
          </p>
        </section>
      </div>
    </div>
  )
}
