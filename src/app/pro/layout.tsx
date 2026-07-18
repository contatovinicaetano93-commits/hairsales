import type { Metadata } from 'next'
import { Fraunces } from 'next/font/google'
import { getProBrand } from '@/lib/pro/brand'
import { ProShell } from './_components/ProShell'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['500', '600', '700'],
})

const brand = getProBrand()

export const metadata: Metadata = {
  title: `${brand.name} · ${brand.productLine}`,
  description: brand.tagline,
  manifest: '/pro/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: brand.name,
  },
}

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${fraunces.variable}`}>
      <ProShell>{children}</ProShell>
    </div>
  )
}
