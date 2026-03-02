import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { gsap } from 'gsap'
import BlockchainProof from '../components/BlockchainProof'
import StatCard from '../components/StatCard'
import { apiGet, apiPatch } from '../utils/api'
import { callN8n } from '../utils/callN8n'
import { N8N_REPUTATION } from '../config'

const DEMO_WALLET = 'DEMO7XKLMNPQRST2UVWXYZ3ABCDEFGHIJKLMNO'

const Dashboard = () => {
  const { activeAddress } = useWallet()
  const walletAddress = activeAddress ?? DEMO_WALLET
  const navigate = useNavigate()

  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [reputationResult, setReputationResult] = useState<any>(null)
  const [reputationLoading, setReputationLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const scoreRef = useRef<HTMLSpanElement | null>(null)
  const requestIdRef = useRef(0)

  const fetchData = () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)

    Promise.all([
      apiGet(`/users/${walletAddress}`),
      apiGet('/stats'),
      apiGet(`/applications/${walletAddress}`),
    ])
      .then(([userRes, statsRes, appsRes]) => {
        if (requestIdRef.current !== requestId) return
        setUser(userRes)
        setStats(statsRes)
        const appsArray = Array.isArray(appsRes) ? appsRes : appsRes.applications ?? []
        setApplications(appsArray)

        const firstGrantId = appsArray[0]?.grantId
        if (firstGrantId) {
          // 🔌 BACKEND: GET /transactions/:grantId
          return apiGet(`/transactions/${firstGrantId}`).then((tx) => {
            if (requestIdRef.current !== requestId) return
            setTransactions(Array.isArray(tx) ? tx : [])
          })
        }
        setTransactions([])
        return null
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) return
        setError('Failed to load dashboard data.')
      })
      .finally(() => {
        if (requestIdRef.current !== requestId) return
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress])

  // Entrance animations once data loaded
  useEffect(() => {
    if (loading) return
    const tl = gsap.timeline()
    tl.from('.dash-topbar', { y: -20, opacity: 0, duration: 0.4 })
      .from('.dash-statcard', { y: 30, opacity: 0, stagger: 0.1, duration: 0.4 }, '-=0.2')
      .from('.dash-left', { x: -40, opacity: 0, duration: 0.4 }, '-=0.2')
      .from('.dash-right', { x: 40, opacity: 0, duration: 0.4 }, '-=0.4')
      .from('.dash-reputation', { y: 40, opacity: 0, duration: 0.5 }, '-=0.2')
  }, [loading])

  const truncatedWallet = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
  const rawReputationScore = user?.reputationScore ?? 0
  const reputationScore = Math.max(0, Math.min(rawReputationScore, 100))
  const reputationTier = user?.reputationTier ?? 'BUILDER'

  const handleRecalculateScore = async () => {
    if (!user) return
    setReputationLoading(true)
    try {
      // 🤖 AI: POST webhook/reputation-score
      const data = await callN8n(N8N_REPUTATION, walletAddress, {
        grantsCompleted: user?.grantsCompleted ?? 0,
        milestonesCompleted: user?.milestonesCompleted ?? 0,
        totalMilestones: user?.totalMilestones ?? 0,
        votingParticipation: user?.votingParticipation ?? 0,
        domain: user?.domain ?? 'Technology',
      })

      setReputationResult(data)

      const newScore = Math.max(0, Math.min(data.result?.score ?? reputationScore, 100))

      // 🔌 BACKEND: PATCH /users/:walletAddress
      await apiPatch(`/users/${walletAddress}`, {
        reputationScore: newScore,
        reputationTier: data.result?.tier ?? reputationTier,
      })

      if (scoreRef.current) {
        const obj = { val: reputationScore }
        gsap.to(obj, {
          val: newScore,
          duration: 1.1,
          ease: 'power2.out',
          onUpdate: () => {
            if (scoreRef.current) {
              scoreRef.current.textContent = Math.round(obj.val).toString()
            }
          },
        })
      }
    } catch {
      // ignore for now
    } finally {
      setReputationLoading(false)
    }
  }

  const renderStatusBadge = (status: string) => {
    const base =
      'inline-flex items-center uppercase tracking-[0.08em] text-[11px] px-3 py-1 mr-3 clip-path-[polygon(4px_0%,100%_0%,calc(100%_-_4px)_100%,0%_100%)]'
    switch (status) {
      case 'APPROVED':
        return (
          <span className={`${base} bg-[#E8F5E8] text-[#2E7D32] border border-[#C8E6C9]`}>APPROVED</span>
        )
      case 'REJECTED':
        return (
          <span className={`${base} bg-[var(--danger-light)] text-[var(--danger)] border border-[var(--danger)]`}>
            REJECTED
          </span>
        )
      case 'SUBMITTED':
        return (
          <span
            className={`${base} bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--accent)]`}
          >
            SUBMITTED
          </span>
        )
      case 'PENDING':
      default:
        return (
          <span
            className={`${base} bg-[var(--gold-light)] text-[var(--gold)] border border-[var(--gold)]`}
          >
            PENDING
          </span>
        )
    }
  }

  const getExplorerUrl = (txId: string, explicit?: string) =>
    explicit || `https://testnet.algoexplorer.io/tx/${txId}`

  if (error && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="font-headline text-[32px] text-[var(--text-primary)] mb-3">COULDN&apos;T LOAD DASHBOARD</h1>
          <p className="text-[15px] text-[var(--text-muted)]">
            Make sure the backend API is running and reachable via the configured API base URL.
          </p>
          <button
            type="button"
            className="btn btn-secondary mt-4"
            onClick={fetchData}
            data-hover
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const loadingSkeleton = (
    <div className="animate-pulse space-y-8">
      <div className="dash-topbar flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="h-8 w-48 bg-[var(--bg-secondary)] rounded-sm" />
        <div className="h-8 w-36 bg-[var(--bg-secondary)] rounded-sm" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            className="h-24 bg-[var(--bg-secondary)] rounded-sm dash-statcard"
          />
        ))}
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              className="h-16 bg-[var(--bg-secondary)] rounded-sm"
            />
          ))}
        </div>
        <div className="flex-1 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              className="h-14 bg-[var(--bg-secondary)] rounded-sm"
            />
          ))}
        </div>
      </div>
      <div className="h-40 bg-[var(--bg-secondary)] rounded-sm dash-reputation" />
    </div>
  )

  const approvedApp = applications.find((a) => a.status === 'APPROVED')

  return (
    <div className="relative z-[1] bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-5 md:px-12 py-10">
        {loading ? (
          loadingSkeleton
        ) : (
          <>
            {/* Top bar */}
            <div className="dash-topbar flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
              <div>
                <p className="text-[13px] uppercase tracking-[0.15em] text-[var(--text-muted)] mb-1">
                  Welcome back,
                </p>
                <p
                  className="font-headline text-[32px] md:text-[42px] text-[var(--text-primary)]"
                  title={walletAddress}
                >
                  {truncatedWallet}
                </p>
              </div>
              <div
                className="inline-flex items-center gap-2 bg-[var(--accent-light)] border border-[var(--accent)] px-4 py-1.5"
                style={{
                  clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
                }}
              >
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent)]" />
                <span className="text-[12px] uppercase tracking-[0.1em] text-[var(--accent)]">
                  {reputationTier} BUILDER
                </span>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div
                className="dash-statcard border border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-4"
                style={{
                  borderLeftWidth: '3px',
                  borderLeftColor: 'var(--accent)',
                  clipPath: 'polygon(10px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 10px)',
                }}
              >
                <StatCard label="My Applications" value={applications.length} animate suffix="" />
              </div>
              <div
                className="dash-statcard border border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-4"
                style={{
                  borderLeftWidth: '3px',
                  borderLeftColor: 'var(--accent)',
                  clipPath: 'polygon(10px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 10px)',
                }}
              >
                <StatCard
                  label="Milestones Due"
                  value={applications.filter((a) => a.status === 'APPROVED').length}
                  animate
                  suffix=""
                />
              </div>
              <div
                className="dash-statcard border border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-4"
                style={{
                  borderLeftWidth: '3px',
                  borderLeftColor: 'var(--accent)',
                  clipPath: 'polygon(10px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 10px)',
                }}
              >
                <StatCard
                  label="Total Received"
                  value={user?.totalReceived ?? 0}
                  animate
                  prefix="₹"
                  suffix=" ALGO"
                />
              </div>
              <div
                className="dash-statcard border border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-4"
                style={{
                  borderLeftWidth: '3px',
                  borderLeftColor: 'var(--accent)',
                  clipPath: 'polygon(10px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 10px)',
                }}
              >
                <StatCard
                  label="Reputation Score"
                  value={reputationScore}
                  animate
                  suffix="/100"
                />
              </div>
            </div>

            {/* Two-column main */}
            <div className="flex flex-col lg:flex-row gap-6 mt-6">
              {/* Left – My Applications */}
              <section className="dash-left flex-[3]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-headline text-[24px] md:text-[28px] text-[var(--text-primary)]">
                    MY APPLICATIONS
                  </h2>
                  <button
                    type="button"
                    className="btn btn-secondary text-[12px] px-3 py-1.5"
                    onClick={() => navigate('/grants')}
                    data-hover
                  >
                    Browse Grants →
                  </button>
                </div>
                {applications.length === 0 ? (
                  <div className="mt-4 rounded-md border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-8 text-center">
                    <p className="text-[15px] text-[var(--text-muted)]">No applications yet.</p>
                    <button
                      type="button"
                      className="btn btn-primary mt-4"
                      onClick={() => navigate('/grants')}
                      data-hover
                    >
                      Browse Open Grants →
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {applications.map((app) => (
                      <div
                        key={app.id}
                        className="py-4 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className="text-[15px] font-medium text-[var(--text-primary)] truncate">
                            {app.projectTitle ?? 'Untitled project'}
                          </p>
                          <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                            Grant ID:{' '}
                            <span className="font-mono-chain">
                              {app.grantId ?? '—'}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center flex-shrink-0">
                          {renderStatusBadge(app.status)}
                          <span className="font-headline text-[18px] text-[var(--gold)] ml-3">
                            ₹{(app.requestedAmount ?? 0).toLocaleString()}
                          </span>
                          {app.grantId && (
                            <Link
                              to={`/grants/${app.grantId}`}
                              className="btn btn-secondary ml-3 text-[11px] px-3 py-1"
                              data-hover
                            >
                              View →
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Right – Recent Activity */}
              <section className="dash-right flex-[2]">
                <h2 className="font-headline text-[24px] md:text-[28px] text-[var(--text-primary)] mb-4">
                  RECENT ACTIVITY
                </h2>
                {transactions.length === 0 ? (
                  <p className="text-[13px] text-[var(--text-muted)]">No transactions yet.</p>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto pr-1 space-y-2">
                    {transactions.map((tx) => {
                      const isCredit = (tx.type ?? '').includes('RELEASE') || (tx.amount ?? 0) > 0
                      const txId: string = tx.txId ?? tx.id ?? ''
                      const explorerUrl = getExplorerUrl(txId, tx.explorerUrl)

                      return (
                        <div
                          key={txId}
                          className="flex items-center gap-3 py-2 border-b border-[var(--border)]"
                        >
                          <div className="w-6 flex justify-center">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: isCredit ? 'var(--accent)' : 'var(--text-muted)',
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] text-[var(--text-primary)] truncate">
                              {tx.note ?? tx.type ?? 'On-chain record'}
                            </p>
                            {txId && (
                              <button
                                type="button"
                                className="mt-0.5 font-mono-chain text-[10px] text-[var(--text-muted)] underline decoration-dotted"
                                onClick={() => window.open(explorerUrl, '_blank')}
                              >
                                TX: {txId.slice(0, 6)}...{txId.slice(-4)}
                              </button>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p
                              className={`font-headline text-[16px] ${isCredit ? 'text-[var(--gold)]' : 'text-[var(--text-muted)]'
                                }`}
                            >
                              {isCredit ? `+₹${(tx.amount ?? 0).toLocaleString()}` : '—'}
                            </p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                              {tx.timeAgo ?? 'Just now'}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>

            {/* Quick actions */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => navigate('/grants')}
                className="text-left border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-4 transition-transform duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]"
                style={{
                  clipPath: 'polygon(10px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 10px)',
                }}
                data-hover
              >
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Quick action
                </p>
                <p className="mt-1 text-[16px] font-medium text-[var(--text-primary)]">
                  Apply for a Grant
                </p>
                <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                  Browse open grants and submit your proposal.
                </p>
                <p className="mt-3 text-[13px] text-[var(--accent)]">Go to grants →</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (approvedApp?.grantId) {
                    navigate(`/milestones/${approvedApp.grantId}/0`)
                  } else {
                    navigate('/dashboard')
                  }
                }}
                className="text-left border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-4 transition-transform duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]"
                style={{
                  clipPath: 'polygon(10px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 10px)',
                }}
                data-hover
              >
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Quick action
                </p>
                <p className="mt-1 text-[16px] font-medium text-[var(--text-primary)]">
                  Submit a Milestone
                </p>
                <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                  Submit proof and trigger AI verification + fund release.
                </p>
                <p className="mt-3 text-[13px] text-[var(--accent)]">
                  {approvedApp?.grantId ? 'Go to next milestone →' : 'Connect to a verified grant →'}
                </p>
              </button>
            </div>

            {/* Reputation widget */}
            <section
              className="dash-reputation mt-10 border border-[var(--border)] bg-[var(--bg-secondary)] px-6 md:px-10 py-8 md:py-10"
              style={{
                borderTopWidth: '3px',
                borderTopColor: 'var(--accent)',
                clipPath:
                  'polygon(12px 0%, calc(100% - 12px) 0%, 100% 12px, 100% 100%, 0% 100%, 0% 12px)',
              }}
            >
              <div className="flex flex-col md:flex-row gap-10 md:gap-12 items-start md:items-center">
                {/* Left – Score */}
                <div className="w-full md:w-1/3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    YOUR REPUTATION SCORE
                  </p>
                  <p className="font-headline text-[72px] md:text-[120px] text-[var(--accent)] leading-none mt-2">
                    <span ref={scoreRef}>{reputationScore}</span>
                  </p>
                  <div className="mt-4 h-[4px] w-[200px] bg-[var(--border)]">
                    <div
                      className="h-full bg-[var(--accent)]"
                      style={{ width: `${Math.min(reputationScore, 100)}%` }}
                    />
                  </div>
                  <div
                    className="inline-flex items-center mt-4 px-5 py-2 bg-[var(--accent)] text-white"
                    style={{
                      clipPath: 'polygon(8px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 8px)',
                    }}
                  >
                    <span className="text-[13px] uppercase tracking-[0.1em]">
                      {reputationTier} BUILDER 🏆
                    </span>
                  </div>
                </div>

                {/* Center – Breakdown */}
                <div className="w-full md:w-1/3">
                  <p className="text-[12px] uppercase tracking-[0.1em] text-[var(--text-muted)] mb-4">
                    SCORE BREAKDOWN
                  </p>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-[var(--text-secondary)]">
                          Completion Rate
                        </span>
                        <span className="text-[12px] text-[var(--text-muted)]">
                          {user?.completionRate ?? 87}%
                        </span>
                      </div>
                      <div className="mt-1 h-[3px] w-[140px] bg-[var(--border)]">
                        <div
                          className="h-full bg-[var(--accent)]"
                          style={{ width: `${Math.min(user?.completionRate ?? 87, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-[var(--text-secondary)]">
                          Grants Completed
                        </span>
                        <span className="text-[12px] text-[var(--text-muted)]">
                          {user?.grantsCompleted ?? 5}
                        </span>
                      </div>
                      <div className="mt-1 h-[3px] w-[140px] bg-[var(--border)]">
                        <div
                          className="h-full bg-[var(--accent)]"
                          style={{
                            width: `${Math.min(((user?.grantsCompleted ?? 5) / 10) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-[var(--text-secondary)]">
                          Voting Activity
                        </span>
                        <span className="text-[12px] text-[var(--text-muted)]">
                          {user?.votingParticipation ?? 12} votes
                        </span>
                      </div>
                      <div className="mt-1 h-[3px] w-[140px] bg-[var(--border)]">
                        <div
                          className="h-full bg-[var(--accent)]"
                          style={{
                            width: `${Math.min(((user?.votingParticipation ?? 12) / 20) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right – AI summary */}
                <div className="w-full md:w-1/3">
                  <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed max-w-xs">
                    {reputationResult?.result?.summary ??
                      user?.reputationSummary ??
                      'Consistent delivery record with strong community trust. Keep participating in DAO votes to boost your score further.'}
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary mt-5 w-full md:w-auto"
                    onClick={handleRecalculateScore}
                    disabled={reputationLoading}
                    data-hover
                  >
                    {reputationLoading ? 'Analyzing…' : 'Recalculate Score →'}
                  </button>
                  <p className="mt-2 text-[11px] text-[var(--text-muted)] text-center md:text-left">
                    Result recorded on Algorand
                  </p>
                  {reputationResult && (
                    <BlockchainProof
                      txId={reputationResult.blockchain.txId}
                      explorerUrl={reputationResult.blockchain.explorerUrl}
                      verified={reputationResult.blockchain.verified}
                      label="Reputation score recorded on Algorand"
                    />
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export default Dashboard

