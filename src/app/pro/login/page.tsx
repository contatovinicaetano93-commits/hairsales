import { isHairsalesSurface } from '@/lib/app-surface'
import { ProLanding } from '../_components/landing/ProLanding'

export default function ProLoginPage() {
  const romTeamLoginUrl =
    process.env.ROM_TEAM_LOGIN_URL ?? process.env.NEXT_PUBLIC_ROM_TEAM_LOGIN_URL ?? null
  const teamLoginUrl = isHairsalesSurface() ? romTeamLoginUrl : (romTeamLoginUrl ?? '/login')

  return <ProLanding romTeamLoginUrl={teamLoginUrl} />
}
