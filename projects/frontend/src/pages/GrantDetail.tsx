import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { gsap } from 'gsap'
import BlockchainProof from '../components/BlockchainProof'
import { apiGet, apiPost, apiPatch } from '../utils/api'
import { ALGO_EXPLORER, N8N_SUMMARIZE_VOTE } from '../config'
import { callN8n } from '../utils/callN8n'

function formatDate(dateStr: string): string {
  if (!dateStr) return 'No deadline'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return 'No deadline'
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function getDomainColor(domain: string): string {
  const colors: Record<string, string> = {
    Technology: 'var(--accent)',
    Science: '#2196F3',
    Arts: '#9C27B0',
    'Social Impact': '#FF9800',
    Health: '#F44336',
  }
  return colors[domain] ?? 'var(--border-strong)'
}

function getMilestoneProgress(milestones: any[]): { completed: number; total: number } {
  if (!milestones?.length) return { completed: 0, total: 0 }
  const completed = milestones.filter(
    (m: any) => m.status === 'VERIFIED' || m.status === 'RELEASED',
  ).length
  return { completed, total: milestones.length }
}

function formatTxType(type: string): string {
  const map: Record<string, string> = {
    MILESTONE_RELEASE: 'Milestone Funds Released',
    GRANT_FUNDED: 'Grant Funded',
    VOTE_RECORDED: 'Vote Recorded On-Chain',
    NFT_MINTED: 'Completion NFT Minted',
  }
  if (!type) return 'Transaction'
  return map[type] ?? type.replace(/_/g, ' ')
}

const GrantDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeAddress } = useWallet()
  const walletAddress =
    activeAddress ?? 'DEMO7XKLMNPQRST2UVWXYZ3ABCDEFGHIJKLMNO'

  const [grant, setGrant] = useState<any>(null)
  const [votes, setVotes] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(
    null,
  )

  const [voteModalOpen, setVoteModalOpen] = useState(false)
  const [voteChoice, setVoteChoice] = useState<'APPROVE' | 'REJECT'>('APPROVE')
  const [voteComment, setVoteComment] = useState('')
  const [voteLoading, setVoteLoading] = useState(false)
  const [voteResult, setVoteResult] = useState<any>(null)
  const [voteError, setVoteError] = useState<string | null>(null)
  const [voteSummary, setVoteSummary] = useState<any>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)

    Promise.all([
      // 🔌 BACKEND: GET /grants/:id — full grant with milestones
      apiGet(`/grants/${id}`),
      // 🔌 BACKEND: GET /votes/:grantId — all votes + tally
      apiGet(`/votes/${id}`).catch(() => null),
      // 🔌 BACKEND: GET /transactions/:grantId
      apiGet(`/transactions/${id}`).catch(() => []),
      // 🔌 BACKEND: GET /health/:grantId — grant health score
      apiGet(`/health/${id}`).catch(() => null),
    ])
      .then(([grantData, votesData, txData, healthData]) => {
        setGrant(Array.isArray(grantData.grants) ? grantData.grants[0] : grantData)
        setVotes(votesData)
        setTransactions(
          Array.isArray(txData) ? txData : txData?.transactions ?? [],
        )
        setHealth(healthData)
      })
      .catch(() =>
        setError('Could not load grant. Check backend connection.'),
      )
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!loading && grant) {
      const tl = gsap.timeline()
      tl.fromTo('.gd-header', { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, clearProps: 'all' })
        .fromTo('.gd-left', { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, clearProps: 'all' }, '-=0.2')
        .fromTo('.gd-sidebar', { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, clearProps: 'all' }, '-=0.3')
        .fromTo('.gd-milestones', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, clearProps: 'all' }, '-=0.3')
        .fromTo('.gd-votes', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, clearProps: 'all' }, '-=0.3')
        .fromTo('.gd-transactions', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, clearProps: 'all' }, '-=0.3')
    }
  }, [loading, grant])

  const toggleMilestone = (index: number) => {
    const current = expandedMilestone
    const newIndex = current === index ? null : index

    if (current !== null) {
      const prev = document.querySelector(
        `.milestone-content-${current}`,
      ) as HTMLElement | null
      if (prev) {
        gsap.to(prev, { height: 0, opacity: 0, duration: 0.2 })
      }
    }

    if (newIndex !== null) {
      const el = document.querySelector(
        `.milestone-content-${newIndex}`,
      ) as HTMLElement | null
      if (el) {
        gsap.fromTo(
          el,
          { height: 0, opacity: 0 },
          { height: 'auto', opacity: 1, duration: 0.3, ease: 'power2.out' },
        )
      }
    }

    setExpandedMilestone(newIndex)
  }

  const handleVote = async () => {
    if (!id) return
    setVoteLoading(true)
    setVoteError(null)
    try {
      // 🔌 BACKEND: POST /votes
      const result = await apiPost('/votes', {
        grantId: id,
        voterWallet: walletAddress,
        vote: voteChoice,
        comment: voteComment,
      })

      // ⛓️ BLOCKCHAIN: note-field txn recording vote on-chain
      setVoteResult({
        blockchain: {
          txId: result.txId ?? result.blockchain?.txId ?? 'VOTE-PENDING',
          explorerUrl:
            result.explorerUrl ??
            result.blockchain?.explorerUrl ??
            `${ALGO_EXPLORER}/tx/pending`,
          verified: true,
        },
      })

      // 🤖 AI: POST /summarize-vote — summarize DAO votes + comments
      const summary = await callN8n(N8N_SUMMARIZE_VOTE, walletAddress, {
        grantId: id,
        votes: [voteChoice],
        comments: voteComment ? [voteComment] : [],
      })
      setVoteSummary(summary)

      // refresh votes tally
      apiGet(`/votes/${id}`)
        .then((data) => setVotes(data))
        .catch(() => null)
    } catch (err) {
      setVoteError('Vote submission failed. Try again.')
    } finally {
      setVoteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="relative z-[1] bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <div className="mx-auto max-w-6xl px-4 md:px-12 py-10 animate-pulse space-y-6">
          <div className="h-4 w-64 bg-[var(--bg-secondary)]" />
          <div className="h-12 w-80 bg-[var(--bg-secondary)]" />
          <div className="flex flex-col lg:flex-row gap-6 mt-6">
            <div className="flex-[2] space-y-4">
              <div className="h-40 bg-[var(--bg-secondary)]" />
              <div className="h-40 bg-[var(--bg-secondary)]" />
              <div className="h-40 bg-[var(--bg-secondary)]" />
            </div>
            <div className="flex-1 h-80 bg-[var(--bg-secondary)]" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !grant) {
    return (
      <div className="relative z-[1] bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <div className="mx-auto max-w-5xl px-4 md:px-12 py-16 text-center">
          <h1 className="font-headline text-[28px] md:text-[32px] text-[var(--text-primary)]">
            GRANT NOT FOUND
          </h1>
          <p className="mt-2 text-[14px] text-[var(--text-muted)]">
            {error ?? 'We could not find this grant. Check the link and try again.'}
          </p>
          <button
            type="button"
            className="btn btn-secondary mt-4"
            onClick={() => navigate('/grants')}
            data-hover
          >
            ← Back to Grants
          </button>
        </div>
      </div>
    )
  }

  const { completed, total } = getMilestoneProgress(grant.milestones ?? [])
  const domainColor = getDomainColor(grant.domain ?? 'General')

  const approveCount = votes?.approve ?? 0
  const rejectCount = votes?.reject ?? 0
  const totalVotes = approveCount + rejectCount
  const approvePercent =
    totalVotes > 0 ? Math.round((approveCount / totalVotes) * 100) : 0
  const rejectPercent = totalVotes > 0 ? 100 - approvePercent : 0

  const healthScore = health?.score ?? null

  return (
    <div className="relative z-[1] bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 md:px-12 py-10">
        {/* Header */}
        <div className="gd-header">
          <p className="text-[13px] text-[var(--text-muted)] mb-3">
            <Link
              to="/grants"
              className="underline decoration-dotted hover:text-[var(--accent)]"
            >
              Grants
            </Link>{' '}
            / {grant.domain ?? 'General'} /{' '}
            {(grant.title ?? 'Grant')
              .toString()
              .slice(0, 40)
              .concat(
                (grant.title ?? '').length > 40 ? '…' : '',
              )}
          </p>
          <h1 className="font-headline text-[40px] md:text-[72px] leading-[0.85] text-[var(--text-primary)]">
            {grant.title ?? 'Grant Detail'}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className="text-[11px] uppercase tracking-[0.1em] text-white px-3 py-1"
              style={{
                backgroundColor: domainColor,
                clipPath:
                  'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
              }}
            >
              {grant.domain ?? 'General'}
            </span>
            <span
              className="text-[11px] uppercase tracking-[0.1em] text-white px-3 py-1"
              style={{
                backgroundColor:
                  grant.status === 'OPEN'
                    ? 'var(--accent)'
                    : grant.status === 'FUNDED'
                      ? 'var(--gold)'
                      : grant.status === 'COMPLETED'
                        ? '#2E7D32'
                        : 'var(--text-muted)',
                clipPath:
                  'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
              }}
            >
              {grant.status ?? 'OPEN'}
            </span>
            <span className="text-[13px] text-[var(--text-muted)]">
              Deadline: {formatDate(grant.deadline)}
            </span>
            <span className="text-[13px] text-[var(--text-muted)]">
              {(grant.milestones ?? []).length} Milestones
            </span>
          </div>
        </div>

        {/* Main layout */}
        <div className="mt-8 flex flex-col lg:flex-row gap-8 items-start">
          {/* Left column */}
          <div className="gd-left flex-[2] space-y-8">
            {/* About */}
            <section>
              <h2 className="font-headline text-[22px] md:text-[24px] text-[var(--text-primary)]">
                ABOUT THIS GRANT
              </h2>
              <p className="mt-3 text-[15px] text-[var(--text-secondary)] leading-relaxed">
                {grant.description ??
                  'This grant supports student builders working on transparent, milestone-based projects on Algorand Testnet.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-[var(--text-muted)]">
                <span className="uppercase tracking-[0.12em]">
                  Sponsored by
                </span>
                <span className="font-mono-chain text-[12px] text-[var(--text-primary)]">
                  {grant.sponsorWallet
                    ? `${grant.sponsorWallet.slice(0, 8)}...${grant.sponsorWallet.slice(-6)}`
                    : 'Unknown'}
                </span>
                <span className="uppercase tracking-[0.12em] ml-4">
                  Grant ID
                </span>
                <span className="font-mono-chain text-[12px] text-[var(--text-primary)]">
                  {id
                    ? `${id.slice(0, 8)}...${id.slice(-6)}`
                    : '—'}
                </span>
              </div>
              <div className="mt-8 h-px bg-[var(--border)]" />
            </section>

            {/* Milestones */}
            <section className="gd-milestones">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-headline text-[24px] md:text-[28px] text-[var(--text-primary)]">
                  MILESTONES
                </h2>
                <p className="text-[12px] text-[var(--text-muted)]">
                  {completed} of {total} complete
                </p>
              </div>

              <div className="space-y-1">
                {(grant.milestones ?? []).map((m: any, index: number) => {
                  const isExpanded = expandedMilestone === index
                  const nodeColor =
                    m.status === 'VERIFIED' || m.status === 'RELEASED'
                      ? 'var(--accent)'
                      : m.status === 'SUBMITTED'
                        ? 'var(--gold)'
                        : 'var(--border)'

                  return (
                    <div
                      key={m.id ?? index}
                      className="relative pl-9"
                    >
                      {/* timeline line */}
                      <div
                        className="absolute left-[18px] top-0 bottom-0"
                        style={{ width: '2px', backgroundColor: 'var(--border)' }}
                      />
                      {/* node */}
                      <div
                        className="absolute left-[10px] top-[18px] flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bg-elevated)]"
                        style={{ border: `2px solid ${nodeColor}` }}
                      >
                        {(m.status === 'VERIFIED' || m.status === 'RELEASED') && (
                          <span
                            className="text-[12px]"
                            style={{ color: '#ffffff' }}
                          >
                            ✓
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        className="w-full text-left py-3 pl-2 pr-2 hover:bg-[var(--bg-secondary)] flex items-center justify-between gap-4"
                        onClick={() => toggleMilestone(index)}
                      >
                        <div className="min-w-0">
                          <p className="text-[15px] font-medium text-[var(--text-primary)] truncate">
                            {m.title ?? `Milestone ${index + 1}`}
                          </p>
                          <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                            Due: {formatDate(m.deadline)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="font-headline text-[18px] text-[var(--gold)]">
                            ₹
                            {Number(m.amount ?? 0).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                            {m.status ?? 'PENDING'}
                          </span>
                          <span
                            className={`text-[14px] text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''
                              }`}
                          >
                            ▾
                          </span>
                        </div>
                      </button>

                      <div
                        className={`milestone-content-${index} overflow-hidden`}
                        style={{ height: 0 }}
                      >
                        <div
                          className="mt-1 mb-2 border-l-[3px] bg-[var(--bg-secondary)] px-4 py-3"
                          style={{ borderColor: domainColor }}
                        >
                          <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                            {m.description ??
                              'Milestone details and requirements will appear here.'}
                          </p>
                          {m.proofUrl && (
                            <div className="mt-3">
                              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                SUBMITTED PROOF
                              </p>
                              <a
                                href={m.proofUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[13px] text-[var(--accent)] underline"
                              >
                                {m.proofUrl}
                              </a>
                            </div>
                          )}
                          {m.proofDescription && (
                            <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
                              {m.proofDescription}
                            </p>
                          )}

                          {(m.status === 'VERIFIED' || m.status === 'RELEASED') && (
                            <BlockchainProof
                              txId={m.txId ?? 'VERIFIED-ON-CHAIN'}
                              explorerUrl={
                                m.explorerUrl ?? `${ALGO_EXPLORER}/tx/${m.txId ?? ''}`
                              }
                              verified
                              label="Milestone verified by AI on Algorand"
                            />
                          )}

                          {m.status === 'RELEASED' && (
                            <div className="mt-3 border border-[var(--gold)] bg-[var(--gold-light)] px-3 py-2">
                              <p className="text-[13px] text-[var(--gold)] font-medium">
                                ✓ Funds Released:{' '}
                                ₹
                                {Number(m.amount ?? 0).toLocaleString('en-IN')}{' '}
                                ALGO
                              </p>
                            </div>
                          )}

                          {(m.status === 'PENDING' || !m.status) && (
                            <button
                              type="button"
                              className="btn btn-primary mt-3"
                              onClick={() =>
                                navigate(`/milestones/${id}/${index}`)
                              }
                              data-hover
                            >
                              Submit Milestone Proof →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-8 h-px bg-[var(--border)]" />
            </section>

            {/* DAO votes */}
            <section className="gd-votes">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-headline text-[24px] md:text-[28px] text-[var(--text-primary)]">
                  COMMUNITY VOTES
                </h2>
                <button
                  type="button"
                  className="btn btn-secondary text-[12px] px-3 py-1.5"
                  onClick={() => setVoteModalOpen(true)}
                  data-hover
                >
                  Cast Your Vote
                </button>
              </div>

              {totalVotes > 0 ? (
                <>
                  <div className="mt-2 h-[6px] w-full overflow-hidden flex rounded-none">
                    <div
                      style={{
                        width: `${approvePercent}%`,
                        backgroundColor: 'var(--accent)',
                      }}
                    />
                    <div
                      style={{
                        width: `${rejectPercent}%`,
                        backgroundColor: 'var(--danger)',
                      }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[12px]">
                    <span className="text-[var(--accent)]">
                      APPROVE {approvePercent}%
                    </span>
                    <span className="text-[var(--danger)]">
                      REJECT {rejectPercent}%
                    </span>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-[13px] text-[var(--text-muted)]">
                  No votes yet. Be the first.
                </p>
              )}

              <div className="mt-4 divide-y divide-[var(--border)]">
                {(votes?.items ?? []).slice(0, 5).map((v: any, index: number) => (
                  <div
                    key={v.id ?? index}
                    className="py-3 flex items-start gap-3"
                  >
                    <span
                      className="text-[10px] uppercase tracking-[0.09em] px-2 py-1 flex-shrink-0"
                      style={{
                        backgroundColor:
                          v.vote === 'APPROVE'
                            ? 'var(--accent-light)'
                            : 'var(--danger-light)',
                        color:
                          v.vote === 'APPROVE'
                            ? 'var(--accent)'
                            : 'var(--danger)',
                        clipPath:
                          'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
                      }}
                    >
                      {v.vote}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono-chain text-[11px] text-[var(--text-muted)]">
                        {v.voterWallet
                          ? `${v.voterWallet.slice(0, 8)}...${v.voterWallet.slice(-6)}`
                          : 'Unknown'}
                      </p>
                      <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                        {v.comment ?? 'No comment'}
                      </p>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)] flex-shrink-0">
                      {timeAgo(v.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Transactions */}
            <section className="gd-transactions mt-6">
              <h2 className="font-headline text-[24px] md:text-[28px] text-[var(--text-primary)] mb-3">
                TRANSACTION HISTORY
              </h2>
              {transactions.length === 0 ? (
                <p className="text-[13px] text-[var(--text-muted)]">
                  No transactions recorded yet.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {transactions.map((tx: any, index: number) => {
                    const type = tx.type ?? ''
                    const amount = tx.amount ?? 0
                    const txId = tx.txId ?? tx.id ?? ''
                    let iconBg = 'var(--text-muted)'
                    let iconChar = '·'
                    if (type === 'MILESTONE_RELEASE') {
                      iconBg = 'var(--accent)'
                      iconChar = '↑'
                    } else if (type === 'GRANT_FUNDED') {
                      iconBg = 'var(--gold)'
                      iconChar = '₹'
                    } else if (type === 'VOTE_RECORDED') {
                      iconBg = 'var(--accent)'
                      iconChar = '✓'
                    }

                    return (
                      <div
                        key={txId || index}
                        className="py-3 flex items-center gap-4"
                      >
                        <div className="flex-shrink-0">
                          <div
                            className="h-8 w-8 rounded-full flex items-center justify-center text-[13px] text-white"
                            style={{ backgroundColor: iconBg }}
                          >
                            {iconChar}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-[var(--text-primary)]">
                            {formatTxType(type)}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-muted)]">
                            {tx.fromWallet && (
                              <span className="font-mono-chain">
                                {tx.fromWallet.slice(0, 6)}...
                              </span>
                            )}
                            {tx.fromWallet && tx.toWallet && <span>→</span>}
                            {tx.toWallet && (
                              <span className="font-mono-chain">
                                {tx.toWallet.slice(0, 6)}...
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="font-headline text-[16px] text-[var(--gold)]">
                            {amount ? `+₹${amount.toLocaleString('en-IN')}` : '—'}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            {timeAgo(tx.createdAt)}
                          </p>
                          {txId && (
                            <button
                              type="button"
                              className="mt-1 font-mono-chain text-[10px] text-[var(--accent)] underline"
                              onClick={() =>
                                window.open(`${ALGO_EXPLORER}/tx/${txId}`, '_blank')
                              }
                            >
                              TX: {txId.slice(0, 8)}...
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="gd-sidebar flex-1 w-full lg:w-[35%] lg:sticky lg:top-[100px] space-y-4">
            {/* Funding card */}
            <section
              className="bg-[var(--bg-elevated)] border border-[var(--border)] px-6 py-6"
              style={{
                borderTopWidth: '3px',
                borderTopColor: 'var(--gold)',
                clipPath:
                  'polygon(10px 0%, calc(100% - 10px) 0%, 100% 10px, 100% 100%, 0% 100%, 0% 10px)',
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Total Funding
              </p>
              <p className="mt-1 font-headline text-[40px] md:text-[56px] text-[var(--gold)] leading-none">
                ₹{Number(grant.totalAmount ?? 0).toLocaleString('en-IN')}
              </p>
              <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                Algorand Testnet · ALGO
              </p>

              <div className="my-4 h-px bg-[var(--border)]" />

              <div>
                <div className="flex items-center justify-between text-[12px] text-[var(--text-muted)]">
                  <span>Milestones</span>
                  <span>
                    {completed} of {total} complete
                  </span>
                </div>
                <div className="mt-2 h-[4px] w-full bg-[var(--border)]">
                  <div
                    className="h-full bg-[var(--accent)]"
                    style={{
                      width:
                        total > 0
                          ? `${Math.round((completed / total) * 100)}%`
                          : '0%',
                    }}
                  />
                </div>
              </div>

              <div className="my-4 h-px bg-[var(--border)]" />

              <button
                type="button"
                className="btn btn-primary w-full"
                onClick={() => navigate(`/grants/${id}/apply`)}
                data-hover
              >
                Apply for This Grant →
              </button>
              <button
                type="button"
                className="btn btn-secondary w-full mt-2"
                onClick={() =>
                  window.open(`${ALGO_EXPLORER}/asset/${grant.assetId ?? ''}`, '_blank')
                }
                data-hover
              >
                View on Explorer ↗
              </button>

              <div className="my-4 h-px bg-[var(--border)]" />

              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Grant ID
              </p>
              <p className="mt-1 font-mono-chain text-[11px] text-[var(--text-primary)]">
                {id
                  ? `${id.slice(0, 8)}...${id.slice(-6)}`
                  : '—'}
              </p>

              <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Sponsor
              </p>
              <p className="mt-1 font-mono-chain text-[11px] text-[var(--text-primary)]">
                {grant.sponsorWallet
                  ? `${grant.sponsorWallet.slice(0, 8)}...${grant.sponsorWallet.slice(-6)}`
                  : 'Unknown'}
              </p>
            </section>

            {/* Health card */}
            <section
              className="bg-[var(--bg-secondary)] border border-[var(--border)] px-5 py-5"
              style={{
                borderTopWidth: '3px',
                borderTopColor: 'var(--accent)',
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Grant Health Score
              </p>
              {healthScore === null ? (
                <div className="mt-3 space-y-3 animate-pulse">
                  <div className="h-8 w-20 bg-[var(--bg-elevated)]" />
                  <div className="h-3 w-full bg-[var(--bg-elevated)]" />
                  <div className="h-3 w-4/5 bg-[var(--bg-elevated)]" />
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="font-headline text-[40px] md:text-[72px] text-[var(--accent)] leading-none">
                      {healthScore}
                    </span>
                    <span className="text-[12px] text-[var(--text-muted)]">
                      / 100
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {[
                      {
                        label: 'Transparency',
                        value: health?.transparency ?? 0,
                      },
                      {
                        label: 'Delivery',
                        value: health?.delivery ?? 0,
                      },
                      {
                        label: 'Community Trust',
                        value: health?.communityTrust ?? 0,
                      },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-[var(--text-secondary)]">
                            {item.label}
                          </span>
                          <span className="text-[var(--text-muted)]">
                            {item.value}%
                          </span>
                        </div>
                        <div className="mt-1 h-[3px] w-full bg-[var(--border)]">
                          <div
                            className="h-full bg-[var(--accent)]"
                            style={{ width: `${item.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </aside>
        </div>
      </div>

      {/* Vote modal */}
      {voteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,24,20,0.6)] backdrop-blur-sm">
          <div
            className="bg-[var(--bg-elevated)] max-w-lg w-[90%] md:w-[480px] px-6 py-6 md:px-8 md:py-8"
            style={{
              clipPath:
                'polygon(12px 0%, calc(100% - 12px) 0%, 100% 12px, 100% 100%, 0% 100%, 0% 12px)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline text-[22px] md:text-[26px] text-[var(--text-primary)]">
                CAST YOUR VOTE
              </h3>
              <button
                type="button"
                className="text-[20px] text-[var(--text-muted)]"
                onClick={() => setVoteModalOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="text-[13px] text-[var(--text-secondary)] mb-4">
              {grant.title}
            </p>

            {/* Choice */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setVoteChoice('APPROVE')}
                className="flex-1 px-3 py-3 text-center text-[14px] font-semibold uppercase tracking-[0.08em]"
                style={{
                  backgroundColor:
                    voteChoice === 'APPROVE'
                      ? 'var(--accent)'
                      : 'var(--bg-secondary)',
                  color:
                    voteChoice === 'APPROVE'
                      ? '#ffffff'
                      : 'var(--text-muted)',
                  border: `1px solid ${voteChoice === 'APPROVE'
                    ? 'var(--accent)'
                    : 'var(--border)'
                    }`,
                  clipPath:
                    'polygon(8px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 8px)',
                }}
                data-hover
              >
                ✓ APPROVE
              </button>
              <button
                type="button"
                onClick={() => setVoteChoice('REJECT')}
                className="flex-1 px-3 py-3 text-center text-[14px] font-semibold uppercase tracking-[0.08em]"
                style={{
                  backgroundColor:
                    voteChoice === 'REJECT'
                      ? 'var(--danger)'
                      : 'var(--bg-secondary)',
                  color:
                    voteChoice === 'REJECT'
                      ? '#ffffff'
                      : 'var(--text-muted)',
                  border: `1px solid ${voteChoice === 'REJECT'
                    ? 'var(--danger)'
                    : 'var(--border)'
                    }`,
                  clipPath:
                    'polygon(8px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 8px)',
                }}
                data-hover
              >
                ✗ REJECT
              </button>
            </div>

            <div className="mt-4">
              <label className="block text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1">
                Comment (Optional)
              </label>
              <textarea
                rows={3}
                value={voteComment}
                onChange={(e) => setVoteComment(e.target.value)}
                placeholder="Share your reasoning..."
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[14px] text-[var(--text-primary)] px-3 py-2"
              />
            </div>

            <button
              type="button"
              className="btn btn-primary w-full mt-4"
              onClick={handleVote}
              disabled={voteLoading}
              data-hover
            >
              {voteLoading ? 'Submitting...' : 'Submit Vote →'}
            </button>

            {voteError && (
              <p className="mt-2 text-[12px] text-[var(--danger)]">{voteError}</p>
            )}

            {voteResult && (
              <div className="mt-4">
                <BlockchainProof
                  txId={voteResult.blockchain.txId}
                  explorerUrl={voteResult.blockchain.explorerUrl}
                  verified={voteResult.blockchain.verified}
                  label="Vote recorded on Algorand"
                />
                {voteSummary && (
                  <div className="mt-3 border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-left">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      DAO VOTE SUMMARY
                    </p>
                    <p className="mt-1 text-[13px] text-[var(--text-secondary)] leading-relaxed">
                      {voteSummary.result?.summary ??
                        'AI summary of votes will appear here.'}
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn-secondary w-full mt-3"
                  onClick={() => setVoteModalOpen(false)}
                  data-hover
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default GrantDetail

