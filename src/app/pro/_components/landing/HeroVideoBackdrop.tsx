'use client'

import { useEffect, useRef } from 'react'

const HERO_VIDEOS = [
  '/landing/hero-1.mp4',
  '/landing/hero-2.mp4',
  '/landing/hero-3.mp4',
] as const

function forcePlay(video: HTMLVideoElement) {
  video.muted = true
  video.defaultMuted = true
  video.playsInline = true
  video.setAttribute('muted', '')
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '')
  const play = () => {
    void video.play().catch(() => {
      // Safari pode adiar; tenta de novo no próximo frame
      requestAnimationFrame(() => {
        void video.play().catch(() => {})
      })
    })
  }
  if (video.readyState >= 2) play()
  else {
    video.addEventListener('loadeddata', play, { once: true })
    video.addEventListener('canplay', play, { once: true })
  }
}

/** Três vídeos em grade full-bleed, mute/loop/autoplay, atrás do texto do hero. */
export function HeroVideoBackdrop() {
  const refs = useRef<(HTMLVideoElement | null)[]>([])

  useEffect(() => {
    const videos = refs.current.filter(Boolean) as HTMLVideoElement[]
    for (const video of videos) forcePlay(video)

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        for (const video of videos) forcePlay(video)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 grid grid-cols-3">
        {HERO_VIDEOS.map((src, i) => (
          <div key={src} className="relative min-h-0 overflow-hidden bg-surface">
            <video
              ref={(el) => {
                refs.current[i] = el
              }}
              className="h-full w-full object-cover"
              src={src}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              controls={false}
              disablePictureInPicture
              onLoadedData={(e) => forcePlay(e.currentTarget)}
              onCanPlay={(e) => forcePlay(e.currentTarget)}
            />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(250,250,247,0.72)_0%,rgba(250,250,247,0.55)_40%,rgba(250,250,247,0.88)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_35%,rgba(250,250,247,0.35)_0%,transparent_70%)]" />
    </div>
  )
}
