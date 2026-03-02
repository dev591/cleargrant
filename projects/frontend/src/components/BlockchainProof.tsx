import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface BlockchainProofProps {
  txId: string
  explorerUrl: string
  verified: boolean
  label: string
}

const truncateTx = (txId: string) => {
  if (!txId) return ''
  if (txId.length <= 16) return txId
  return `${txId.slice(0, 8)}...${txId.slice(-6)}`
}

const BlockchainProof = ({ txId, explorerUrl, verified, label }: BlockchainProofProps) => {
  const [copied, setCopied] = useState(false)
  const [displayedTx, setDisplayedTx] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const truncated = truncateTx(txId)

  useEffect(() => {
    let currentIndex = 0
    const interval = setInterval(() => {
      if (currentIndex <= truncated.length) {
        setDisplayedTx(truncated.slice(0, currentIndex))
        currentIndex++
      } else {
        clearInterval(interval)
      }
    }, 40)
    return () => clearInterval(interval)
  }, [truncated])

  useEffect(() => {
    if (containerRef.current) {
      const color = verified ? 'rgba(0, 255, 148, 0.4)' : 'rgba(255, 68, 68, 0.4)'
      gsap.fromTo(
        containerRef.current,
        { boxShadow: '0 0 0px 0px rgba(0,0,0,0)' },
        {
          boxShadow: `0 0 15px 2px ${color}`,
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
        }
      )
    }
  }, [verified])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(txId)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // ignore
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative mt-3 rounded-md bg-[var(--bg-secondary)] px-4 py-3 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.01]"
    >
      <div
        className="h-full w-[3px] rounded-sm"
        style={{ backgroundColor: verified ? '#00FF94' : 'var(--danger)' }}
      />
      <div className="flex items-center gap-3">
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: verified ? '#00FF94' : 'var(--danger)' }}
        />
        <div className="flex flex-col">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            {verified ? 'Verified On-Chain' : 'Pending On-Chain'}
          </span>
          <span className="text-xs text-[var(--text-muted)]">{label}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="ml-auto flex flex-col items-end text-left"
        data-hover
      >
        <span className="font-mono-chain text-[11px] text-[var(--text-secondary)] underline decoration-dotted min-h-[16px]">
          {displayedTx}
        </span>
        <span className="text-[10px] text-[var(--text-muted)]">Click to copy</span>
      </button>
      <a
        href={explorerUrl}
        target="_blank"
        rel="noreferrer"
        className="ml-4 text-[11px] text-[#00FF94] underline decoration-[#00FF94] flex items-center gap-1"
        data-hover
      >
        View on Explorer <span className="float-arrow">→</span>
      </a>
      {copied && (
        <div className="absolute -top-6 right-4 rounded-sm bg-[var(--bg-elevated)] px-2 py-1 text-[10px] text-[var(--text-secondary)] shadow">
          Copied!
        </div>
      )}
    </div>
  )
}

export default BlockchainProof

