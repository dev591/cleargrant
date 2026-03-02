import { useEffect, useState } from 'react'

const ScrollProgress = () => {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frameId: number;
    let targetProgress = 0;
    let currentProgress = 0;

    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      targetProgress = docHeight > 0 ? scrollTop / docHeight : 0
    }

    const animate = () => {
      currentProgress += (targetProgress - currentProgress) * 0.1;
      setProgress(currentProgress);
      frameId = requestAnimationFrame(animate);
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleScroll)
    frameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      cancelAnimationFrame(frameId);
    }
  }, [])

  const iconOffset = progress * 100

  return (
    <div
      style={{
        position: 'fixed',
        right: '18px',
        top: 0,
        width: '3px',
        height: '100vh',
        backgroundColor: 'rgba(0, 255, 148, 0.1)',
        zIndex: 60,
      }}
      onClick={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
        const clickY = e.clientY - rect.top
        const ratioRaw = rect.height > 0 ? clickY / rect.height : 0
        const ratio = Math.min(Math.max(ratioRaw, 0), 1)

        const docHeight =
          document.documentElement.scrollHeight - window.innerHeight
        const target = docHeight > 0 ? ratio * docHeight : 0
        window.scrollTo({ top: target, behavior: 'smooth' })
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: `${iconOffset}%`,
          backgroundColor: '#00FF94',
        }}
      />
      {/* Moving marker */}
      <div
        style={{
          position: 'absolute',
          top: `calc(${iconOffset}% - 14px)`,
          left: '50%',
          transform: 'translate(-50%, 0)',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          backgroundColor: '#000000',
          border: '2px solid #00FF94',
          boxShadow: '0 0 15px 4px rgba(0, 255, 148, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#00FF94',
          fontSize: '14px',
          fontWeight: 'bold',
          transition: 'box-shadow 0.2s ease',
        }}
      >
        ₹
      </div>
    </div>
  )
}

export default ScrollProgress

