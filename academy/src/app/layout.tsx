import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Fraunces, Hanken_Grotesk, Spline_Sans_Mono } from 'next/font/google'
import './globals.css'
import { Analytics } from '@/components/analytics'
import { FloatingScissors } from '@/components/floating-scissors'
import { event, site } from '@/lib/content'

const bodySans = Hanken_Grotesk({
  variable: '--font-body-sans',
  subsets: ['latin'],
})

const monoFace = Spline_Sans_Mono({
  variable: '--font-mono-face',
  subsets: ['latin'],
})

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
})

const fraunces = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  axes: ['opsz'],
  style: ['normal'],
})

export const metadata: Metadata = {
  title: `${event.title} · ${site.name}`,
  description: event.description,
  applicationName: site.name,
  openGraph: {
    title: `${event.title} — Masterclass com Romeu Felipe`,
    description: event.description,
    locale: 'pt_BR',
    type: 'website',
    siteName: site.name,
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0908',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${bodySans.variable} ${monoFace.variable} ${cormorant.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background pb-24 md:pb-0">
        <Analytics />
        <FloatingScissors />
        {children}
      </body>
    </html>
  )
}
