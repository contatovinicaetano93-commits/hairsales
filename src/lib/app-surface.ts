export type AppSurface = 'rom' | 'hairsales'

export function parseAppSurface(value: string | undefined | null): AppSurface {
  return value?.toLowerCase() === 'hairsales' ? 'hairsales' : 'rom'
}

export function getAppSurface(): AppSurface {
  const fromServer = typeof window === 'undefined' ? process.env.APP_SURFACE : undefined
  return parseAppSurface(fromServer ?? process.env.NEXT_PUBLIC_APP_SURFACE)
}

export function isHairsalesSurface(): boolean {
  return getAppSurface() === 'hairsales'
}

export function isRomSurface(): boolean {
  return getAppSurface() === 'rom'
}
