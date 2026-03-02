import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { gsap } from 'gsap'
import { useRive } from '@rive-app/react-canvas'
import BlockchainProof from '../components/BlockchainProof'
import { apiGet, apiPost, apiPatch } from '../utils/api'
import { callN8n } from '../utils/callN8n'
import { ALGO_EXPLORER, N8N_ANALYZE_PROPOSAL } from '../config'

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'No deadline'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return 'No deadline'
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const RiveLoader = () => {
  const { RiveComponent } = useRive({
    src: 'https://cdn.rive.app/animations/vehicles.riv', // Placeholder Rive file
    autoplay: true,
  })
  return (
    <div className="h-24 w-full flex items-center justify-center opacity-80 mix-blend-screen pointer-events-none filter grayscale sepia hue-rotate-[90deg] saturate-[300%] brightness-[1.2]">
      <RiveComponent className="w-48 h-24" />
    </div>
  )
}

const ApplyGrant = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeAddress } = useWallet()
  const walletAddress =
    activeAddress ?? 'DEMO7XKLMNPQRST2UVWXYZ3ABCDEFGHIJKLMNO'

  const [grant, setGrant] = useState<any>(null)
  const [grantLoading, setGrantLoading] = useState(true)

  const [form, setForm] = useState({
    projectTitle: '',
    description: '',
    teamSize: 3,
    githubUrl: '',
    domain: 'Technology',
    skillInput: '',
    skills: [] as string[],
    aadhaarId: '',
    kycDocumentUrl: '',
  })
  const [charCount, setCharCount] = useState(0)

  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const rightPanelRef = useRef<HTMLDivElement | null>(null)
  const scoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!id) return
    // 🔌 BACKEND: GET /grants/:id — load grant info for context
    apiGet(`/grants/${id}`)
      .then((data) => {
        setGrant(data)
        setForm((f) => ({ ...f, domain: data.domain ?? 'Technology' }))
      })
      .catch(() => null)
      .finally(() => setGrantLoading(false))
  }, [id])

  useEffect(() => {
    const tl = gsap.timeline()
    tl.fromTo('.apply-header', { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, clearProps: 'all' })
      .fromTo('.apply-form', { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, clearProps: 'all' }, '-=0.1')
      .fromTo('.apply-panel', { x: 30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, clearProps: 'all' }, '-=0.2')
  }, [])

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' && e.key !== ',') return
    e.preventDefault()
    const value = form.skillInput.trim()
    if (!value) return
    if (form.skills.includes(value)) return
    if (form.skills.length >= 10) return
    setForm((prev) => ({
      ...prev,
      skills: [...prev.skills, value],
      skillInput: '',
    }))
  }

  const removeSkill = (skill: string) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }))
  }

  async function handleAnalyze() {
    if (!id) return
    setAnalyzing(true)
    setAnalysisError(null)
    setAnalysisResult(null)

    try {
      // 🤖 AI: POST /analyze-proposal — score and analyze the grant proposal
      const data = await callN8n(N8N_ANALYZE_PROPOSAL, walletAddress, {
        projectTitle: form.projectTitle,
        description: form.description,
        fundAmount: grant?.totalAmount ?? 0,
        milestones: grant?.milestones ?? [],
        domain: form.domain,
        teamSize: form.teamSize,
        aadhaarId: form.aadhaarId,
        kycDocumentUrl: form.kycDocumentUrl,
      })

      setAnalysisResult(data)

      if (rightPanelRef.current) {
        gsap.fromTo(
          rightPanelRef.current,
          { x: 30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },
        )
      }

      if (scoreRef.current) {
        const score = data.result.score ?? 0
        const obj = { val: 0 }
        gsap.to(obj, {
          val: score,
          duration: 1.5,
          ease: 'power2.out',
          onUpdate: () => {
            if (scoreRef.current) {
              scoreRef.current.textContent = Math.round(obj.val).toString()
            }
          },
        })
      }
    } catch {
      setAnalysisError(
        'AI analysis failed. Check your connection and try again.',
      )
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSubmit() {
    if (!analysisResult || !id) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      // 🔌 BACKEND: POST /applications
      const application = await apiPost('/applications', {
        grantId: id,
        applicantWallet: walletAddress,
        projectTitle: form.projectTitle,
        description: form.description,
        teamSize: form.teamSize,
        skills: form.skills,
        githubUrl: form.githubUrl,
        aadhaarId: form.aadhaarId,
        kycDocumentUrl: form.kycDocumentUrl,
      })

      // 🔌 BACKEND: PATCH /applications/:id — save AI score
      const appId = application._id ?? application.id
      if (appId) {
        await apiPatch(`/applications/${appId}`, {
          status: 'SUBMITTED',
          aiScore: analysisResult.result.score ?? 0,
          aiRecommendation: analysisResult.result.recommendation ?? '',
        })
      }

      setSubmitted(true)

      // Particle burst from submit button
      const btn = document.querySelector(
        '.submit-btn',
      ) as HTMLButtonElement | null
      if (btn) {
        const rect = btn.getBoundingClientRect()
        for (let i = 0; i < 8; i += 1) {
          const dot = document.createElement('div')
          dot.style.cssText = `
            position: fixed;
            width: 8px; height: 8px;
            background: var(--accent);
            border-radius: 50%;
            left: ${rect.left + rect.width / 2}px;
            top: ${rect.top + rect.height / 2}px;
            pointer-events: none;
            z-index: 9999;
          `
          document.body.appendChild(dot)
          const angle = (i / 8) * Math.PI * 2
          gsap.to(dot, {
            x: Math.cos(angle) * 60,
            y: Math.sin(angle) * 60,
            opacity: 0,
            duration: 0.6,
            ease: 'power2.out',
            onComplete: () => dot.remove(),
          })
        }
      }

      setTimeout(() => navigate('/dashboard'), 2000)
    } catch {
      setSubmitError('Submission failed. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const analyzeDisabled =
    analyzing ||
    form.projectTitle.trim().length < 2 ||
    form.description.trim().length < 20 ||
    form.aadhaarId.trim().length < 4 ||
    form.kycDocumentUrl.trim().length < 4

  const score = analysisResult?.result?.score ?? 0
  const scoreColor =
    score >= 70 ? 'var(--accent)' : score >= 50 ? 'var(--gold)' : 'var(--danger)'
  const riskLabel =
    score >= 70 ? '✓ LOW RISK' : score >= 50 ? '⚠ MEDIUM RISK' : '✗ HIGH RISK'
  const riskBg =
    score >= 70
      ? 'var(--accent-light)'
      : score >= 50
        ? 'var(--gold-light)'
        : 'var(--danger-light)'
  const riskColor =
    score >= 70
      ? 'var(--accent)'
      : score >= 50
        ? 'var(--gold)'
        : 'var(--danger)'

  const circumference = 2 * Math.PI * 35
  const dashOffset = circumference * (1 - Math.min(Math.max(score, 0), 100) / 100)

  const descriptionHint =
    form.description.length === 0
      ? null
      : form.description.length < 150
        ? `⚠ Add more detail for a higher AI score (${150 - form.description.length} more chars)`
        : '✓ Good length for AI analysis'

  return (
    <div className="relative z-[1] bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-5xl px-4 md:px-12 py-10">
        {/* Header */}
        <header className="apply-header">
          <p className="text-[13px] text-[var(--text-muted)] mb-4">
            <Link
              to="/grants"
              className="underline decoration-dotted hover:text-[var(--accent)]"
            >
              Grants
            </Link>{' '}
            /{' '}
            <Link
              to={`/grants/${id}`}
              className="underline decoration-dotted hover:text-[var(--accent)]"
            >
              {grant?.title ?? 'Grant'}
            </Link>{' '}
            / Apply
          </p>
          <h1 className="font-headline text-[38px] md:text-[68px] leading-[0.85] text-[var(--text-primary)]">
            APPLY FOR
            <br />
            THIS GRANT
          </h1>
          <p className="mt-3 text-[15px] text-[var(--text-secondary)]">
            {grantLoading
              ? 'Loading grant...'
              : grant?.title ?? 'Milestone-based grant on Algorand Testnet.'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span
              className="text-[11px] uppercase tracking-[0.1em] text-white px-3 py-1"
              style={{
                backgroundColor:
                  form.domain === 'Technology'
                    ? 'var(--accent)'
                    : form.domain === 'Science'
                      ? '#2196F3'
                      : form.domain === 'Arts'
                        ? '#9C27B0'
                        : form.domain === 'Social Impact'
                          ? '#FF9800'
                          : form.domain === 'Health'
                            ? '#F44336'
                            : 'var(--border-strong)',
                clipPath:
                  'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
              }}
            >
              {form.domain}
            </span>
            <span className="font-headline text-[18px] text-[var(--gold)]">
              ₹{Number(grant?.totalAmount ?? 0).toLocaleString('en-IN')} Available
            </span>
          </div>
        </header>

        {/* Main */}
        <div className="mt-8 flex flex-col lg:flex-row gap-8 items-start">
          {/* Left – form */}
          <section
            className="apply-form flex-[3] bg-[var(--bg-elevated)] border border-[var(--border)] px-5 md:px-8 py-6 md:py-8 w-full"
            style={{
              clipPath:
                'polygon(12px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 12px)',
            }}
          >
            <h2 className="font-headline text-[22px] md:text-[28px] text-[var(--text-primary)] mb-4">
              YOUR PROPOSAL
            </h2>

            {/* Project title */}
            <div className="mt-2">
              <label className="block text-[12px] uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">
                PROJECT TITLE *
              </label>
              <input
                type="text"
                placeholder="e.g. AI-Powered Smart Irrigation for Rural Farms"
                value={form.projectTitle}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    projectTitle: e.target.value,
                  }))
                }
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-[15px] text-[var(--text-primary)] px-3 py-2"
              />
            </div>

            {/* Description */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <label className="block text-[12px] uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">
                  PROJECT DESCRIPTION *
                </label>
                <span
                  className="text-[11px]"
                  style={{
                    color:
                      form.description.length >= 150
                        ? 'var(--accent)'
                        : form.description.length >= 80
                          ? 'var(--gold)'
                          : 'var(--danger)',
                  }}
                >
                  {charCount}/500
                </span>
              </div>
              <textarea
                rows={6}
                placeholder="Describe your project goals, technical approach, expected impact, and how it aligns with the grant's milestones. More detail = higher AI score."
                value={form.description}
                onChange={(e) => {
                  const value = e.target.value.slice(0, 500)
                  setForm((prev) => ({ ...prev, description: value }))
                  setCharCount(value.length)
                }}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-[15px] text-[var(--text-primary)] px-3 py-2"
              />
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                Minimum 150 characters for best AI score
              </p>
              {descriptionHint && (
                <p
                  className="mt-1 text-[11px]"
                  style={{
                    color:
                      form.description.length >= 150
                        ? 'var(--accent)'
                        : 'var(--gold)',
                  }}
                >
                  {descriptionHint}
                </p>
              )}
            </div>

            {/* Team size + domain */}
            <div className="mt-4 flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-[12px] uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">
                  TEAM SIZE
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={form.teamSize}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      teamSize: Number(e.target.value || 1),
                    }))
                  }
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-[15px] text-[var(--text-primary)] px-3 py-2"
                />
              </div>
              <div className="flex-[2]">
                <label className="block text-[12px] uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">
                  DOMAIN
                </label>
                <div className="relative">
                  <select
                    value={form.domain}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        domain: e.target.value,
                      }))
                    }
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-[14px] text-[var(--text-primary)] px-3 py-2 pr-6 appearance-none"
                  >
                    {['Technology', 'Science', 'Arts', 'Social Impact', 'Health'].map(
                      (d) => (
                        <option
                          key={d}
                          value={d}
                        >
                          {d}
                        </option>
                      ),
                    )}
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)]">
                    ▾
                  </span>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="mt-4">
              <label className="block text-[12px] uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">
                SKILLS &amp; TECHNOLOGIES
              </label>
              <div className="min-h-[44px] w-full bg-[var(--bg-primary)] border border-[var(--border)] px-2 py-1 flex flex-wrap gap-1">
                {form.skills.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="flex items-center gap-1 text-[11px] px-2 py-1"
                    style={{
                      backgroundColor: 'var(--accent-light)',
                      color: 'var(--accent)',
                      clipPath:
                        'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)',
                    }}
                    data-hover
                  >
                    <span>{skill}</span>
                    <span>×</span>
                  </button>
                ))}
                <input
                  type="text"
                  value={form.skillInput}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      skillInput: e.target.value,
                    }))
                  }
                  onKeyDown={handleSkillKeyDown}
                  placeholder="Add skill and press Enter"
                  className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-[14px] text-[var(--text-primary)] px-1 py-1"
                />
              </div>
            </div>

            {/* GitHub URL */}
            <div className="mt-4">
              <label className="block text-[12px] uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">
                GITHUB REPOSITORY URL
              </label>
              <input
                type="url"
                placeholder="https://github.com/username/project"
                value={form.githubUrl}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    githubUrl: e.target.value,
                  }))
                }
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-[15px] text-[var(--text-primary)] px-3 py-2"
              />
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                GitHub URL improves AI verification accuracy later.
              </p>
            </div>

            {/* Identity / KYC fields */}
            <div className="mt-4 p-4 border border-[var(--border-strong)] bg-black/20">
              <h3 className="text-[14px] font-headline text-[var(--accent)] mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                BUILDER IDENTITY VERIFICATION
              </h3>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-[1]">
                  <label className="block text-[12px] uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">
                    AADHAAR ID / SSN *
                  </label>
                  <input
                    type="text"
                    placeholder="XXXX-XXXX-XXXX"
                    value={form.aadhaarId}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        aadhaarId: e.target.value,
                      }))
                    }
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-[15px] text-[var(--text-primary)] px-3 py-2"
                  />
                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                    Required for Proof of Humanity & Sybil resistance.
                  </p>
                </div>

                <div className="flex-[1]">
                  <label className="block text-[12px] uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">
                    KYC DOCUMENT LINK *
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={form.kycDocumentUrl}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        kycDocumentUrl: e.target.value,
                      }))
                    }
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-[15px] text-[var(--text-primary)] px-3 py-2"
                  />
                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                    Link to Government ID for N8N Vision Analysis.
                  </p>
                </div>
              </div>
            </div>

            {/* Analyze button */}
            <div className="mt-6 pt-4 border-t border-[var(--border)]">
              <button
                type="button"
                className="btn btn-primary w-full py-3"
                onClick={handleAnalyze}
                disabled={analyzeDisabled}
                data-hover
              >
                {analyzing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent animate-spin" />
                    Analyzing Proposal...
                  </span>
                ) : (
                  'Analyze with AI →'
                )}
              </button>
              <p className="mt-2 text-[12px] text-[var(--text-muted)] text-center">
                AI scores your proposal and records analysis on Algorand.
              </p>
            </div>
          </section>

          {/* Right – AI panel */}
          <section
            ref={rightPanelRef}
            className="apply-panel flex-[2] w-full lg:sticky lg:top-[100px]"
          >
            {!analysisResult && !analyzing && !analysisError && (
              <div className="flex h-full min-h-[340px] flex-col items-center justify-center border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-8 text-center">
                <svg
                  width="52"
                  height="52"
                  viewBox="0 0 64 64"
                  aria-hidden="true"
                >
                  <circle
                    cx="32"
                    cy="32"
                    r="18"
                    fill="none"
                    stroke="var(--text-muted)"
                    strokeWidth="2"
                  />
                  <circle
                    cx="22"
                    cy="26"
                    r="2"
                    fill="var(--text-muted)"
                  />
                  <circle
                    cx="32"
                    cy="22"
                    r="2"
                    fill="var(--text-muted)"
                  />
                  <circle
                    cx="42"
                    cy="26"
                    r="2"
                    fill="var(--text-muted)"
                  />
                  <path
                    d="M22 38c2-4 6-6 10-6s8 2 10 6"
                    fill="none"
                    stroke="var(--text-muted)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <h3 className="mt-4 font-headline text-[20px] md:text-[22px] text-[var(--text-muted)]">
                  AI PROPOSAL ANALYZER
                </h3>
                <p className="mt-3 text-[14px] text-[var(--text-muted)] max-w-xs leading-relaxed">
                  Fill in your proposal details on the left and click Analyze to
                  get your AI score, risk assessment, and improvement
                  suggestions.
                </p>
                <p className="mt-3 text-[12px] text-[var(--accent)]">
                  ⛓️ Results recorded on Algorand
                </p>
              </div>
            )}

            {analyzing && (
              <div className="mt-4 flex h-full min-h-[260px] flex-col justify-center border border-[#00FF94]/30 bg-black/40 px-6 py-6 items-center text-center">
                <RiveLoader />
                <p className="mt-6 text-[15px] font-medium text-[#00FF94] tracking-wide animate-pulse">
                  Analyzing your proposal...
                </p>
                <p className="mt-2 text-[12px] text-[var(--text-secondary)]">
                  Running AI validation matrix. This may take 10–15 seconds.
                </p>
              </div>
            )}

            {analysisError && !analyzing && (
              <div className="mt-4 border border-[var(--danger)] bg-[var(--danger-light)] px-5 py-4">
                <p className="text-[14px] text-[var(--danger)]">{analysisError}</p>
                <button
                  type="button"
                  className="btn btn-secondary mt-3 w-full"
                  onClick={() => setAnalysisError(null)}
                  data-hover
                >
                  Try Again
                </button>
              </div>
            )}

            {analysisResult && !analyzing && (
              <div className="mt-4 border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-5">
                <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                  AI PROPOSAL ANALYSIS
                </p>

                {/* Score display */}
                <div className="mt-4 flex items-center gap-5">
                  <div className="relative h-20 w-20">
                    <svg
                      width="80"
                      height="80"
                      viewBox="0 0 80 80"
                    >
                      <circle
                        cx="40"
                        cy="40"
                        r="35"
                        fill="none"
                        stroke="var(--border)"
                        strokeWidth="6"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="35"
                        fill="none"
                        stroke={scoreColor}
                        strokeWidth="6"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="butt"
                        transform="rotate(-90 40 40)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div
                        ref={scoreRef}
                        className="font-headline text-[22px]"
                        style={{ color: scoreColor }}
                      >
                        {score}
                      </div>
                      <div className="text-[9px] text-[var(--text-muted)]">
                        /100
                      </div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <span
                      className="inline-block text-[11px] uppercase tracking-[0.1em] px-3 py-1"
                      style={{
                        backgroundColor: riskBg,
                        color: riskColor,
                        clipPath:
                          'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
                      }}
                    >
                      {riskLabel}
                    </span>
                    <p className="mt-2 text-[13px] text-[var(--text-secondary)] leading-relaxed">
                      {(analysisResult.result.recommendation ??
                        analysisResult.result.feedback ??
                        '')
                        .toString()
                        .slice(0, 140)
                        .concat(
                          (analysisResult.result.recommendation ??
                            analysisResult.result.feedback ??
                            '').length > 140
                            ? '…'
                            : '',
                        )}
                    </p>
                  </div>
                </div>

                {/* Improvements */}
                <div className="mt-4 border-t border-[var(--border)] pt-3">
                  <p className="text-[12px] uppercase tracking-[0.08em] text-[var(--text-primary)] font-semibold">
                    SUGGESTED IMPROVEMENTS
                  </p>
                  <div className="mt-2 space-y-2">
                    {Array.isArray(analysisResult.result.improvements) &&
                      analysisResult.result.improvements.length > 0 ? (
                      analysisResult.result.improvements.map(
                        (imp: string, idx: number) => (
                          <div
                            // eslint-disable-next-line react/no-array-index-key
                            key={idx}
                            className="flex items-start gap-2"
                          >
                            <span
                              className="mt-[6px] h-[6px] w-[6px] rounded-full flex-shrink-0"
                              style={{ backgroundColor: 'var(--accent)' }}
                            />
                            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                              {imp}
                            </p>
                          </div>
                        ),
                      )
                    ) : (
                      <p className="text-[13px] text-[var(--accent)]">
                        ✓ No major improvements needed.
                      </p>
                    )}
                  </div>
                </div>

                {/* Blockchain proof */}
                <div className="mt-4 border-t border-[var(--border)] pt-3">
                  <BlockchainProof
                    txId={analysisResult.blockchain.txId}
                    explorerUrl={analysisResult.blockchain.explorerUrl}
                    verified={analysisResult.blockchain.verified}
                    label="Proposal analysis recorded on Algorand"
                  />
                </div>

                {/* Submit */}
                <div className="mt-4 pt-3 border-t border-[var(--border)]">
                  <button
                    type="button"
                    className="btn btn-primary w-full py-3 submit-btn"
                    onClick={handleSubmit}
                    disabled={submitting || submitted}
                    data-hover
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent animate-spin" />
                        Submitting...
                      </span>
                    ) : submitted ? (
                      '✓ Application Submitted!'
                    ) : (
                      'Submit Application →'
                    )}
                  </button>
                  <p className="mt-2 text-[11px] text-[var(--text-muted)] text-center">
                    {submitted
                      ? 'Redirecting to dashboard...'
                      : `AI Score: ${score}/100 will be saved with your application`}
                  </p>
                  {submitError && (
                    <p className="mt-2 text-[12px] text-[var(--danger)] text-center">
                      {submitError}
                    </p>
                  )}

                  {submitted && (
                    <div className="mt-4 border border-[var(--accent)] bg-[var(--accent-light)] px-4 py-3">
                      <p className="text-[14px] text-[var(--accent)] font-semibold">
                        🎉 Application submitted successfully!
                      </p>
                      <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                        Your AI score has been recorded on Algorand. Redirecting
                        to dashboard in 2 seconds...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default ApplyGrant

