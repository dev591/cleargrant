'use client'

import { useCallback, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useBackgroundTheme, type BackgroundTheme } from '../hooks/useBackgroundTheme'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  targetOpacity: number
  depth: number
  pulsePhase: number
}

interface Pulse {
  fromNode: number
  toNode: number
  progress: number
  speed: number
  opacity: number
  active: boolean
}

export default function BlockchainBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const theme = useBackgroundTheme()
  const currentThemeRef = useRef<BackgroundTheme>({ ...theme })
  const nodesRef = useRef<Node[]>([])
  const pulsesRef = useRef<Pulse[]>([])
  const mouseRef = useRef({ x: 0, y: 0, active: false })
  const tiltRef = useRef({ x: 0, y: 0 })
  const targetTiltRef = useRef({ x: 0, y: 0 })
  const scrollRef = useRef(0)
  const animFrameRef = useRef<number>(0)
  const lastPulseTimeRef = useRef(0)
  const burstRef = useRef(false)

  const initNodes = useCallback((count: number) => {
    const W = window.innerWidth
    const H = window.innerHeight * 3
    const sizeFactor = window.devicePixelRatio > 1.2 ? 0.9 : 1

    nodesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -(Math.random() * 0.3 + 0.1),
      radius: (Math.random() * 3 + 2.5) * sizeFactor,
      opacity: Math.random() * 0.5 + 0.3,
      targetOpacity: Math.random() * 0.5 + 0.3,
      depth: Math.random() * 0.7 + 0.3,
      pulsePhase: Math.random() * Math.PI * 2,
    }))
  }, [])

  const spawnPulse = useCallback(() => {
    const nodes = nodesRef.current
    if (nodes.length < 2) return
    let attempts = 0
    while (attempts < 20) {
      const a = Math.floor(Math.random() * nodes.length)
      let b = Math.floor(Math.random() * nodes.length)
      if (b === a) {
        attempts += 1
        continue
      }
      const dx = nodes[a].x - nodes[b].x
      const dy = nodes[a].y - nodes[b].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 280 && dist > 60) {
        pulsesRef.current.push({
          fromNode: a,
          toNode: b,
          progress: 0,
          speed: Math.random() * 0.008 + 0.005,
          opacity: 1,
          active: true,
        })
        return
      }
      attempts += 1
    }
  }, [])

  const triggerBurst = useCallback(() => {
    burstRef.current = true
    const nodes = nodesRef.current
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    nodes.forEach((n) => {
      const dx = n.x - cx
      const dy = n.y - cy
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      n.vx += (dx / dist) * 4
      n.vy += (dy / dist) * 4
    })
    for (let i = 0; i < 8; i += 1) spawnPulse()
    window.setTimeout(() => {
      burstRef.current = false
    }, 1500)
  }, [spawnPulse])

  useEffect(() => {
    ; (window as any).triggerBlockchainBurst = triggerBurst
    return () => {
      delete (window as any).triggerBlockchainBurst
    }
  }, [triggerBurst])

  useEffect(() => {
    gsap.to(currentThemeRef.current, {
      density: theme.density,
      speed: theme.speed,
      duration: 1.2,
      ease: 'power2.inOut',
    })
    window.setTimeout(() => {
      currentThemeRef.current.nodeColor = theme.nodeColor
      currentThemeRef.current.lineColor = theme.lineColor
      currentThemeRef.current.pulseColor = theme.pulseColor
      currentThemeRef.current.nodeShadow = theme.nodeShadow
    }, 600)
  }, [theme])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true }
      targetTiltRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 40,
        y: (e.clientY / window.innerHeight - 0.5) * 40,
      }
    }
    function onMouseLeave() {
      targetTiltRef.current = { x: 0, y: 0 }
      mouseRef.current.active = false
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseleave', onMouseLeave)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  useEffect(() => {
    function onScroll() {
      scrollRef.current = window.scrollY
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas!.getContext('2d')
    if (!ctx) return

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    initNodes(theme.density)

    let lastTime = 0

    function withAlpha(color: string, alpha: number) {
      return color.replace(/[\d.]+\)$/, `${alpha})`)
    }

    function draw(timestamp: number) {
      const dt = Math.min(timestamp - lastTime, 32)
      lastTime = timestamp

      const W = canvas!.width
      const H = canvas!.height
      const th = currentThemeRef.current
      const scroll = scrollRef.current
      const speed = th.speed

      ctx!.clearRect(0, 0, W, H)

      tiltRef.current.x +=
        (targetTiltRef.current.x - tiltRef.current.x) * 0.06
      tiltRef.current.y +=
        (targetTiltRef.current.y - tiltRef.current.y) * 0.06

      const tiltX = tiltRef.current.x
      const tiltY = tiltRef.current.y

      const nodes = nodesRef.current
      const now = timestamp

      nodes.forEach((node) => {
        node.x += node.vx * speed
        node.y += node.vy * speed
        node.y -= scroll * 0.00008
        node.pulsePhase += 0.015
        node.opacity = 0.35 + Math.sin(node.pulsePhase) * 0.25

        if (node.x < -20) node.x = W + 20
        if (node.x > W + 20) node.x = -20
        if (node.y < -40) node.y = H * 2
        if (node.y > H * 2) node.y = -40

        if (burstRef.current) {
          node.vx *= 0.97
          node.vy *= 0.97
        } else {
          node.vx += (Math.random() - 0.5) * 0.01 - node.vx * 0.002
          node.vy += (-0.15 * speed - node.vy) * 0.002
        }
      })

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i]
          const b = nodes[j]

          const ax = a.x + tiltX * a.depth
          const ay = a.y + tiltY * a.depth - scroll * a.depth * 0.12
          const bx = b.x + tiltX * b.depth
          const by = b.y + tiltY * b.depth - scroll * b.depth * 0.12

          const dx = ax - bx
          const dy = ay - by
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > 220) continue

          const alpha =
            (1 - dist / 220) * 0.4 * a.opacity * b.opacity * a.depth
          ctx!.beginPath()
          ctx!.moveTo(ax, ay)
          ctx!.lineTo(bx, by)
          ctx!.strokeStyle = withAlpha(th.lineColor, alpha)
          ctx!.lineWidth = 0.8
          ctx!.stroke()
        }
      }

      nodes.forEach((node) => {
        const nx = node.x + tiltX * node.depth
        const ny = node.y + tiltY * node.depth - scroll * node.depth * 0.12
        if (nx < -30 || nx > W + 30 || ny < -30 || ny > H + 30) return
        const alpha = node.opacity * node.depth
        ctx!.beginPath()
        ctx!.arc(nx, ny, node.radius * node.depth, 0, Math.PI * 2)
        ctx!.fillStyle = withAlpha(th.nodeColor, alpha)
        ctx!.shadowColor = th.nodeShadow
        ctx!.shadowBlur = 10 * node.depth
        ctx!.fill()
        ctx!.shadowBlur = 0
      })

      if (now - lastPulseTimeRef.current > 3000 + Math.random() * 1500) {
        spawnPulse()
        lastPulseTimeRef.current = now
      }

      const pulses = pulsesRef.current
      for (let i = pulses.length - 1; i >= 0; i -= 1) {
        const pulse = pulses[i]
        if (!pulse.active) {
          pulses.splice(i, 1)
          // eslint-disable-next-line no-continue
          continue
        }

        pulse.progress += pulse.speed * (dt / 16.67)
        if (pulse.progress >= 1) {
          pulse.active = false
          // eslint-disable-next-line no-continue
          continue
        }

        const fromNode = nodes[pulse.fromNode]
        const toNode = nodes[pulse.toNode]
        if (!fromNode || !toNode) {
          pulse.active = false
          // eslint-disable-next-line no-continue
          continue
        }

        const fx =
          fromNode.x + tiltX * fromNode.depth - scroll * fromNode.depth * 0.12
        const fy =
          fromNode.y + tiltY * fromNode.depth - scroll * fromNode.depth * 0.12
        const tx =
          toNode.x + tiltX * toNode.depth - scroll * toNode.depth * 0.12
        const ty =
          toNode.y + tiltY * toNode.depth - scroll * toNode.depth * 0.12

        const px = fx + (tx - fx) * pulse.progress
        const py = fy + (ty - fy) * pulse.progress

        pulse.opacity =
          pulse.progress < 0.8 ? 1 : (1 - pulse.progress) / 0.2

        ctx!.beginPath()
        ctx!.arc(px, py, 3.5, 0, Math.PI * 2)
        ctx!.fillStyle = withAlpha(th.pulseColor, pulse.opacity)
        ctx!.shadowColor = th.pulseColor
        ctx!.shadowBlur = 12
        ctx!.fill()
        ctx!.shadowBlur = 0

        const trailLen = 0.08
        const t0 = Math.max(0, pulse.progress - trailLen)
        const t0x = fx + (tx - fx) * t0
        const t0y = fy + (ty - fy) * t0
        const grad = ctx!.createLinearGradient(t0x, t0y, px, py)
        grad.addColorStop(0, withAlpha(th.pulseColor, 0))
        grad.addColorStop(
          1,
          withAlpha(th.pulseColor, pulse.opacity * 0.6),
        )
        ctx!.beginPath()
        ctx!.moveTo(t0x, t0y)
        ctx!.lineTo(px, py)
        ctx!.strokeStyle = grad
        ctx!.lineWidth = 1.5
        ctx!.stroke()
      }

      // Cursor halo – extra circles that follow the mouse
      if (mouseRef.current.active) {
        const mx = mouseRef.current.x + tiltX * 0.2
        const my = mouseRef.current.y + tiltY * 0.2

        ctx!.save()
        ctx!.shadowColor = th.pulseColor
        ctx!.shadowBlur = 18

        // Outer soft ring
        ctx!.beginPath()
        ctx!.arc(mx, my, 26, 0, Math.PI * 2)
        ctx!.strokeStyle = withAlpha(th.pulseColor, 0.25)
        ctx!.lineWidth = 2
        ctx!.stroke()

        // Middle ring
        ctx!.beginPath()
        ctx!.arc(mx, my, 16, 0, Math.PI * 2)
        ctx!.strokeStyle = withAlpha(th.pulseColor, 0.5)
        ctx!.lineWidth = 1.4
        ctx!.stroke()

        // Small orbiting dots
        const orbitRadius = 20
        const t = now * 0.004
        for (let i = 0; i < 3; i += 1) {
          const angle = t + (i * Math.PI * 2) / 3
          const ox = mx + Math.cos(angle) * orbitRadius
          const oy = my + Math.sin(angle) * orbitRadius
          ctx!.beginPath()
          ctx!.arc(ox, oy, 3, 0, Math.PI * 2)
          ctx!.fillStyle = withAlpha(th.pulseColor, 0.9)
          ctx!.fill()
        }

        ctx!.restore()
      }

      animFrameRef.current = window.requestAnimationFrame(draw)
    }

    animFrameRef.current = window.requestAnimationFrame(draw)

    return () => {
      window.cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [initNodes, spawnPulse, theme.density])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  )
}

