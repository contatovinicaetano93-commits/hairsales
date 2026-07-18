import type { Metadata } from 'next'
import { getBrand } from '@/lib/brand'
import { ProShell } from './_components/ProShell'

const brand = getBrand()

export const metadata: Metadata = {
  title: `${brand.aiPersonaName} · App do profissional`,
  description: 'Assistente do profissional: agenda, clientes, metas e ações — só os seus dados.',
  manifest: '/pro/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: brand.aiPersonaName,
  },
}

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return <ProShell>{children}</ProShell>
}
