import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface StatCardProps {
  label: string
  value: number
  prefix?: string
  suffix?: string
  animate?: boolean
}

const StatCard = ({ label, value, prefix, suffix, animate = true }: StatCardProps) => {
  const valueRef = useRef<HTMLSpanElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!animate || !valueRef.current || !containerRef.current) return

    const el = valueRef.current
    const ctx = gsap.context(() => {
      const obj = { val: 0 }
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top 80%',
        onEnter: () => {
          gsap.to(obj, {
            val: value,
            duration: 1.2,
            snap: "1",
            ease: 'power2.out',
            onUpdate: () => {
              el.textContent = `${prefix ?? ''}${Math.round(obj.val).toLocaleString()}${suffix ?? ''}`
            },
          })
        },
      })
    }, containerRef)

    return () => {
      ctx.revert()
    }
  }, [animate, prefix, suffix, value])

  return (
    <div
      ref={containerRef}
      className="flex flex-col justify-between rounded-md bg-[var(--bg-secondary)] px-4 py-3 shadow-sm border border-[var(--border)]"
    >
      <span className="text-[12px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</span>
      <span className="mt-2 font-headline text-[32px] text-[var(--gold)] leading-none">
        <span ref={valueRef}>{`${prefix ?? ''}${value.toLocaleString()}${suffix ?? ''}`}</span>
      </span>
    </div>
  )
}

export default StatCard

