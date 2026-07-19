'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

const COLUMNS: { id: string; images: string[] }[] = [
  {
    id: 'nails',
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

const INTERVAL_MS = 3200

function PhotoColumn({ images, offsetMs }: { images: string[]; offsetMs: number }) {
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
          key={src}
          src={src}
          alt=""
          fill
          sizes="33vw"
          priority={i === 0}
          className={`object-cover transition-opacity duration-1000 ease-out ${
            i === index ? 'opacity-100' : 'opacity-0'
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
      <div className="absolute inset-0 grid grid-cols-3">
        {COLUMNS.map((col, i) => (
          <PhotoColumn key={col.id} images={col.images} offsetMs={i * 700} />
        ))}
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(250,250,247,0.72)_0%,rgba(250,250,247,0.55)_40%,rgba(250,250,247,0.88)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_35%,rgba(250,250,247,0.35)_0%,transparent_70%)]" />
    </div>
  )
}
