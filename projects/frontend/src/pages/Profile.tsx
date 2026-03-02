import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { gsap } from 'gsap'
import BlockchainProof from '../components/BlockchainProof'
import { apiGet, apiPatch } from '../utils/api'
import { callN8n } from '../utils/callN8n'
import { ALGO_EXPLORER, N8N_MINT_NFT, N8N_REPUTATION } from '../config'

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getBadgeEmoji(tier: string | undefined): string {
  if (!tier) return '🔨'
  const map: Record<string, string> = {
    CHAMPION: '🏆',
    EXPERT: '⭐',
    'TRUSTED BUILDER': '✅',
    BUILDER: '🔨',
    NEWCOMER: '🌱',
  }
  return map[tier] ?? '🔨'
}

const Profile = () => {
  const navigate = useNavigate()
  const { activeAddress } = useWallet()
  const walletAddress =
    activeAddress ?? 'DEMO7XKLMNPQRST2UVWXYZ3ABCDEFGHIJKLMNO'

  const [user, setUser] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<'nfts' | 'history' | 'leaderboard'>(
    'nfts',
  )

  const [repLoading, setRepLoading] = useState(false)
  const [repResult, setRepResult] = useState<any>(null)
  const [repError, setRepError] = useState<string | null>(null)

  const [mintingId, setMintingId] = useState<string | null>(null)
  const [mintResults, setMintResults] = useState<Record<string, any>>({})
  const [mintError, setMintError] = useState<string | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    githubUrl: '',
    skillInput: '',
    skills: [] as string[],
  })
  const [editSaving, setEditSaving] = useState(false)

  const scoreRef = useRef<HTMLSpanElement | null>(null)
  const safeReputationScore = Math.max(0, Math.min(user?.reputationScore ?? 0, 100))

  useEffect(() => {
    Promise.all([
      // 🔌 BACKEND: GET /users/:walletAddress
      apiGet(`/users/${walletAddress}`),
      // 🔌 BACKEND: GET /applications/:walletAddress
      apiGet(`/applications/${walletAddress}`).catch(() => []),
      // 🔌 BACKEND: GET /leaderboard
      apiGet('/leaderboard').catch(() => []),
    ])
      .then(([userData, appsData, lbData]) => {
        setUser(userData)
        setEditForm({
          name: userData.name ?? '',
          bio: userData.bio ?? '',
          githubUrl: userData.githubUrl ?? '',
          skillInput: '',
          skills: userData.skills ?? [],
        })
        setApplications(
          Array.isArray(appsData) ? appsData : appsData.applications ?? [],
        )
        setLeaderboard(
          Array.isArray(lbData) ? lbData : lbData.leaderboard ?? [],
        )
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [walletAddress])

  useEffect(() => {
    if (!loading) {
      gsap.from('.pr-hero', { y: -20, duration: 0.45 })
      gsap.from('.pr-reputation', {
        x: -30,
        duration: 0.5,
        delay: 0.1,
      })
      gsap.from('.pr-tabs-area', {
        x: 30,
        duration: 0.5,
        delay: 0.15,
      })

      if (scoreRef.current && safeReputationScore) {
        const target = { val: 0 }
        gsap.to(target, {
          val: safeReputationScore,
          duration: 1.8,
          ease: 'power2.out',
          delay: 0.3,
          onUpdate: () => {
            if (scoreRef.current) {
              scoreRef.current.textContent = Math.round(target.val).toString()
            }
          },
        })
      }
    }
  }, [loading, user])

  useEffect(() => {
    gsap.fromTo('.pr-tab-panel', { y: 8 }, { y: 0, duration: 0.3, ease: 'power2.out' })
  }, [activeTab])

  const handleCopyWallet = () => {
    navigator.clipboard
      .writeText(walletAddress)
      .catch(() => null)
  }

  async function handleReputation() {
    if (!user) return
    setRepLoading(true)
    setRepError(null)
    try {
      // 🤖 AI: POST /reputation-score
      const data = await callN8n(N8N_REPUTATION, walletAddress, {
        grantsCompleted: user?.grantsCompleted ?? 0,
        milestonesCompleted: user?.milestonesCompleted ?? 0,
        totalMilestones: user?.totalMilestones ?? 0,
        votingParticipation: user?.votingParticipation ?? 0,
        domain: user?.domain ?? 'Technology',
      })

      setRepResult(data)

      // 🔌 BACKEND: PATCH /users/:walletAddress — save new score
      await apiPatch(`/users/${walletAddress}`, {
        reputationScore: data.result.score ?? 0,
        reputationTier: data.result.tier ?? 'BUILDER',
      })

      const target = { val: safeReputationScore }
      gsap.to(target, {
        val: data.result.score ?? 0,
        duration: 1.5,
        ease: 'power2.out',
        onUpdate: () => {
          if (scoreRef.current) {
            scoreRef.current.textContent = Math.round(target.val).toString()
          }
        },
      })

      setUser((prev: any) => ({
        ...prev,
        reputationScore: data.result.score,
        reputationTier: data.result.tier,
      }))
    } catch {
      setRepError('Could not calculate score. Try again.')
    } finally {
      setRepLoading(false)
    }
  }

  const eligibleGrants = applications.filter(
    (a) => a.status === 'APPROVED' || a.status === 'COMPLETED',
  )

  async function handleMintNFT(application: any) {
    const appId = application._id ?? application.id
    setMintingId(appId)
    setMintError(null)
    try {
      // 🤖 AI: POST /mint-completion-nft
      const data = await callN8n(N8N_MINT_NFT, walletAddress, {
        grantId: application.grantId,
        grantTitle: application.projectTitle,
        totalAmount: application.requestedAmount ?? 0,
        completionDate: new Date().toISOString(),
        milestonesCompleted: application.milestonesCompleted ?? 1,
        teamSize: application.teamSize ?? 1,
        domain: application.domain ?? 'Technology',
      })

      setMintResults((prev) => ({ ...prev, [appId]: data }))

      const card = document.querySelector(
        `[data-app-id="${appId}"]`,
      ) as HTMLElement | null
      if (card) {
        gsap.fromTo(
          card,
          { rotateY: 90, opacity: 0 },
          { rotateY: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },
        )
      }
    } catch {
      setMintError('NFT minting failed. Try again.')
    } finally {
      setMintingId(null)
    }
  }

  const myRank =
    leaderboard.findIndex((u: any) => u.walletAddress === walletAddress) + 1

  const grantHistoryEmpty = applications.length === 0

  async function handleSaveProfile() {
    setEditSaving(true)
    try {
      // 🔌 BACKEND: PATCH /users/:walletAddress
      const updated = await apiPatch(`/users/${walletAddress}`, {
        name: editForm.name,
        bio: editForm.bio,
        githubUrl: editForm.githubUrl,
        skills: editForm.skills,
      })
      setUser(updated)
      setEditOpen(false)
      gsap.fromTo(
        '.pr-hero',
        { backgroundColor: 'var(--accent-light)' },
        {
          backgroundColor: 'var(--bg-secondary)',
          duration: 0.8,
        },
      )
    } catch (err) {
      console.error('Save failed', err)
    } finally {
      setEditSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="relative z-[1] bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <div className="mx-auto max-w-6xl px-4 md:px-12 py-10 animate-pulse space-y-5">
          <div className="h-24 bg-[var(--bg-secondary)]" />
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 h-72 bg-[var(--bg-secondary)]" />
            <div className="flex-[1.5] space-y-3">
              <div className="h-8 bg-[var(--bg-secondary)]" />
              <div className="h-32 bg-[var(--bg-secondary)]" />
              <div className="h-32 bg-[var(--bg-secondary)]" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-[1] bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 md:px-12 py-10">
        {/* Hero */}
        <section className="pr-hero bg-[var(--bg-secondary)] border-b border-[var(--border)] px-4 md:px-10 py-7 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-start justify-between gap-6">
            <div className="flex-1">
              <h1 className="font-headline text-[32px] md:text-[56px] leading-[0.9] text-[var(--text-primary)]">
                {user?.name || 'ANONYMOUS BUILDER'}
              </h1>
              <button
                type="button"
                onClick={handleCopyWallet}
                className="mt-2 font-mono-chain text-[13px] text-[var(--text-primary)] underline decoration-dotted"
                title={walletAddress}
              >
                {walletAddress}
              </button>
              <p className="mt-3 text-[15px] text-[var(--text-primary)] max-w-xl leading-relaxed">
                {user?.bio ||
                  'No bio yet. Click Edit Profile to tell sponsors who you are and what you build.'}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {user?.githubUrl && (
                  <a
                    href={user.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12px] text-[var(--text-primary)] px-3 py-1 border border-[var(--border)] bg-[var(--bg-elevated)]"
                    style={{
                      clipPath:
                        'polygon(6px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 6px)',
                    }}
                    data-hover
                  >
                    ⬡ GitHub →
                  </a>
                )}
                {Array.isArray(user?.skills) &&
                  user.skills.slice(0, 5).map((skill: string) => (
                    <span
                      key={skill}
                      className="text-[11px] px-2 py-1"
                      style={{
                        backgroundColor: 'var(--accent-light)',
                        color: 'var(--accent)',
                        clipPath:
                          'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                {Array.isArray(user?.skills) && user.skills.length > 5 && (
                  <span className="text-[11px] text-[var(--text-primary)]">
                    +{user.skills.length - 5} more
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2">
              <button
                type="button"
                className="btn btn-secondary text-[12px] px-4 py-2"
                onClick={() => setEditOpen(true)}
                data-hover
              >
                Edit Profile
              </button>
            </div>
          </div>
        </section>

        {/* Main two-column */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left – Reputation */}
          <section className="pr-reputation w-full lg:w-[40%] lg:sticky lg:top-[100px] bg-[var(--bg-elevated)] border border-[var(--border)] border-t-[3px] border-t-[var(--accent)] px-5 py-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-4">
              REPUTATION SCORE
            </p>
            <div className="flex items-end gap-3 mb-3">
              <span
                ref={scoreRef}
                className="font-headline text-[72px] md:text-[100px] text-[var(--accent)] leading-none"
              >
                {safeReputationScore}
              </span>
              <span className="text-[16px] text-[var(--text-secondary)] mb-2">
                /100
              </span>
            </div>
            <div className="h-[4px] w-full bg-[var(--border)] mb-4">
              <div
                className="h-full bg-[var(--accent)]"
                style={{
                  width: `${safeReputationScore}%`,
                  transition: 'width 1s ease',
                }}
              />
            </div>
            <div
              className="inline-flex items-center px-4 py-2 bg-[var(--accent)] text-white mb-4"
              style={{
                clipPath:
                  'polygon(10px 0%, calc(100% - 10px) 0%, 100% 100%, 0% 100%)',
              }}
            >
              <span className="text-[14px] uppercase tracking-[0.1em] font-semibold">
                {user?.reputationTier ?? 'BUILDER'}
              </span>
              <span className="ml-2 text-[18px]">
                {getBadgeEmoji(user?.reputationTier)}
              </span>
            </div>

            {/* Breakdown */}
            <div className="mt-3 border-t border-[var(--border)] pt-3">
              <p className="text-[12px] uppercase tracking-[0.1em] text-[var(--text-secondary)] mb-3">
                SCORE BREAKDOWN
              </p>
              {[
                {
                  label: 'Completion Rate',
                  value: user?.completionRate ?? 0,
                  suffix: '%',
                  max: 100,
                },
                {
                  label: 'Grants Completed',
                  value: user?.grantsCompleted ?? 0,
                  suffix: '',
                  max: 10,
                },
                {
                  label: 'Community Votes',
                  value: user?.votingParticipation ?? 0,
                  suffix: ' votes',
                  max: 20,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="mb-3"
                >
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[var(--text-primary)]">
                      {item.label}
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      {item.value}
                      {item.suffix}
                    </span>
                  </div>
                  <div className="mt-1 h-[3px] w-full bg-[var(--border)]">
                    <div
                      className="h-full bg-[var(--accent)]"
                      style={{
                        width: `${Math.min(
                          (item.value / item.max) * 100,
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* AI summary */}
            <div className="mt-4 border-t border-[var(--border)] pt-3">
              <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                {repResult?.result?.summary ??
                  user?.bio ??
                  'Complete more grants and participate in community votes to improve your reputation score.'}
              </p>
            </div>

            {/* Recalculate */}
            <div className="mt-4">
              <button
                type="button"
                className="btn btn-secondary w-full py-2"
                onClick={handleReputation}
                disabled={repLoading}
                data-hover
              >
                {repLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 border-2 border-current border-t-transparent animate-spin" />
                    Calculating...
                  </span>
                ) : (
                  'Recalculate Score →'
                )}
              </button>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)] text-center">
                Result recorded on Algorand
              </p>
              {repError && (
                <p className="mt-1 text-[12px] text-[var(--danger)]">
                  {repError}
                </p>
              )}
            </div>

            {repResult && (
              <div className="mt-3">
                <BlockchainProof
                  txId={repResult.blockchain.txId}
                  explorerUrl={repResult.blockchain.explorerUrl}
                  verified={repResult.blockchain.verified}
                  label="Reputation score on Algorand"
                />
              </div>
            )}
          </section>

          {/* Right – Tabs */}
          <section className="pr-tabs-area flex-1 w-full">
            <div className="border-b-2 border-[var(--border)] mb-4 flex flex-wrap">
              {[
                { key: 'nfts', label: 'NFTs' },
                { key: 'history', label: 'GRANT HISTORY' },
                { key: 'leaderboard', label: 'LEADERBOARD' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as any)}
                  className="px-4 py-3 text-[13px] uppercase tracking-[0.08em] -mb-[2px]"
                  style={{
                    borderBottom:
                      activeTab === tab.key
                        ? '2px solid var(--accent)'
                        : '2px solid transparent',
                    color:
                      activeTab === tab.key
                        ? 'var(--accent)'
                        : 'var(--text-secondary)',
                  }}
                  data-hover
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="pr-tab-panel">
              {/* NFTs Tab */}
              {activeTab === 'nfts' && (
                <div>
                  <h2 className="font-headline text-[20px] md:text-[24px] text-[var(--text-primary)] mb-2">
                    ACHIEVEMENT NFTs
                  </h2>
                  <p className="text-[13px] text-[var(--text-secondary)] mb-4">
                    Soul-bound tokens minted on Algorand for completed grants.
                    These are permanently tied to your wallet.
                  </p>
                  {eligibleGrants.length === 0 ? (
                    <div className="border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-8 text-center">
                      <p className="text-[14px] text-[var(--text-secondary)]">
                        No eligible grants for NFT minting yet.
                      </p>
                      <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                        Complete a grant to earn your first achievement NFT.
                      </p>
                      <button
                        type="button"
                        className="btn btn-secondary mt-3"
                        onClick={() => navigate('/grants')}
                        data-hover
                      >
                        Browse Grants →
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {eligibleGrants.map((app) => {
                        const appId = app._id ?? app.id
                        const minted = mintResults[appId]
                        if (minted) {
                          return (
                            <div
                              key={appId}
                              data-app-id={appId}
                              className="bg-[var(--bg-dark)] text-white border border-white/10 px-5 py-5"
                              style={{
                                clipPath:
                                  'polygon(10px 0%, calc(100% - 10px) 0%, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0% calc(100% - 10px), 0% 10px)',
                              }}
                            >
                              <p className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                                ACHIEVEMENT NFT · ALGORAND TESTNET
                              </p>
                              <p className="mt-2 text-[16px] font-semibold">
                                {minted.result.assetName ??
                                  app.projectTitle}
                              </p>
                              <div className="mt-3 flex gap-4 text-[11px]">
                                <div>
                                  <p className="uppercase text-white/50 text-[9px]">
                                    Asset ID
                                  </p>
                                  <p className="font-mono-chain text-[11px]">
                                    {minted.result.assetId}
                                  </p>
                                </div>
                                <div>
                                  <p className="uppercase text-white/50 text-[9px]">
                                    Rating
                                  </p>
                                  <p className="text-[12px]">
                                    {'⭐'.repeat(
                                      Math.min(
                                        Math.round(
                                          minted.result.rating ?? 3,
                                        ),
                                        5,
                                      ),
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-3 inline-block px-3 py-1 bg-white/15 text-[10px] uppercase tracking-[0.08em]">
                                🔒 SOULBOUND
                              </div>
                              <div className="mt-3">
                                <BlockchainProof
                                  txId={minted.blockchain.txId}
                                  explorerUrl={
                                    minted.blockchain.explorerUrl
                                  }
                                  verified
                                  label="NFT minted on Algorand"
                                />
                              </div>
                            </div>
                          )
                        }
                        return (
                          <div
                            key={appId}
                            data-app-id={appId}
                            className="bg-[var(--bg-secondary)] border border-[var(--border)] border-t-[3px] border-t-[var(--gold)] px-4 py-4"
                          >
                            <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                              ELIGIBLE FOR NFT
                            </p>
                            <p className="mt-2 text-[16px] font-semibold text-[var(--text-primary)]">
                              {app.projectTitle}
                            </p>
                            {app.grantId && (
                              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                                Grant ID:{' '}
                                {app.grantId.slice(0, 8)}...
                              </p>
                            )}
                            <p className="mt-2 font-headline text-[20px] text-[var(--gold)]">
                              ₹
                              {Number(
                                app.requestedAmount ?? 0,
                              ).toLocaleString('en-IN')}
                            </p>
                            <button
                              type="button"
                              className="btn btn-gold w-full mt-3"
                              disabled={!!mintingId}
                              onClick={() => handleMintNFT(app)}
                              data-hover
                            >
                              {mintingId === appId ? (
                                <span className="flex items-center justify-center gap-2">
                                  <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent animate-spin" />
                                  Minting NFT...
                                </span>
                              ) : (
                                'Claim Achievement NFT →'
                              )}
                            </button>
                            {mintError && mintingId === appId && (
                              <p className="mt-2 text-[11px] text-[var(--danger)]">
                                {mintError}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div>
                  <h2 className="font-headline text-[20px] md:text-[24px] text-[var(--text-primary)] mb-3">
                    GRANT HISTORY
                  </h2>
                  {grantHistoryEmpty ? (
                    <div className="border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-8 text-center">
                      <p className="text-[14px] text-[var(--text-muted)]">
                        No grant applications yet.
                      </p>
                      <button
                        type="button"
                        className="btn btn-secondary mt-3"
                        onClick={() => navigate('/grants')}
                        data-hover
                      >
                        Browse Open Grants →
                      </button>
                    </div>
                  ) : (
                    <div className="hidden md:block">
                      <div className="grid grid-cols-5 gap-3 text-[11px] text-[var(--text-secondary)] uppercase tracking-[0.08em] border-b border-[var(--border)] pb-2">
                        <span>Grant</span>
                        <span>Role</span>
                        <span>Status</span>
                        <span>Amount</span>
                        <span>Milestones</span>
                      </div>
                      <div className="mt-2">
                        {applications.map((app) => (
                          <div
                            key={app.id ?? app._id}
                            className="grid grid-cols-5 gap-3 py-3 border-b border-[var(--border)]"
                          >
                            <div>
                              <p className="text-[14px] font-medium text-[var(--text-primary)]">
                                {app.projectTitle}
                              </p>
                              {app.grantId && (
                                <p className="text-[11px] text-[var(--text-secondary)]">
                                  ID: {app.grantId.slice(0, 8)}...
                                </p>
                              )}
                            </div>
                            <div>
                              <span
                                className="inline-block text-[10px] uppercase tracking-[0.08em] px-2 py-1"
                                style={{
                                  backgroundColor: 'var(--accent-light)',
                                  color: 'var(--accent)',
                                  clipPath:
                                    'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
                                }}
                              >
                                APPLICANT
                              </span>
                            </div>
                            <div>
                              <span
                                className="inline-block text-[10px] uppercase tracking-[0.08em] px-2 py-1"
                                style={{
                                  backgroundColor:
                                    app.status === 'APPROVED'
                                      ? '#E8F5E8'
                                      : app.status === 'REJECTED'
                                        ? 'var(--danger-light)'
                                        : app.status === 'SUBMITTED'
                                          ? 'var(--accent-light)'
                                          : 'var(--gold-light)',
                                  color:
                                    app.status === 'APPROVED'
                                      ? '#2E7D32'
                                      : app.status === 'REJECTED'
                                        ? 'var(--danger)'
                                        : app.status === 'SUBMITTED'
                                          ? 'var(--accent)'
                                          : 'var(--gold)',
                                  clipPath:
                                    'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
                                }}
                              >
                                {app.status}
                              </span>
                            </div>
                            <div>
                              <p className="font-headline text-[18px] text-[var(--gold)]">
                                ₹
                                {Number(
                                  app.requestedAmount ?? 0,
                                ).toLocaleString('en-IN')}
                              </p>
                            </div>
                            <div>
                              <p className="text-[13px] text-[var(--text-secondary)]">
                                {(app.milestonesCompleted ?? 0)}/
                                {app.totalMilestones ?? '—'}
                              </p>
                              <p className="text-[11px] text-[var(--text-secondary)]">
                                {formatDate(app.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Leaderboard Tab */}
              {activeTab === 'leaderboard' && (
                <div>
                  <h2 className="font-headline text-[20px] md:text-[24px] text-[var(--text-primary)] mb-2">
                    LEADERBOARD
                  </h2>
                  <p className="text-[13px] text-[var(--text-secondary)] mb-4">
                    Top builders by reputation score.
                  </p>
                  <div className="space-y-2">
                    {leaderboard.map((u: any, idx: number) => {
                      const isMe = u.walletAddress === walletAddress
                      const rank = idx + 1
                      const rankColor =
                        rank === 1
                          ? 'var(--gold)'
                          : rank === 2
                            ? 'var(--text-secondary)'
                            : rank === 3
                              ? 'var(--text-secondary)'
                              : 'var(--text-secondary)'
                      return (
                        <div
                          key={u.walletAddress ?? idx}
                          className="flex items-center gap-3 px-3 py-2 border-b border-[var(--border)]"
                          style={
                            isMe
                              ? {
                                  backgroundColor: 'var(--accent-light)',
                                  borderLeft: '3px solid var(--accent)',
                                }
                              : undefined
                          }
                        >
                          <div className="w-10 text-center">
                            <span
                              className="font-headline"
                              style={{ color: rankColor, fontSize: '22px' }}
                            >
                              #{rank}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-mono-chain text-[12px] text-[var(--text-primary)] truncate">
                              {u.walletAddress
                                ? `${u.walletAddress.slice(0, 8)}...${u.walletAddress.slice(-6)}`
                                : 'Unknown'}
                            </p>
                            {u.name && (
                              <p className="text-[11px] text-[var(--text-secondary)]">
                                {u.name}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="font-headline text-[20px] text-[var(--accent)]">
                              {u.reputationScore ?? 0}
                            </p>
                            <span
                              className="text-[10px] uppercase tracking-[0.08em] px-2 py-1"
                              style={{
                                backgroundColor: 'var(--accent-light)',
                                color: 'var(--accent)',
                                clipPath:
                                  'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
                              }}
                            >
                              {u.reputationTier ?? 'BUILDER'}
                            </span>
                            {isMe && (
                              <span className="text-[12px] text-[var(--accent)] font-semibold">
                                ← YOU
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
                    <p className="text-[14px] text-[var(--text-secondary)]">
                      Your rank:{' '}
                      <span className="font-headline text-[20px] text-[var(--accent)]">
                        #{myRank || '—'}
                      </span>{' '}
                      <span className="text-[13px] text-[var(--text-secondary)]">
                        of {leaderboard.length} builders
                      </span>
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary text-[12px] px-3 py-1.5"
                      onClick={handleReputation}
                      data-hover
                    >
                      Improve Score →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,24,20,0.65)] backdrop-blur-sm">
          <div
            className="bg-[var(--bg-elevated)] w-[90%] max-w-[520px] px-5 md:px-7 py-6 md:py-7"
            style={{
              clipPath:
                'polygon(12px 0%, calc(100% - 12px) 0%, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0% calc(100% - 12px), 0% 12px)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline text-[22px] md:text-[26px] text-[var(--text-primary)]">
                EDIT PROFILE
              </h3>
              <button
                type="button"
                className="text-[20px] text-[var(--text-secondary)]"
                onClick={() => setEditOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] uppercase tracking-[0.1em] text-[var(--text-secondary)] mb-1">
                  NAME
                </label>
                <input
                  type="text"
                  placeholder="Your name or team name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-[14px] text-[var(--text-primary)] px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-[12px] uppercase tracking-[0.1em] text-[var(--text-secondary)] mb-1">
                  BIO
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe yourself and your interests..."
                  value={editForm.bio}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, bio: e.target.value }))
                  }
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-[14px] text-[var(--text-primary)] px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-[12px] uppercase tracking-[0.1em] text-[var(--text-secondary)] mb-1">
                  GITHUB URL
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/yourusername"
                  value={editForm.githubUrl}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      githubUrl: e.target.value,
                    }))
                  }
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-[14px] text-[var(--text-primary)] px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-[12px] uppercase tracking-[0.1em] text-[var(--text-secondary)] mb-1">
                  SKILLS
                </label>
                <div className="min-h-[40px] bg-[var(--bg-primary)] border border-[var(--border)] px-2 py-1 flex flex-wrap gap-1">
                  {editForm.skills.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() =>
                        setEditForm((f) => ({
                          ...f,
                          skills: f.skills.filter((s) => s !== skill),
                        }))
                      }
                      className="flex items-center gap-1 text-[11px] px-2 py-1"
                      style={{
                        backgroundColor: 'var(--accent-light)',
                        color: 'var(--accent)',
                        clipPath:
                          'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
                      }}
                      data-hover
                    >
                      <span>{skill}</span>
                      <span>×</span>
                    </button>
                  ))}
                  <input
                    type="text"
                    placeholder="Add skill and press Enter"
                    value={editForm.skillInput}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        skillInput: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const val = editForm.skillInput.trim()
                        if (
                          !val ||
                          editForm.skills.includes(val) ||
                          editForm.skills.length >= 10
                        )
                          return
                        setEditForm((f) => ({
                          ...f,
                          skills: [...f.skills, val],
                          skillInput: '',
                        }))
                      }
                    }}
                    className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-[13px] text-[var(--text-primary)] px-1 py-1"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5">
              <button
                type="button"
                className="btn btn-primary w-full py-2"
                onClick={handleSaveProfile}
                disabled={editSaving}
                data-hover
              >
                {editSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent animate-spin" />
                    Saving...
                  </span>
                ) : (
                  'Save Profile →'
                )}
              </button>
              <button
                type="button"
                className="btn btn-secondary w-full py-2 mt-2"
                onClick={() => setEditOpen(false)}
                data-hover
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile

