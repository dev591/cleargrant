import { useWallet, WalletId } from '@txnlab/use-wallet-react'
import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

const Navbar = () => {
  const { activeAddress, wallets } = useWallet()
  const [scrolled, setScrolled] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [algoBalance, setAlgoBalance] = useState<string>('0.00')
  const [pathBalance, setPathBalance] = useState<string>('0')
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (activeAddress) {
      fetch(`https://testnet-api.algonode.cloud/v2/accounts/${activeAddress}`)
        .then(res => res.json())
        .then(data => {
          if (data.amount !== undefined) {
            setAlgoBalance((data.amount / 1000000).toFixed(2))
          }
          const pathAsset = data.assets?.find((a: any) => a['asset-id'] === 756376747)
          if (pathAsset) {
            setPathBalance(pathAsset.amount.toString())
          }
        })
        .catch(console.error)
    }
  }, [activeAddress])

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60)
    }
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'px-3 py-1 text-[14px] tracking-wide',
      'transition-colors border-b-2',
      isActive ? 'text-[#00FF94] border-[#00FF94]' : 'text-[var(--text-secondary)] border-transparent',
    ].join(' ')

  const handleLogoClick = () => {
    navigate('/')
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'backdrop-blur-xl border-b border-[#00FF94]' : 'border-b border-transparent'
        }`}
      style={{
        backgroundColor: scrolled ? 'rgba(0, 0, 0, 0.4)' : 'transparent',
      }}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:py-4">
        <button
          type="button"
          onClick={handleLogoClick}
          className="flex items-baseline gap-2 group"
          aria-label="ClearGrant home"
        >
          <div
            className="font-headline text-[24px] leading-none text-[#00FF94]"
            style={{ transition: 'transform 0.3s ease-in-out' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'rotate(360deg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'rotate(0deg)';
            }}
            data-hover
          >
            CG
          </div>
          <span className="text-[16px] font-medium tracking-[0.12em] uppercase text-[var(--text-primary)]">
            ClearGrant
          </span>
        </button>

        <div className="hidden items-center gap-4 md:flex">
          <NavLink to="/grants" className={navLinkClass}>
            Browse Grants
          </NavLink>
          <NavLink to="/dashboard" className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/sponsor" className={navLinkClass}>
            Sponsor
          </NavLink>
          <NavLink to="/lender-dashboard" className={navLinkClass}>
            Lender Command
          </NavLink>
          <NavLink to="/escrow" className={navLinkClass}>
            ZK Escrow
          </NavLink>
          <NavLink to="/profile" className={navLinkClass}>
            Profile
          </NavLink>
          <NavLink to="/devtools" className={navLinkClass}>
            Dev Tools
          </NavLink>
        </div>

        <div className="flex items-center gap-4">
          {activeAddress ? (
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-[12px] font-mono-chain text-[#00FF94]">
                {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)]">
                {algoBalance} ALGO • {pathBalance} PATH
              </span>
            </div>
          ) : null}
          <button
            type="button"
            className="btn btn-primary text-[11px] px-4 py-2"
            data-hover
            onClick={() => {
              if (activeAddress) {
                // If already connected, maybe let them disconnect
                wallets?.find(w => w.isActive)?.disconnect()
              } else {
                setShowWalletModal(true)
              }
            }}
          >
            {activeAddress ? 'Disconnect' : 'Connect Wallet'}
          </button>
        </div>
      </nav>

      {/* Custom Wallet Modal for Demo */}
      {showWalletModal && !activeAddress && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[var(--bg-primary)] border border-[#00FF94] p-6 max-w-sm w-full mx-4 shadow-[0_0_30px_rgba(0,255,148,0.1)]">
            <h3 className="font-headline text-[24px] text-[#00FF94] mb-2 uppercase tracking-wide">Connect Wallet</h3>
            <p className="text-[12px] text-[var(--text-secondary)] mb-6">Select how you want to connect to Algorand Testnet.</p>

            <div className="flex flex-col gap-3">
              <button
                className="btn btn-outline border-[#00FF94] text-[var(--text-primary)] hover:bg-[#00FF94] hover:text-black w-full"
                onClick={() => {
                  wallets?.find(w => w.id === WalletId.PERA)?.connect()
                  setShowWalletModal(false)
                }}
              >
                Pera Chrome Extension
              </button>
              <button
                className="btn btn-outline border-[var(--accent)] text-[var(--text-primary)] hover:bg-[var(--accent)] hover:text-black w-full"
                onClick={() => {
                  wallets?.find(w => w.id === WalletId.PERA)?.connect()
                  setShowWalletModal(false)
                }}
              >
                Scan QR with Pera Mobile
              </button>
            </div>

            <button
              className="mt-6 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] uppercase tracking-widest w-full"
              onClick={() => setShowWalletModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

export default Navbar

