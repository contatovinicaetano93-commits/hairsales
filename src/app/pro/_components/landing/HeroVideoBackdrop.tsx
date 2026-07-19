'use client'

const HERO_VIDEOS = [
  '/landing/hero-1.mp4',
  '/landing/hero-2.mp4',
  '/landing/hero-3.mp4',
] as const

/** Três vídeos em grade full-bleed, mute/loop/autoplay, atrás do texto do hero. */
export function HeroVideoBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 grid grid-cols-3">
        {HERO_VIDEOS.map((src) => (
          <div key={src} className="relative min-h-0 overflow-hidden">
            <video
              className="h-full w-full object-cover"
              src={src}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
          </div>
        ))}
      </div>
      {/* Legibilidade do texto sobre os vídeos */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(250,250,247,0.72)_0%,rgba(250,250,247,0.55)_40%,rgba(250,250,247,0.88)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_35%,rgba(250,250,247,0.35)_0%,transparent_70%)]" />
    </div>
  )
}
