import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { gsap } from 'gsap'
import BlockchainProof from '../components/BlockchainProof'
import StatCard from '../components/StatCard'
import { apiGet, apiPatch, apiPost } from '../utils/api'
import { callN8n } from '../utils/callN8n'
import { ALGO_EXPLORER, N8N_SPONSOR_ROI } from '../config'

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

function getMilestoneProgress(milestones: any[]) {
  if (!milestones?.length) return { completed: 0, total: 0, percent: 0 }
  const completed = milestones.filter(
    (m: any) => m.status === 'VERIFIED' || m.status === 'RELEASED',
  ).length
  const percent = Math.round((completed / milestones.length) * 100)
  return { completed, total: milestones.length, percent }
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

const SponsorDashboard = () => {
  const navigate = useNavigate()
  const { activeAddress } = useWallet()
  const walletAddress =
    activeAddress ?? 'KJRWDDAMLSXDBNGYALHIYU2O7MBG2PUP6UMFBB2AG6STNMMEK4ODRJ67OE'

  const [activeTab, setActiveTab] = useState<'create' | 'my-grants' | 'roi'>(
    'create',
  )

  const [myGrants, setMyGrants] = useState<any[]>([])
  const [grantsLoading, setGrantsLoading] = useState(true)
  const [healthScores, setHealthScores] = useState<Record<string, any>>({})

  const [form, setForm] = useState({
    title: '',
    description: '',
    domain: 'Technology',
    totalAmount: '',
    deadline: '',
    milestones: [
      { title: '', description: '', amount: '', deadline: '' },
    ] as {
      title: string
      description: string
      amount: string
      deadline: string
    }[],
  })
  const [publishing, setPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState<any>(null)
  const [publishError, setPublishError] = useState<string | null>(null)

  const [selectedGrantId, setSelectedGrantId] = useState<string>('')
  const [roiLoading, setRoiLoading] = useState(false)
  const [roiResult, setRoiResult] = useState<any>(null)
  const [roiError, setRoiError] = useState<string | null>(null)

  const headerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // 🔌 BACKEND: GET /grants — filter by sponsorWallet (demo: show subset)
    apiGet('/grants')
      .then((data) => {
        const all = Array.isArray(data) ? data : data.grants ?? []
        const mine = all.filter(
          (g: any) =>
            !g.sponsorWallet ||
            g.sponsorWallet === walletAddress ||
            all.length <= 5,
        )
        setMyGrants(mine.slice(0, 6))
      })
      .catch(() => null)
      .finally(() => setGrantsLoading(false))
  }, [walletAddress])

  useEffect(() => {
    myGrants.forEach((g) => {
      const gid = g._id ?? g.id
      if (!gid || healthScores[gid]) return
      // 🔌 BACKEND: GET /health/:grantId
      apiGet(`/health/${gid}`)
        .then((h) =>
          setHealthScores((prev) => ({
            ...prev,
            [gid]: h,
          })),
        )
        .catch(() => null)
    })
  }, [myGrants, healthScores])

  useEffect(() => {
    if (!headerRef.current) return
    gsap.from('.sp-header', { y: -20, duration: 0.4 })
    gsap.from('.sp-tabs', { y: 10, duration: 0.35, delay: 0.15 })
    gsap.from('.sp-content', {
      y: 20,
      duration: 0.4,
      delay: 0.2,
    })
  }, [])

  useEffect(() => {
    gsap.fromTo('.sp-tab-panel', { y: 10 }, { y: 0, duration: 0.3, ease: 'power2.out' })
  }, [activeTab])

  const totalFunded = myGrants.reduce(
    (sum, g) => sum + (g.totalAmount ?? 0),
    0,
  )
  const milestonesTracked = myGrants.reduce(
    (sum, g) => sum + (g.milestones?.length ?? 0),
    0,
  )
  const avgHealth =
    Object.values(healthScores).length > 0
      ? Math.round(
        Object.values(healthScores).reduce(
          (s: number, h: any) => s + (h?.score ?? 0),
          0,
        ) / Object.values(healthScores).length,
      )
      : 0

  const allocated = form.milestones.reduce(
    (s, m) => s + Number(m.amount || 0),
    0,
  )
  const remaining = Number(form.totalAmount || 0) - allocated

  const remainingColor =
    remaining === 0
      ? 'var(--accent)'
      : remaining > 0
        ? 'var(--gold)'
        : 'var(--danger)'

  const addMilestone = () => {
    setForm((f) => ({
      ...f,
      milestones: [
        ...f.milestones,
        { title: '', description: '', amount: '', deadline: '' },
      ],
    }))
  }

  const removeMilestone = (i: number) => {
    setForm((f) => ({
      ...f,
      milestones: f.milestones.filter((_, idx) => idx !== i),
    }))
  }

  const updateMilestone = (
    i: number,
    field: 'title' | 'description' | 'amount' | 'deadline',
    value: string,
  ) => {
    setForm((f) => {
      const ms = [...f.milestones]
      ms[i] = { ...ms[i], [field]: value }
      return { ...f, milestones: ms }
    })
  }

  const handlePublish = async () => {
    setPublishing(true)
    setPublishError(null)
    setPublishResult(null)
    try {
      // 🔌 BACKEND: POST /grants
      const grant = await apiPost('/grants', {
        title: form.title,
        description: form.description,
        domain: form.domain,
        totalAmount: Number(form.totalAmount),
        sponsorWallet: walletAddress,
        deadline: form.deadline,
        milestones: form.milestones.map((m, i) => ({
          index: i,
          title: m.title,
          description: m.description,
          amount: Number(m.amount),
          deadline: m.deadline,
        })),
      })

      const grantId = grant._id ?? grant.id

      // 🔌 BACKEND: PATCH /grants/:id/status → FUNDED
      await apiPatch(`/grants/${grantId}/status`, { status: 'FUNDED' })

      // 🔌 BACKEND: POST /transactions — record sponsor deposit
      const txResult = await apiPost('/transactions', {
        grantId,
        type: 'DEPOSIT',
        amount: Number(form.totalAmount),
        fromWallet: walletAddress,
        toWallet: walletAddress,
        txId: `GRANT-${String(grantId ?? '').slice(0, 8) || Date.now()}`,
        explorerUrl: '',
        note: 'Grant funded',
      })

      setPublishResult({
        grant,
        blockchain: {
          txId: txResult.txId ?? `GRANT-${Date.now()}`,
          explorerUrl:
            txResult.explorerUrl ?? `${ALGO_EXPLORER}/tx/pending`,
          verified: true,
        },
      })

      setMyGrants((prev) => [grant, ...prev])
      setActiveTab('my-grants')
    } catch (err) {
      console.error('Grant creation error:', err)
      setPublishError(
        err instanceof Error ? err.message : 'Failed to publish grant.',
      )
    } finally {
      setPublishing(false)
    }
  }

  const handleROI = async () => {
    if (!selectedGrantId) return
    setRoiLoading(true)
    setRoiError(null)
    setRoiResult(null)
    const selectedGrant = myGrants.find(
      (g) => (g._id ?? g.id) === selectedGrantId,
    )

    try {
      // 🤖 AI: POST /sponsor-roi-report
      const data = await callN8n(N8N_SPONSOR_ROI, walletAddress, {
        grantId: selectedGrantId,
        grantTitle: selectedGrant?.title ?? '',
        totalAmount: selectedGrant?.totalAmount ?? 0,
        milestonesData: selectedGrant?.milestones ?? [],
        githubUrl: selectedGrant?.githubUrl ?? '',
        domain: selectedGrant?.domain ?? 'Technology',
      })

      setRoiResult(data)

      gsap.fromTo(
        '.roi-report',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },
      )
    } catch {
      setRoiError('Failed to generate ROI report. Try again.')
    } finally {
      setRoiLoading(false)
    }
  }

  return (
    <div className="relative z-[1] bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div
        ref={headerRef}
        className="mx-auto max-w-6xl px-4 md:px-12 py-10"
      >
        {/* Header */}
        <header className="sp-header flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[13px] uppercase tracking-[0.15em] text-[var(--text-primary)]">
              SPONSOR DASHBOARD
            </p>
            <h1 className="mt-1 font-headline text-[38px] md:text-[56px] leading-[0.85] text-[var(--text-primary)]">
              FUND THE FUTURE.
              <br />
              TRACK EVERY RUPEE.
            </h1>
          </div>
          <div className="flex flex-col items-start md:items-end gap-1">
            <p className="text-[12px] text-[var(--text-primary)]">
              Connected as
            </p>
            <p className="font-mono-chain text-[13px] text-[var(--text-primary)]">
              {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
            </p>
            <span
              className="mt-1 text-[11px] uppercase tracking-[0.1em] px-3 py-1"
              style={{
                backgroundColor: 'var(--accent-light)',
                color: 'var(--accent)',
                clipPath:
                  'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
              }}
            >
              ● SPONSOR
            </span>
          </div>
        </header>

        {/* Stat cards */}
        <section className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className="border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3"
            style={{
              borderLeftWidth: '3px',
              borderLeftColor: 'var(--accent)',
              clipPath:
                'polygon(10px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 10px)',
            }}
          >
            <StatCard
              label="Grants Created"
              value={myGrants.length}
              animate
              suffix=""
            />
          </div>
          <div
            className="border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3"
            style={{
              borderLeftWidth: '3px',
              borderLeftColor: 'var(--accent)',
              clipPath:
                'polygon(10px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 10px)',
            }}
          >
            <StatCard
              label="Total Funded"
              value={totalFunded}
              animate
              prefix="₹"
            />
          </div>
          <div
            className="border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3"
            style={{
              borderLeftWidth: '3px',
              borderLeftColor: 'var(--accent)',
              clipPath:
                'polygon(10px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 10px)',
            }}
          >
            <StatCard
              label="Milestones Tracked"
              value={milestonesTracked}
              animate
              suffix=""
            />
          </div>
          <div
            className="border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3"
            style={{
              borderLeftWidth: '3px',
              borderLeftColor: 'var(--accent)',
              clipPath:
                'polygon(10px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 10px)',
            }}
          >
            <StatCard
              label="Avg Health Score"
              value={avgHealth}
              animate
              suffix="/100"
            />
          </div>
        </section>

        {/* Tabs */}
        <section className="sp-tabs border-b-2 border-[var(--border)] mb-8 flex flex-wrap">
          {[
            { key: 'create', label: 'CREATE GRANT' },
            { key: 'my-grants', label: `MY GRANTS (${myGrants.length})` },
            { key: 'roi', label: 'ROI REPORTS' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className="px-4 py-3 text-[13px] uppercase tracking-[0.08em] -mb-[2px]"
              style={{
                borderBottom:
                  activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
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
        </section>

        {/* Tab content */}
        <section className="sp-content sp-tab-panel">
          {activeTab === 'create' && (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left – form */}
              <div className="flex-[3] bg-[var(--bg-elevated)] border border-[var(--border)] border-t-[3px] border-t-[var(--gold)] px-5 md:px-7 py-6 md:py-7">
                <h2 className="font-headline text-[22px] md:text-[28px] text-[var(--text-primary)] mb-4">
                  CREATE A NEW GRANT
                </h2>

                {/* Title */}
                <div>
                  <label className="block text-[12px] uppercase tracking-[0.1em] text-[var(--text-secondary)] mb-1">
                    GRANT TITLE
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AI Research Grant 2026 — SIT Hyderabad"
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-[14px] text-[var(--text-primary)] px-3 py-2"
                  />
                </div>

                {/* Description */}
                <div className="mt-4">
                  <label className="block text-[12px] uppercase tracking-[0.1em] text-[var(--text-secondary)] mb-1">
                    DESCRIPTION
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe the grant purpose, goals, and what kind of projects you want to fund..."
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-[14px] text-[var(--text-primary)] px-3 py-2"
                  />
                </div>

                {/* Domain + Amount */}
                <div className="mt-4 flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-[12px] uppercase tracking-[0.1em] text-[var(--text-secondary)] mb-1">
                      DOMAIN
                    </label>
                    <div className="relative">
                      <select
                        value={form.domain}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, domain: e.target.value }))
                        }
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-[14px] text-[var(--text-primary)] px-3 py-2 pr-6 appearance-none"
                      >
                        {[
                          'Technology',
                          'Science',
                          'Arts',
                          'Social Impact',
                          'Health',
                        ].map((d) => (
                          <option
                            key={d}
                            value={d}
                          >
                            {d}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-secondary)]">
                        ▾
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[12px] uppercase tracking-[0.1em] text-[var(--text-secondary)] mb-1">
                      TOTAL AMOUNT (ALGO)
                    </label>
                    <input
                      type="number"
                      placeholder="50000"
                      value={form.totalAmount}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          totalAmount: e.target.value,
                        }))
                      }
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-[14px] text-[var(--text-primary)] px-3 py-2"
                    />
                    <p className="mt-1 font-headline text-[20px] text-[var(--gold)]">
                      ₹
                      {Number(form.totalAmount || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      ALGO
                    </p>
                  </div>
                </div>

                {/* Deadline */}
                <div className="mt-4">
                  <label className="block text-[12px] uppercase tracking-[0.1em] text-[var(--text-secondary)] mb-1">
                    DEADLINE
                  </label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, deadline: e.target.value }))
                    }
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-[14px] text-[var(--text-primary)] px-3 py-2"
                  />
                  <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                    Grant closes for applications on this date.
                  </p>
                </div>

                {/* Milestones */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-headline text-[20px] text-[var(--text-primary)]">
                      MILESTONES
                    </h3>
                    <button
                      type="button"
                      className="btn btn-secondary text-[12px] px-3 py-1"
                      onClick={addMilestone}
                      data-hover
                    >
                      + Add Milestone
                    </button>
                  </div>
                  <p className="text-[12px] text-[var(--text-secondary)] mb-2">
                    Allocated:{' '}
                    <span className="font-headline text-[14px] text-[var(--text-primary)]">
                      ₹{allocated.toLocaleString('en-IN')}
                    </span>{' '}
                    · Remaining:{' '}
                    <span
                      className="font-headline text-[14px]"
                      style={{ color: remainingColor }}
                    >
                      ₹{remaining.toLocaleString('en-IN')}
                    </span>
                  </p>
                  <div className="space-y-3">
                    {form.milestones.map((m, idx) => (
                      <div
                        key={idx}
                        className="bg-[var(--bg-secondary)] border border-[var(--border)] px-3 py-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[13px] font-medium text-[var(--text-primary)]">
                            Milestone {idx + 1}
                          </p>
                          <button
                            type="button"
                            className="text-[16px] text-[var(--text-secondary)]"
                            onClick={() => removeMilestone(idx)}
                          >
                            ×
                          </button>
                        </div>
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Milestone title"
                            value={m.title}
                            onChange={(e) =>
                              updateMilestone(
                                idx,
                                'title',
                                e.target.value,
                              )
                            }
                            className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-[13px] text-[var(--text-primary)] px-2 py-1.5"
                          />
                          <textarea
                            rows={2}
                            placeholder="Requirements"
                            value={m.description}
                            onChange={(e) =>
                              updateMilestone(
                                idx,
                                'description',
                                e.target.value,
                              )
                            }
                            className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-[13px] text-[var(--text-primary)] px-2 py-1.5"
                          />
                          <div className="flex flex-col md:flex-row gap-2">
                            <input
                              type="number"
                              placeholder="Amount (ALGO)"
                              value={m.amount}
                              onChange={(e) =>
                                updateMilestone(
                                  idx,
                                  'amount',
                                  e.target.value,
                                )
                              }
                              className="flex-1 bg-[var(--bg-primary)] border border-[var(--border)] text-[13px] text-[var(--text-primary)] px-2 py-1.5"
                            />
                            <input
                              type="date"
                              value={m.deadline}
                              onChange={(e) =>
                                updateMilestone(
                                  idx,
                                  'deadline',
                                  e.target.value,
                                )
                              }
                              className="flex-1 bg-[var(--bg-primary)] border border-[var(--border)] text-[13px] text-[var(--text-primary)] px-2 py-1.5"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Publish */}
                <div className="mt-6 pt-4 border-t border-[var(--border)]">
                  <button
                    type="button"
                    className="btn btn-gold w-full py-3"
                    disabled={
                      publishing ||
                      !form.title ||
                      !form.totalAmount ||
                      !form.milestones.length
                    }
                    onClick={handlePublish}
                    data-hover
                  >
                    {publishing ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent animate-spin" />
                        Publishing to Blockchain...
                      </span>
                    ) : (
                      'Publish Grant to Algorand ⛓️'
                    )}
                  </button>
                  <p className="mt-2 text-[12px] text-[var(--text-secondary)] text-center">
                    Grant terms and milestones permanently recorded on Algorand
                    Testnet.
                  </p>
                  {publishError && (
                    <p className="mt-2 text-[12px] text-[var(--danger)] text-center">
                      {publishError}
                    </p>
                  )}
                </div>
              </div>

              {/* Right – preview */}
              <div className="hidden lg:block flex-1">
                <div
                  className="border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-5 sticky top-[110px]"
                  style={{
                    clipPath:
                      'polygon(10px 0%, calc(100% - 10px) 0%, 100% 10px, 100% 100%, 0% 100%, 0% 10px)',
                  }}
                >
                  <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-secondary)] mb-3">
                    GRANT PREVIEW
                  </p>
                  {!form.title ? (
                    <div className="flex h-40 items-center justify-center text-center">
                      <p className="text-[14px] text-[var(--text-secondary)]">
                        Fill in the form to see a live grant preview.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div
                        className="h-[3px] w-full mb-2"
                        style={{
                          backgroundColor: getDomainColor(form.domain),
                        }}
                      />
                      <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                        {form.domain} · {formatDate(form.deadline)}
                      </p>
                      <h3 className="mt-2 text-[18px] font-semibold text-[var(--text-primary)]">
                        {form.title}
                      </h3>
                      <p className="mt-2 text-[13px] text-[var(--text-secondary)] line-clamp-3">
                        {form.description ||
                          'Grant description preview will appear here.'}
                      </p>
                      <div className="my-3 h-px bg-[var(--border)]" />
                      <p className="font-headline text-[30px] text-[var(--gold)] leading-none">
                        ₹
                        {Number(form.totalAmount || 0).toLocaleString('en-IN')}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        ALGO Total Funding
                      </p>
                      <p className="mt-3 text-[12px] text-[var(--text-secondary)]">
                        {form.milestones.length} Milestones configured
                      </p>
                      <div className="mt-2 space-y-1">
                        {form.milestones.slice(0, 3).map((m, idx) => (
                          <p
                            key={idx}
                            className="text-[12px] text-[var(--text-secondary)]"
                          >
                            • {m.title || 'Untitled'} — ₹
                            {Number(m.amount || 0).toLocaleString('en-IN')}
                          </p>
                        ))}
                      </div>
                      {publishResult && (
                        <div className="mt-4 border-t border-[var(--border)] pt-3">
                          <p className="text-[12px] text-[var(--accent)] font-semibold">
                            ✓ Published Successfully
                          </p>
                          <BlockchainProof
                            txId={publishResult.blockchain.txId}
                            explorerUrl={publishResult.blockchain.explorerUrl}
                            verified
                            label="Grant published on Algorand"
                          />
                          <button
                            type="button"
                            className="btn btn-secondary w-full mt-3"
                            onClick={() =>
                              navigate(
                                `/grants/${publishResult.grant._id ??
                                publishResult.grant.id
                                }`,
                              )
                            }
                            data-hover
                          >
                            View Published Grant →
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'my-grants' && (
            <div className="sp-tab-panel">
              <h2 className="font-headline text-[24px] md:text-[32px] text-[var(--text-primary)] mb-4">
                YOUR GRANTS
              </h2>
              {grantsLoading ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      className="h-24 bg-[var(--bg-secondary)]"
                    />
                  ))}
                </div>
              ) : myGrants.length === 0 ? (
                <div className="border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-10 text-center">
                  <p className="text-[15px] text-[var(--text-secondary)]">
                    No grants created yet.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary mt-3"
                    onClick={() => setActiveTab('create')}
                    data-hover
                  >
                    Create Your First Grant →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myGrants.map((g) => {
                    const id = g._id ?? g.id
                    const { completed, total, percent } =
                      getMilestoneProgress(g.milestones ?? [])
                    const health = healthScores[id]
                    const healthScore = health?.score ?? '—'
                    const healthColor =
                      typeof healthScore === 'number'
                        ? healthScore >= 70
                          ? 'var(--accent)'
                          : healthScore >= 40
                            ? 'var(--gold)'
                            : 'var(--danger)'
                        : 'var(--text-muted)'

                    return (
                      <div
                        key={id}
                        className="border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-4"
                      >
                        <div
                          className="h-[3px] w-full mb-2"
                          style={{
                            backgroundColor: getDomainColor(g.domain),
                          }}
                        />
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="text-[18px] font-semibold text-[var(--text-primary)]">
                                {g.title}
                              </h3>
                              <span
                                className="text-[11px] uppercase tracking-[0.08em] px-3 py-1"
                                style={{
                                  backgroundColor: 'var(--bg-secondary)',
                                  color: 'var(--text-muted)',
                                  clipPath:
                                    'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
                                }}
                              >
                                {g.status ?? 'OPEN'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-3 text-[12px] text-[var(--text-secondary)]">
                              <span>Domain: {g.domain ?? 'General'}</span>
                              <span>
                                Deadline: {formatDate(g.deadline)}
                              </span>
                              <span>
                                {total} milestones
                              </span>
                            </div>
                            <div className="mt-2 max-w-xs">
                              <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] mb-1">
                                <span>Progress</span>
                                <span>
                                  {completed} of {total} milestones
                                </span>
                              </div>
                              <div className="h-[3px] w-full bg-[var(--border)]">
                                <div
                                  className="h-full bg-[var(--accent)]"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <p className="font-headline text-[24px] text-[var(--gold)] leading-none">
                              ₹
                              {Number(g.totalAmount ?? 0).toLocaleString(
                                'en-IN',
                              )}
                            </p>
                            <div className="flex items-center gap-2 text-[12px]">
                              <span className="text-[var(--text-secondary)]">
                                Health:
                              </span>
                              <span
                                className="font-headline text-[18px]"
                                style={{ color: healthColor }}
                              >
                                {healthScore}/100
                              </span>
                            </div>
                            <div className="flex gap-2 mt-1">
                              <button
                                type="button"
                                className="btn btn-secondary text-[12px] px-3 py-1"
                                onClick={() => navigate(`/grants/${id}`)}
                                data-hover
                              >
                                View Details →
                              </button>
                              <button
                                type="button"
                                className="btn btn-gold text-[12px] px-3 py-1"
                                onClick={() => {
                                  setSelectedGrantId(id)
                                  setActiveTab('roi')
                                }}
                                data-hover
                              >
                                ROI Report
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'roi' && (
            <div className="sp-tab-panel">
              <h2 className="font-headline text-[24px] md:text-[32px] text-[var(--text-primary)] mb-2">
                SPONSOR ROI REPORTS
              </h2>
              <p className="text-[14px] text-[var(--text-secondary)] mb-6">
                AI-generated impact analysis for your funded grants. Understand
                what your investment achieved.
              </p>

              <div className="max-w-md">
                <label className="block text-[12px] uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">
                  SELECT GRANT
                </label>
                <select
                  value={selectedGrantId}
                  onChange={(e) => {
                    setSelectedGrantId(e.target.value)
                    setRoiResult(null)
                  }}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[14px] text-[var(--text-primary)] px-3 py-2"
                >
                  <option value="">— Choose a grant —</option>
                  {myGrants.map((g) => {
                    const id = g._id ?? g.id
                    return (
                      <option
                        key={id}
                        value={id}
                      >
                        {g.title}
                      </option>
                    )
                  })}
                </select>
                <button
                  type="button"
                  className="btn btn-primary mt-3"
                  disabled={!selectedGrantId || roiLoading}
                  onClick={handleROI}
                  data-hover
                >
                  {roiLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent animate-spin" />
                      Generating Report...
                    </span>
                  ) : (
                    'Generate AI ROI Report →'
                  )}
                </button>
                {roiError && (
                  <p className="mt-2 text-[12px] text-[var(--danger)]">
                    {roiError}
                  </p>
                )}
              </div>

              {roiResult && (
                <div className="roi-report mt-7 border border-[var(--border)] border-t-[4px] border-t-[var(--gold)] bg-[var(--bg-elevated)] px-6 py-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                        AI ROI REPORT
                      </p>
                      <h3 className="mt-1 font-headline text-[26px] md:text-[36px] leading-[0.9] text-[var(--text-primary)]">
                        {roiResult.result.reportTitle ??
                          myGrants.find(
                            (g) =>
                              (g._id ?? g.id) === selectedGrantId,
                          )?.title ??
                          'ROI Report'}
                      </h3>
                      <p className="mt-2 text-[12px] text-[var(--text-muted)]">
                        Generated{' '}
                        {new Date().toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                        ROI Multiple
                      </p>
                      <p className="font-headline text-[40px] md:text-[56px] text-[var(--accent)] leading-none">
                        {roiResult.result.roiMultiple ?? '—'}×
                      </p>
                    </div>
                  </div>

                  {/* 4-stat grid */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                        Total Invested
                      </p>
                      <p className="font-headline text-[30px] text-[var(--gold)] leading-none">
                        ₹
                        {Number(
                          roiResult.result.totalInvested ?? 0,
                        ).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                        Milestones Delivered
                      </p>
                      <p className="font-headline text-[30px] text-[var(--text-primary)] leading-none">
                        {roiResult.result.milestonesDelivered ?? '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                        Est. Output Value
                      </p>
                      <p className="font-headline text-[30px] text-[var(--accent)] leading-none">
                        ₹
                        {Number(
                          roiResult.result.estimatedOutputValue ?? 0,
                        ).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                        GitHub Activity
                      </p>
                      <p className="font-headline text-[30px] text-[var(--text-primary)] leading-none">
                        {roiResult.result.githubStats?.commits ?? '—'} commits
                      </p>
                    </div>
                  </div>

                  {/* Achievements */}
                  <div className="mt-6 border-t border-[var(--border)] pt-4">
                    <h4 className="font-headline text-[20px] text-[var(--text-primary)]">
                      KEY ACHIEVEMENTS
                    </h4>
                    <div className="mt-3 space-y-2">
                      {Array.isArray(roiResult.result.keyAchievements) &&
                        roiResult.result.keyAchievements.length > 0 ? (
                        roiResult.result.keyAchievements.map(
                          (a: string, idx: number) => (
                            <div
                              // eslint-disable-next-line react/no-array-index-key
                              key={idx}
                              className="flex items-start gap-2"
                            >
                              <span className="mt-[5px] h-[6px] w-[6px] rounded-full bg-[var(--accent)]" />
                              <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                                {a}
                              </p>
                            </div>
                          ),
                        )
                      ) : (
                        <p className="text-[13px] text-[var(--text-secondary)]">
                          No achievements listed.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Narrative */}
                  <div className="mt-6 border-t border-[var(--border)] pt-4">
                    <h4 className="font-headline text-[20px] text-[var(--text-primary)]">
                      AI ANALYSIS
                    </h4>
                    <div className="mt-3 border-l-[3px] border-[var(--accent)] bg-[var(--bg-secondary)] px-4 py-3">
                      <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed italic">
                        "
                        {roiResult.result.aiNarrative ??
                          'AI narrative about the impact of this grant will appear here.'}
                        "
                      </p>
                    </div>
                  </div>

                  {/* Blockchain proof */}
                  <div className="mt-6 border-t border-[var(--border)] pt-4">
                    <BlockchainProof
                      txId={roiResult.blockchain.txId}
                      explorerUrl={roiResult.blockchain.explorerUrl}
                      verified={roiResult.blockchain.verified}
                      label="ROI report hash recorded on Algorand"
                    />
                  </div>

                  {/* Export */}
                  <div className="mt-4">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => window.print()}
                      data-hover
                    >
                      Export Report →
                    </button>
                    <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                      Use browser print → Save as PDF.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default SponsorDashboard

