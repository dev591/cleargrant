import { useLocation } from 'react-router-dom'
import { useMemo } from 'react'

export interface BackgroundTheme {
  nodeColor: string
  lineColor: string
  pulseColor: string
  nodeShadow: string
  density: number
  speed: number
}

const THEMES: Record<string, BackgroundTheme> = {
  landing: {
    nodeColor: 'rgba(10, 124, 89, 0.32)',
    lineColor: 'rgba(10, 124, 89, 0.16)',
    pulseColor: 'rgba(18, 168, 118, 1)',
    nodeShadow: 'rgba(10, 124, 89, 0.55)',
    density: 55,
    speed: 0.4,
  },
  dashboard: {
    nodeColor: 'rgba(184, 134, 11, 0.3)',
    lineColor: 'rgba(184, 134, 11, 0.14)',
    pulseColor: 'rgba(184, 134, 11, 1)',
    nodeShadow: 'rgba(184, 134, 11, 0.5)',
    density: 45,
    speed: 0.35,
  },
  grants: {
    nodeColor: 'rgba(10, 124, 89, 0.3)',
    lineColor: 'rgba(10, 124, 89, 0.14)',
    pulseColor: 'rgba(18, 168, 118, 0.95)',
    nodeShadow: 'rgba(10, 124, 89, 0.5)',
    density: 50,
    speed: 0.38,
  },
  milestone: {
    nodeColor: 'rgba(10, 124, 89, 0.38)',
    lineColor: 'rgba(10, 124, 89, 0.2)',
    pulseColor: 'rgba(18, 168, 118, 1)',
    nodeShadow: 'rgba(10, 124, 89, 0.65)',
    density: 60,
    speed: 0.5,
  },
  sponsor: {
    nodeColor: 'rgba(184, 134, 11, 0.34)',
    lineColor: 'rgba(184, 134, 11, 0.18)',
    pulseColor: 'rgba(184, 134, 11, 1)',
    nodeShadow: 'rgba(184, 134, 11, 0.6)',
    density: 48,
    speed: 0.4,
  },
  profile: {
    nodeColor: 'rgba(26, 24, 20, 0.22)',
    lineColor: 'rgba(26, 24, 20, 0.12)',
    pulseColor: 'rgba(10, 124, 89, 0.9)',
    nodeShadow: 'rgba(26, 24, 20, 0.45)',
    density: 42,
    speed: 0.32,
  },
  default: {
    nodeColor: 'rgba(10, 124, 89, 0.26)',
    lineColor: 'rgba(10, 124, 89, 0.12)',
    pulseColor: 'rgba(18, 168, 118, 0.9)',
    nodeShadow: 'rgba(10, 124, 89, 0.45)',
    density: 50,
    speed: 0.38,
  },
}

export function useBackgroundTheme(): BackgroundTheme {
  const { pathname } = useLocation()

  return useMemo(() => {
    let theme: BackgroundTheme
    if (pathname === '/' || pathname === '/home') theme = THEMES.landing
    else if (pathname.includes('dashboard')) theme = THEMES.dashboard
    else if (pathname.includes('milestone')) theme = THEMES.milestone
    else if (pathname.includes('sponsor')) theme = THEMES.sponsor
    else if (pathname.includes('profile')) theme = THEMES.profile
    else if (pathname.includes('grant')) theme = THEMES.grants
    else theme = THEMES.default

    // Reduce density slightly on small screens
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const density = isMobile ? Math.round(theme.density * 0.5) : theme.density

    return { ...theme, density }
  }, [pathname])
}

