import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import BlockchainProof from '../components/BlockchainProof'
import { apiGet } from '../utils/api'
import { callN8n } from '../utils/callN8n'
import { N8N_MATCH_GRANTS } from '../config'

gsap.registerPlugin(ScrollTrigger)

const DOMAINS = ['ALL', 'Technology', 'Science', 'Arts', 'Social Impact', 'Health']
const STATUSES = ['ALL', 'OPEN', 'FUNDED', 'COMPLETED']

function formatDate(dateStr: string): string {
  if (!dateStr) return 'No deadline'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return 'No deadline'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
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
    (m) => m.status === 'VERIFIED' || m.status === 'RELEASED',
  ).length
  return { completed, total: milestones.length }
}

const BrowseGrants = () => {
  const { activeAddress } = useWallet()
  const walletAddress =
    activeAddress ?? 'DEMO7XKLMNPQRST2UVWXYZ3ABCDEFGHIJKLMNO'
  const navigate = useNavigate()

  const [grants, setGrants] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeDomain, setActiveDomain] = useState('ALL')
  const [activeStatus, setActiveStatus] = useState('OPEN')
  const [sortBy, setSortBy] = useState('newest')

  const [matchForm, setMatchForm] = useState({
    projectTitle: '',
    domain: 'Technology',
    skills: [] as string[],
    skillInput: '',
    teamSize: 3,
  })
  const [matchResult, setMatchResult] = useState<any>(null)
  const [matchLoading, setMatchLoading] = useState(false)
  const [matchError, setMatchError] = useState<string | null>(null)
  const [recommendedIds, setRecommendedIds] = useState<string[]>([])

  const cardsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // 🔌 BACKEND: GET /grants
    apiGet('/grants')
      .then((data) => {
        const list = Array.isArray(data) ? data : data.grants ?? []
        setGrants(list)
        setFiltered(list)
      })
      .catch(() => setError('Could not load grants. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let result = [...grants]

    if (activeDomain !== 'ALL') {
      result = result.filter((g) => g.domain === activeDomain)
    }
    if (activeStatus !== 'ALL') {
      result = result.filter((g) => g.status === activeStatus)
    }

    if (sortBy === 'amount-high') {
      result.sort((a, b) => (b.totalAmount ?? 0) - (a.totalAmount ?? 0))
    } else if (sortBy === 'deadline') {
      result.sort(
        (a, b) =>
          new Date(a.deadline ?? 0).getTime() -
          new Date(b.deadline ?? 0).getTime(),
      )
    } else {
      result.sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime(),
      )
    }

    setFiltered(result)
  }, [grants, activeDomain, activeStatus, sortBy])

  useEffect(() => {
    if (!loading && cardsRef.current) {
      const items = cardsRef.current.querySelectorAll('.grant-card')
      if (!items.length) return
      gsap.fromTo(
        items,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.07, duration: 0.4, ease: 'power2.out' },
      )
    }
  }, [filtered, loading])

  useEffect(() => {
    const tl = gsap.timeline()
    tl.from('.browse-header', { y: -20, duration: 0.4 })
      .from('.browse-filters', { y: -10, duration: 0.3 }, '-=0.2')
      .from('.browse-matcher', { x: 40, duration: 0.4 }, '-=0.1')
  }, [])

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const value = matchForm.skillInput.trim()
    if (!value) return
    if (matchForm.skills.includes(value)) return
    if (matchForm.skills.length >= 8) return
    setMatchForm((prev) => ({
      ...prev,
      skills: [...prev.skills, value],
      skillInput: '',
    }))
  }

  const handleRemoveSkill = (skill: string) => {
    setMatchForm((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }))
  }

  async function handleMatch() {
    setMatchLoading(true)
    setMatchError(null)
    setMatchResult(null)

    try {
      // 🤖 AI: POST /match-grants — find best grants for this project
      const data = await callN8n(N8N_MATCH_GRANTS, walletAddress, {
        projectTitle: matchForm.projectTitle,
        domain: matchForm.domain,
        skills: matchForm.skills,
        teamSize: matchForm.teamSize,
      })

      setMatchResult(data)

      const matches = data.result.matches ?? []
      const ids: string[] = matches
        .map((m: any) => m.grantId ?? m.id ?? m._id)
        .filter(Boolean)
      if (data.result.topPick) {
        const topId =
          data.result.topPick.grantId ??
          data.result.topPick.id ??
          data.result.topPick._id
        if (topId) ids.unshift(topId)
      }
      const uniqueIds = Array.from(new Set(ids))
      setRecommendedIds(uniqueIds)

      // Scroll to first recommended card
      const firstCard = document.querySelector(
        '.grant-card[data-recommended="true"]',
      ) as HTMLElement | null
      if (firstCard) {
        firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    } catch (err) {
      setMatchError('AI matching failed. Try again.')
    } finally {
      setMatchLoading(false)
    }
  }

  return (
    <div className="relative z-[1] bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 md:px-12 py-10">
        {/* Header */}
        <header className="browse-header">
          <h1 className="font-headline text-[42px] md:text-[80px] leading-[0.85] text-[var(--text-primary)]">
            OPEN GRANTS
          </h1>
          <div className="mt-2 flex flex-col md:flex-row md:items-end md:justify-between gap-2">
            <p className="text-[15px] text-[var(--text-primary)]">
              Find the right funding for your student project.
            </p>
            <p className="text-[14px] text-[var(--accent)] font-semibold">
              {filtered.length} grants available
            </p>
          </div>
        </header>

        {/* Filters bar */}
        <section
          className="browse-filters sticky top-[80px] z-40 mt-6 border-b border-[var(--border)] bg-[var(--bg-elevated)]/95 backdrop-blur"
        >
          <div className="py-3 space-y-2">
            {/* Domains */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {DOMAINS.map((domain) => {
                const active = activeDomain === domain
                return (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => setActiveDomain(domain)}
                    className="text-[11px] uppercase tracking-[0.08em] px-3 py-1 whitespace-nowrap transition-colors"
                    style={{
                      backgroundColor: active
                        ? 'var(--accent)'
                        : 'var(--bg-secondary)',
                      color: active
                        ? '#ffffff'
                        : 'var(--text-secondary)',
                      border: `1px solid ${
                        active ? 'var(--accent)' : 'var(--border)'
                      }`,
                      clipPath:
                        'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
                    }}
                    data-hover
                  >
                    {domain}
                  </button>
                )
              })}
            </div>

            {/* Status + Sort */}
            <div className="mt-1 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {STATUSES.map((status) => {
                  const active = activeStatus === status
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setActiveStatus(status)}
                      className="text-[11px] uppercase tracking-[0.08em] px-3 py-1 whitespace-nowrap transition-colors"
                      style={{
                        backgroundColor: active
                          ? 'var(--accent)'
                          : 'var(--bg-secondary)',
                        color: active
                          ? '#ffffff'
                          : 'var(--text-secondary)',
                        border: `1px solid ${
                          active ? 'var(--accent)' : 'var(--border)'
                        }`,
                        clipPath:
                          'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
                      }}
                      data-hover
                    >
                      {status}
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-2 md:justify-end">
                <span className="text-[12px] text-[var(--text-primary)]">
                  Sort by
                </span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none bg-[var(--bg-secondary)] border border-[var(--border)] text-[13px] text-[var(--text-primary)] px-3 py-1 pr-6"
                    style={{
                      clipPath:
                        'polygon(8px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 8px)',
                    }}
                  >
                    <option value="newest">Newest First</option>
                    <option value="amount-high">Highest Amount</option>
                    <option value="deadline">Deadline Soon</option>
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-primary)]">
                    ▾
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main content */}
        <section className="mt-8 flex flex-col lg:flex-row gap-6 items-start">
          {/* Left – Grants grid */}
          <div
            ref={cardsRef}
            className="flex-[3] w-full"
          >
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    // eslint-disable-next-line react/no-array-index-key
                    key={i}
                    className="h-[260px] rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] animate-pulse"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center border border-[var(--border)] bg-[var(--bg-secondary)] px-8 py-12 text-center">
                <h2 className="font-headline text-[24px] md:text-[28px] text-[var(--text-primary)]">
                  COULDN&apos;T LOAD GRANTS
                </h2>
                <p className="mt-2 text-[14px] text-[var(--text-primary)]">
                  {error}
                </p>
                <button
                  type="button"
                  className="btn btn-secondary mt-4"
                  onClick={() => window.location.reload()}
                  data-hover
                >
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-8 py-12 text-center">
                <p className="text-[16px] text-[var(--text-primary)]">
                  No grants match your filters.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary mt-3"
                  onClick={() => {
                    setActiveDomain('ALL')
                    setActiveStatus('ALL')
                  }}
                  data-hover
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((grant) => {
                  const id = grant._id ?? grant.id
                  const { completed, total } = getMilestoneProgress(
                    grant.milestones ?? [],
                  )
                  const progress =
                    total > 0 ? Math.round((completed / total) * 100) : 0
                  const domainColor = getDomainColor(grant.domain)
                  const isRecommended = recommendedIds.includes(id)

                  return (
                    <div
                      key={id}
                      className="grant-card flex flex-col border border-[var(--border)] bg-[var(--bg-elevated)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_var(--shadow-strong)] hover:border-[var(--accent)] cursor-pointer"
                      onClick={() => navigate(`/grants/${id}`)}
                      data-recommended={isRecommended ? 'true' : 'false'}
                    >
                      <div
                        className="h-[3px] w-full"
                        style={{ backgroundColor: domainColor }}
                      />
                      <div className="relative p-5 flex-1 flex flex-col">
                        {isRecommended && (
                          <div
                            className="absolute top-3 right-3 text-[10px] uppercase tracking-[0.1em] text-white px-3 py-1"
                            style={{
                              backgroundColor: 'var(--accent)',
                              clipPath:
                                'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
                            }}
                          >
                            ⭐ AI MATCH
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[11px] text-[var(--text-primary)] uppercase tracking-[0.08em] mb-1 pr-8">
                          <span>{grant.domain ?? 'General'}</span>
                          <span>Due: {formatDate(grant.deadline)}</span>
                        </div>
                        <h2 className="mt-1 text-[17px] font-semibold text-[var(--text-primary)] line-clamp-2">
                          {grant.title ?? 'Untitled Grant'}
                        </h2>
                        <p className="mt-2 text-[13px] text-[var(--text-primary)] line-clamp-3">
                          {grant.description ??
                            'Milestone-based student grant on Algorand Testnet.'}
                        </p>
                        <div className="my-4 h-px bg-[var(--border)]" />
                        <div className="flex items-end justify-between gap-2">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-primary)]">
                              Total Funding
                            </p>
                            <p className="font-headline text-[28px] text-[var(--gold)] leading-none">
                              ₹
                              {Number(
                                grant.totalAmount ?? 0,
                              ).toLocaleString('en-IN')}
                            </p>
                            <p className="text-[11px] text-[var(--text-primary)]">
                              ALGO
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className="inline-block text-[10px] uppercase tracking-[0.08em] px-3 py-1"
                              style={{
                                borderRadius: 0,
                                backgroundColor:
                                  grant.status === 'OPEN'
                                    ? 'var(--accent-light)'
                                    : grant.status === 'FUNDED'
                                      ? 'var(--gold-light)'
                                      : grant.status === 'COMPLETED'
                                        ? '#E8F5E8'
                                        : 'var(--bg-secondary)',
                                color:
                                  grant.status === 'OPEN'
                                    ? 'var(--accent)'
                                    : grant.status === 'FUNDED'
                                      ? 'var(--gold)'
                                        : grant.status === 'COMPLETED'
                                        ? '#2E7D32'
                                        : 'var(--text-secondary)',
                              }}
                            >
                              {grant.status ?? 'OPEN'}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[11px] text-[var(--text-primary)]">
                            <span>Milestones</span>
                            <span>
                              {completed} of {total}
                            </span>
                          </div>
                          <div className="mt-1 h-[3px] w-full bg-[var(--border)]">
                            <div
                              className="h-full bg-[var(--accent)]"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary mt-4 w-full"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/grants/${id}`)
                          }}
                          data-hover
                        >
                          View Grant →
                        </button>
                        <p className="mt-2 font-mono-chain text-[10px] text-[var(--text-primary)] text-center">
                          ⛓️ On Algorand Testnet
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right – AI Matcher */}
          <aside className="browse-matcher w-full lg:w-[28%]">
            <div
              className="border border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-5 md:px-6 md:py-6"
              style={{
                borderTopWidth: '3px',
                borderTopColor: 'var(--accent)',
                clipPath:
                  'polygon(10px 0%, calc(100% - 10px) 0%, 100% 10px, 100% 100%, 0% 100%, 0% 10px)',
              }}
            >
              <h2 className="font-headline text-[22px] md:text-[24px] text-[var(--text-primary)]">
                AI GRANT MATCHER
              </h2>
              <p className="mt-1 text-[12px] text-[var(--text-primary)]">
                Tell us about your project. We&apos;ll find the best grants for
                you.
              </p>

              <div className="mt-4 space-y-4">
                {/* Project Title */}
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.08em] text-[var(--text-primary)] mb-1">
                    Project Title
                  </label>
                  <input
                    type="text"
                    value={matchForm.projectTitle}
                    onChange={(e) =>
                      setMatchForm((prev) => ({
                        ...prev,
                        projectTitle: e.target.value,
                      }))
                    }
                    placeholder="e.g. Smart Irrigation System"
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[14px] text-[var(--text-primary)] px-3 py-2"
                  />
                </div>

                {/* Domain */}
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.08em] text-[var(--text-primary)] mb-1">
                    Domain
                  </label>
                  <select
                    value={matchForm.domain}
                    onChange={(e) =>
                      setMatchForm((prev) => ({
                        ...prev,
                        domain: e.target.value,
                      }))
                    }
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[14px] text-[var(--text-primary)] px-3 py-2"
                  >
                    {DOMAINS.filter((d) => d !== 'ALL').map((d) => (
                      <option
                        key={d}
                        value={d}
                      >
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Team size */}
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.08em] text-[var(--text-primary)] mb-1">
                    Team Size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={matchForm.teamSize}
                    onChange={(e) =>
                      setMatchForm((prev) => ({
                        ...prev,
                        teamSize: Number(e.target.value || 1),
                      }))
                    }
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[14px] text-[var(--text-primary)] px-3 py-2"
                  />
                </div>

                {/* Skills */}
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.08em] text-[var(--text-primary)] mb-1">
                    Skills &amp; Technologies
                  </label>
                  <input
                    type="text"
                    value={matchForm.skillInput}
                    onChange={(e) =>
                      setMatchForm((prev) => ({
                        ...prev,
                        skillInput: e.target.value,
                      }))
                    }
                    onKeyDown={handleSkillKeyDown}
                    placeholder="Type a skill and press Enter"
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[14px] text-[var(--text-primary)] px-3 py-2"
                  />
                  {matchForm.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {matchForm.skills.map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="text-[11px] px-2 py-1 flex items-center gap-1"
                          style={{
                            backgroundColor: 'var(--accent-light)',
                            color: 'var(--accent)',
                            clipPath:
                              'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
                          }}
                        >
                          <span>{skill}</span>
                          <span>×</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary mt-4 w-full"
                onClick={handleMatch}
                disabled={matchLoading}
                data-hover
              >
                {matchLoading ? 'Finding matches...' : 'Find My Matches →'}
              </button>

              {matchLoading && (
                <div className="mt-4 space-y-2 animate-pulse">
                  <div className="h-3 bg-[var(--bg-elevated)]" />
                  <div className="h-3 bg-[var(--bg-elevated)] w-4/5" />
                  <p className="text-[12px] text-[var(--text-primary)]">
                    AI is analyzing your project...
                  </p>
                </div>
              )}

              {matchError && !matchLoading && (
                <p className="mt-3 text-[12px] text-[var(--danger)]">
                  {matchError}
                </p>
              )}

              {matchResult && !matchLoading && (
                <div className="mt-5">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--accent)]">
                    AI ANALYSIS
                  </p>
                  {matchResult.result?.advice && (
                    <p className="mt-2 text-[13px] text-[var(--text-primary)] leading-relaxed">
                      {matchResult.result.advice}
                    </p>
                  )}
                  {matchResult.result?.topPick && (
                    <div className="mt-3">
                      <p className="text-[11px] uppercase text-[var(--text-primary)]">
                        TOP PICK
                      </p>
                      <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                        {matchResult.result.topPick.title ??
                          'Recommended grant'}
                      </p>
                      {matchResult.result.topPick.id && (
                        <button
                          type="button"
                          className="btn btn-secondary mt-2 w-full"
                          onClick={() =>
                            navigate(`/grants/${matchResult.result.topPick.id}`)
                          }
                          data-hover
                        >
                          View Top Match →
                        </button>
                      )}
                    </div>
                  )}
                  <BlockchainProof
                    txId={matchResult.blockchain.txId}
                    explorerUrl={matchResult.blockchain.explorerUrl}
                    verified={matchResult.blockchain.verified}
                    label="Match analysis on Algorand"
                  />
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}

export default BrowseGrants

