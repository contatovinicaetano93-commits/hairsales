'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { CountUp } from '@/components/count-up'

interface AnimatedStatCardProps {
  value: string
  label: string
  index?: number
}

export function AnimatedStatCard({ value, label, index = 0 }: AnimatedStatCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const card = cardRef.current
    const progress = progressRef.current
    if (!card || !progress) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let hasAnimated = false

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated) return

        hasAnimated = true

        // Fade in card
        gsap.fromTo(
          card,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            delay: index * 0.1,
            ease: 'power2.out',
          }
        )

        // Animate progress bar
        gsap.fromTo(
          progress,
          { width: '0%' },
          {
            width: '100%',
            duration: 1.2,
            delay: index * 0.1 + 0.3,
            ease: 'power2.out',
          }
        )
      },
      { threshold: 0.4 }
    )

    observer.observe(card)
    return () => observer.disconnect()
  }, [index])

  return (
    <div ref={cardRef} className="flex flex-col items-center">
      <div className="text-center mb-4">
        <div className="text-4xl md:text-5xl font-serif text-gold mb-2 font-light">
          <CountUp value={value} />
        </div>
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div
            ref={progressRef}
            className="h-full bg-gradient-to-r from-gold via-gold to-gold/60"
            style={{
              boxShadow: '0 0 10px rgba(212, 175, 55, 0.4)',
            }}
          />
        </div>
      </div>
      <p className="text-sm text-muted text-center">{label}</p>
    </div>
  )
}
