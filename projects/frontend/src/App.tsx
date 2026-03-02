import { useEffect } from 'react'
import { NetworkId, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider } from 'notistack'
import { Route, Routes } from 'react-router-dom'
import CustomCursor from './components/CustomCursor'
import NoiseOverlay from './components/NoiseOverlay'
import ScrollProgress from './components/ScrollProgress'
import Navbar from './components/Navbar'
import PageTransition from './components/PageTransition'
import BlockchainBackground from './components/BlockchainBackground'
import Home from './pages/Home'
import DevTools from './DevTools'
import Dashboard from './pages/Dashboard'
import BrowseGrants from './pages/BrowseGrants'
import GrantDetail from './pages/GrantDetail'
import ApplyGrant from './pages/ApplyGrant'
import SubmitMilestone from './pages/SubmitMilestone'
import SponsorDashboard from './pages/SponsorDashboard'
import LenderDashboard from './pages/LenderDashboard'
import EscrowVault from './pages/EscrowVault'
import Profile from './pages/Profile'
import { apiGet, apiPost } from './utils/api'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

// WalletManager is instantiated below with WalletId.PERA

const Placeholder = ({ title }: { title: string }) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-24">
      <div className="max-w-2xl text-center">
        <p className="text-xs tracking-[0.24em] uppercase text-[var(--text-muted)] mb-3">ClearGrant</p>
        <h1 className="font-headline text-[48px] md:text-[64px] leading-none text-[var(--text-primary)] mb-4">
          {title}
        </h1>
        <p className="text-[15px] text-[var(--text-secondary)]">
          This section of the ClearGrant experience is coming next. Core blockchain actions remain fully functional
          while we finish the new shell.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const algodConfig = getAlgodConfigFromViteEnvironment()

  const walletManager = new WalletManager({
    wallets: [WalletId.PERA],
    defaultNetwork: NetworkId.TESTNET,
    networks: {
      [NetworkId.TESTNET]: {
        algod: {
          baseServer: 'https://testnet-api.algonode.cloud',
          port: '',
          token: '',
        },
      },
    },
    options: {
      resetNetwork: true,
    },
  })

  useEffect(() => {
    // 🔌 BACKEND: POST /seed
    apiPost('/seed', {})
      .then(() => console.log('ClearGrant: seeded ✅'))
      .catch((e) => console.warn('Seed skipped:', e))
  }, [])

  return (
    <SnackbarProvider maxSnack={3}>
      <WalletProvider manager={walletManager}>
        <CustomCursor />
        <NoiseOverlay />
        <ScrollProgress />
        <div className="relative z-[1] min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
          <BlockchainBackground />
          <Navbar />
          <main className="relative z-[1] pt-20">
            <PageTransition>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/devtools" element={<DevTools />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/grants" element={<BrowseGrants />} />
                <Route path="/grants/:id" element={<GrantDetail />} />
                <Route path="/grants/:id/apply" element={<ApplyGrant />} />
                <Route path="/milestones/:grantId/:index" element={<SubmitMilestone />} />
                <Route path="/sponsor" element={<SponsorDashboard />} />
                <Route path="/lender-dashboard" element={<LenderDashboard />} />
                <Route path="/escrow" element={<EscrowVault />} />
                <Route path="/profile" element={<Profile />} />
              </Routes>
            </PageTransition>
          </main>
        </div>
      </WalletProvider>
    </SnackbarProvider>
  )
}

