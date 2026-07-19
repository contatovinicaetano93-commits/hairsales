'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

const INTERVAL_MS = 3200

const COLUMNS: { id: string; label: string; images: string[] }[] = [
  {
    id: 'nails',
    label: 'Unhas',
    images: [
      '/landing/slides/nails/frame-01.jpg',
      '/landing/slides/nails/frame-02.jpg',
      '/landing/slides/nails/frame-03.jpg',
      '/landing/slides/nails/frame-04.jpg',
      '/landing/slides/nails/frame-05.jpg',
      '/landing/slides/nails/frame-06.jpg',
      '/landing/slides/nails/frame-07.jpg',
      '/landing/slides/nails/frame-08.jpg',
      '/landing/slides/nails/frame-09.jpg',
    ],
  },
  {
    id: 'hair',
    label: 'Cabelo',
    images: [
      '/landing/slides/hair/frame-01.jpg',
      '/landing/slides/hair/frame-02.jpg',
      '/landing/slides/hair/frame-03.jpg',
      '/landing/slides/hair/frame-04.jpg',
      '/landing/slides/hair/frame-05.jpg',
      '/landing/slides/hair/frame-06.jpg',
      '/landing/slides/hair/frame-07.jpg',
    ],
  },
  {
    id: 'barber',
    label: 'Barbearia',
    images: [
      '/landing/slides/barber/frame-01.jpg',
      '/landing/slides/barber/frame-03.jpg',
      '/landing/slides/barber/frame-05.jpg',
      '/landing/slides/barber/frame-07.jpg',
      '/landing/slides/barber/frame-09.jpg',
      '/landing/slides/barber/frame-11.jpg',
      '/landing/slides/barber/frame-13.jpg',
      '/landing/slides/barber/frame-15.jpg',
    ],
  },
]

const ALL_IMAGES = COLUMNS.flatMap((col) => col.images)

function PhotoColumn({
  images,
  offsetMs,
  imageSizes,
}: {
  images: string[]
  offsetMs: number
  imageSizes: string
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return
    let timer: ReturnType<typeof setInterval> | undefined
    const start = window.setTimeout(() => {
      timer = setInterval(() => {
        setIndex((i) => (i + 1) % images.length)
      }, INTERVAL_MS)
    }, offsetMs)
    return () => {
      window.clearTimeout(start)
      if (timer) clearInterval(timer)
    }
  }, [images.length, offsetMs])

  return (
    <div className="relative min-h-0 overflow-hidden bg-surface">
      {images.map((src, i) => (
        <Image
          key={`${src}-${i === index ? 'active' : 'idle'}`}
          src={src}
          alt=""
          fill
          sizes={imageSizes}
          priority={i === 0}
          className={`object-cover transition-opacity duration-1000 ease-out ${
            i === index ? 'animate-hero-ken-burns opacity-100' : 'scale-100 opacity-0'
          }`}
        />
      ))}
    </div>
  )
}

/** Três colunas de fotos em sequência (estilo vitrine), atrás do texto do hero. */
export function HeroVideoBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 block sm:hidden">
        <PhotoColumn images={ALL_IMAGES} offsetMs={0} imageSizes="100vw" />
      </div>

      <div className="absolute inset-0 hidden grid-cols-3 sm:grid">
        {COLUMNS.map((col, i) => (
          <div key={col.id} className="relative min-h-0">
            <PhotoColumn images={col.images} offsetMs={i * 700} imageSizes="33vw" />
            <span className="absolute inset-x-0 bottom-3 z-10 text-center text-[0.62rem] font-bold uppercase tracking-[0.22em] text-white/85 drop-shadow-[0_1px_4px_rgba(26,23,20,0.75)]">
              {col.label}
            </span>
          </div>
        ))}
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(250,250,247,0.72)_0%,rgba(250,250,247,0.55)_40%,rgba(250,250,247,0.88)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_35%,rgba(250,250,247,0.35)_0%,transparent_70%)]" />
    </div>
  )
}
