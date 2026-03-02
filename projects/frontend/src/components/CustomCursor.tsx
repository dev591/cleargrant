import { useEffect, useRef } from 'react'

const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor

const CustomCursor = () => {
  const dotRef = useRef<HTMLDivElement | null>(null)
  const ringRef = useRef<HTMLDivElement | null>(null)
  const mouseX = useRef(0)
  const mouseY = useRef(0)
  const ringX = useRef(0)
  const ringY = useRef(0)
  const isHovering = useRef(false)
  const hoveredElement = useRef<HTMLElement | null>(null)
  const frameIdRef = useRef<number | null>(null)
  const hoverablesRef = useRef<HTMLElement[]>([])

  useEffect(() => {
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    const handleMove = (e: MouseEvent) => {
      mouseX.current = e.clientX
      mouseY.current = e.clientY

      dot.style.transform = `translate(${mouseX.current - 5}px, ${mouseY.current - 5}px) scale(${isHovering.current ? 0 : 1
        })`

      // Magnetic effect on the hovered element
      if (isHovering.current && hoveredElement.current) {
        const el = hoveredElement.current
        const rect = el.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2

        // Calculate distance from center (max ~50px pull)
        const distX = e.clientX - centerX
        const distY = e.clientY - centerY

        // Only apply magnetic pull if within reasonable distance (fallback check)
        el.style.transform = `translate(${distX * 0.15}px, ${distY * 0.15}px)`
      }
    }

    const handleHoverStart = (e: Event) => {
      isHovering.current = true
      hoveredElement.current = e.currentTarget as HTMLElement
      dot.style.transform = `translate(${mouseX.current - 5}px, ${mouseY.current - 5}px) scale(0)`
      ring.style.transform += ' scale(2)'
    }

    const handleHoverEnd = (e: Event) => {
      isHovering.current = false
      const el = e.currentTarget as HTMLElement
      el.style.transform = 'translate(0px, 0px)' // reset magnetic
      hoveredElement.current = null
      dot.style.transform = `translate(${mouseX.current - 5}px, ${mouseY.current - 5}px) scale(1)`
      ring.style.transform = ring.style.transform.replace(/scale\([0-9.]+\)/, '')
    }

    const animateRing = () => {
      ringX.current = lerp(ringX.current, mouseX.current, 0.1) // lag 0.1
      ringY.current = lerp(ringY.current, mouseY.current, 0.1)
      ring.style.transform = `translate(${ringX.current - 20}px, ${ringY.current - 20}px)${isHovering.current ? ' scale(2)' : ''
        }`
      frameIdRef.current = window.requestAnimationFrame(animateRing)
    }

    document.addEventListener('mousemove', handleMove)

    // Magnetic target setup
    const updateHoverables = () => {
      hoverablesRef.current.forEach((el) => {
        el.removeEventListener('mouseenter', handleHoverStart)
        el.removeEventListener('mouseleave', handleHoverEnd)
        // Ensure reset transition for magnetic return
        el.style.transition = 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease'
      })

      hoverablesRef.current = Array.from(document.querySelectorAll<HTMLElement>('a, button, [data-hover]'))
      hoverablesRef.current.forEach((el) => {
        el.addEventListener('mouseenter', handleHoverStart)
        el.addEventListener('mouseleave', handleHoverEnd)
        el.style.transition = 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease'
      })
    }

    updateHoverables()
    // Periodic refresh in case dynamic elements are added
    const interval = setInterval(updateHoverables, 2000)

    frameIdRef.current = window.requestAnimationFrame(animateRing)

    return () => {
      document.removeEventListener('mousemove', handleMove)
      clearInterval(interval)
      hoverablesRef.current.forEach((el) => {
        el.removeEventListener('mouseenter', handleHoverStart)
        el.removeEventListener('mouseleave', handleHoverEnd)
      })
      if (frameIdRef.current != null) {
        window.cancelAnimationFrame(frameIdRef.current)
      }
    }
  }, [])

  return (
    <>
      <div
        ref={dotRef}
        style={{
          position: 'fixed',
          width: '10px',
          height: '10px',
          borderRadius: '9999px',
          backgroundColor: '#00FF94',
          pointerEvents: 'none',
          zIndex: 10000,
          mixBlendMode: 'difference',
          transform: 'translate(-9999px, -9999px)',
          transition: 'transform 0.1s ease-out',
        }}
      />
      <div
        ref={ringRef}
        style={{
          position: 'fixed',
          width: '40px',
          height: '40px',
          borderRadius: '9999px',
          border: '1.5px solid #00FF94',
          pointerEvents: 'none',
          zIndex: 9999,
          transform: 'translate(-9999px, -9999px)',
          transition: 'transform 0.1s ease-out',
        }}
      />
    </>
  )
}

export default CustomCursor


