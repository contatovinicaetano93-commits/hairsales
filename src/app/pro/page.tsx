import { redirect } from 'next/navigation'

/** Entrada pública do app do profissional → landing + login. */
export default function ProIndexPage() {
  redirect('/pro/login')
}
