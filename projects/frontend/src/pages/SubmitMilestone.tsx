import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { gsap } from 'gsap'
import { useRive } from '@rive-app/react-canvas'
import BlockchainProof from '../components/BlockchainProof'
import { apiGet, apiPatch, apiPost } from '../utils/api'
import { callN8n } from '../utils/callN8n'
import {
  ALGO_ASSET_ID,
  ALGO_EXPLORER,
  N8N_FRAUD_SENTINEL,
  N8N_VERIFY_MILESTONE,
} from '../config'

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

const SubmitMilestone = () => {
  const { grantId, index } = useParams()
  const milestoneIndex = Number(index ?? 0)
  const navigate = useNavigate()
  const { activeAddress } = useWallet()
  const walletAddress =
    activeAddress ?? 'DEMO7XKLMNPQRST2UVWXYZ3ABCDEFGHIJKLMNO'

  const [grant, setGrant] = useState<any>(null)
  const [milestone, setMilestone] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [proofUrl, setProofUrl] = useState('')
  const [proofDescription, setProofDescription] = useState('')

  const [verifying, setVerifying] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [step, setStep] = useState<
    'idle' | 'verifying' | 'fraud' | 'releasing' | 'done'
  >('idle')

  const [verifyResult, setVerifyResult] = useState<any>(null)
  const [fraudResult, setFraudResult] = useState<any>(null)
  const [releaseResult, setReleaseResult] = useState<any>(null)

  const [showVerifyCard, setShowVerifyCard] = useState(false)
  const [showFraudCard, setShowFraudCard] = useState(false)
  const [showReleaseCard, setShowReleaseCard] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const verifyCardRef = useRef<HTMLDivElement | null>(null)
  const fraudCardRef = useRef<HTMLDivElement | null>(null)
  const releaseCardRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const certInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!grantId) return
    // 🔌 BACKEND: GET /grants/:id — load grant + milestones
    apiGet(`/grants/${grantId}`)
      .then((data) => {
        setGrant(data)
        const ms = data.milestones?.[milestoneIndex]
        setMilestone(ms ?? null)
      })
      .catch(() => setError('Could not load grant data.'))
      .finally(() => setLoading(false))
  }, [grantId, milestoneIndex])

  useEffect(() => {
    if (!loading) {
      gsap.from('.ms-header', { y: -20, opacity: 0, duration: 0.4 })
      gsap.from('.ms-form', { x: -30, opacity: 0, duration: 0.5, delay: 0.1 })
      gsap.from('.ms-results-area', {
        x: 30,
        opacity: 0,
        duration: 0.5,
        delay: 0.15,
      })
    }
  }, [loading])

  useEffect(() => {
    if (showVerifyCard && verifyCardRef.current) {
      gsap.fromTo(
        verifyCardRef.current,
        { y: 30, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'power2.out' },
      )
    }
  }, [showVerifyCard])

  useEffect(() => {
    if (showFraudCard && fraudCardRef.current) {
      gsap.fromTo(
        fraudCardRef.current,
        { y: 30, opacity: 0, scale: 0.97 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.45,
          ease: 'power2.out',
          delay: 0.1,
        },
      )
    }
  }, [showFraudCard])

  useEffect(() => {
    if (showReleaseCard && releaseCardRef.current) {
      gsap.fromTo(
        releaseCardRef.current,
        { y: 30, opacity: 0, scale: 0.97 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: 'back.out(1.4)',
          delay: 0.15,
        },
      )
      gsap.fromTo(
        '.release-amount',
        { y: 10, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          delay: 0.35,
          ease: 'power2.out',
        },
      )
    }
  }, [showReleaseCard])

  const getStepStatus = (
    stepName: 'submit' | 'verify' | 'fraud' | 'release',
  ): 'done' | 'current' | 'pending' => {
    const order = ['idle', 'verifying', 'fraud', 'releasing', 'done'] as const
    const stepMap: Record<typeof stepName, number> = {
      submit: 1,
      verify: 2,
      fraud: 3,
      release: 4,
    }
    const currentIdx = order.indexOf(step)
    const stepIdx = stepMap[stepName]
    if (currentIdx > stepIdx) return 'done'
    if (currentIdx === stepIdx) return 'current'
    return 'pending'
  }

  async function handleVerify() {
    if (!proofUrl || !proofDescription || !grantId) return
    setVerifying(true)
    setError(null)
    setStep('verifying')

    setVerifyResult(null)
    setFraudResult(null)
    setReleaseResult(null)
    setShowVerifyCard(false)
    setShowFraudCard(false)
    setShowReleaseCard(false)

    try {
      // 🔌 BACKEND: POST /milestones/:grantId/:index/submit
      await apiPost(`/milestones/${grantId}/${milestoneIndex}/submit`, {
        applicantWallet: walletAddress,
        proofUrl,
        proofDescription,
      })

      setStep('fraud')

      // 🤖 AI: Run verifier + fraud sentinel IN PARALLEL
      const [verifyData, fraudData] = await Promise.all([
        // 🤖 AI: POST /verify-milestone — AI checks proof authenticity
        callN8n(N8N_VERIFY_MILESTONE, walletAddress, {
          grantId,
          milestoneIndex,
          proofUrl,
          proofDescription,
          milestoneTitle: milestone?.title ?? '',
          milestoneDescription: milestone?.description ?? '',
        }),
        // 🤖 AI: POST /fraud-sentinel — fraud detection scan
        callN8n(N8N_FRAUD_SENTINEL, walletAddress, {
          grantId,
          proofDescription,
          proofUrl,
          allRecentProofs: [],
        }),
      ])

      setVerifyResult(verifyData)
      setShowVerifyCard(true)

      await new Promise((r) => setTimeout(r, 600))
      setFraudResult(fraudData)
      setShowFraudCard(true)

      const verified = verifyData.result.verified === true
      const flagged = fraudData.result.flagged === true
      const fraudScore = fraudData.result.fraudScore ?? 0

      // 🔌 BACKEND: PATCH /milestones/:grantId/:index/verify
      await apiPatch(`/milestones/${grantId}/${milestoneIndex}/verify`, {
        verified,
        confidence: verifyData.result.confidence ?? 0,
        reasoning: verifyData.result.reasoning ?? '',
        proofHash: verifyData.blockchain.txId,
        fundsReleased: false,
        txId: verifyData.blockchain.txId,
        fraudScore,
      })

      if (verified && !flagged) {
        setStep('releasing')

        // ⛓️ REAL BLOCKCHAIN TRANSACTION via Pera Wallet
        try {
          const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '')
          const suggestedParams = await algodClient.getTransactionParams().do()

          // amount is in ALGOs, so convert to MicroAlgos
          const amountMicroAlgos = Math.floor((milestone?.amount || 0) * 1_000_000)

          if (!grant?.sponsorWallet) throw new Error("Missing Sponsor Wallet")

          const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            from: grant.sponsorWallet,      // The sponsor releasing funds
            to: walletAddress,              // The student receiving funds
            amount: amountMicroAlgos,
            suggestedParams,
            note: new Uint8Array(Buffer.from(`ClearGrant: Milestone ${milestoneIndex + 1} Released`))
          })

          // Trigger Pera Wallet signature request
          const encodedTxn = txn.toByte()
          const signedTxns = await signTransactions([encodedTxn])

          // Submit to network
          const sendTxPromise = algodClient.sendRawTransaction(signedTxns).do()
          const { txId } = await sendTxPromise

          // Wait for confirmation
          await algosdk.waitForConfirmation(algodClient, txId, 4)

          // 🔌 BACKEND: Mark as released on our DB
          const releaseData = await apiPatch(
            `/milestones/${grantId}/${milestoneIndex}/release`,
            {
              txId: txId,
              explorerUrl: `https://testnet.algoexplorer.io/tx/${txId}`,
              amountReleased: milestone?.amount ?? 0,
            },
          )

          await apiPost('/transactions', {
            grantId,
            type: 'MILESTONE_RELEASE',
            amount: milestone?.amount ?? 0,
            fromWallet: grant.sponsorWallet,
            toWallet: walletAddress,
            txId: txId,
            explorerUrl: `https://testnet.algoexplorer.io/tx/${txId}`,
            note: `Milestone ${milestoneIndex + 1} verified and released`,
          })

          setReleaseResult({
            txId: txId,
            explorerUrl: `https://testnet.algoexplorer.io/tx/${txId}`,
            amount: milestone?.amount ?? 0,
          })

          setShowReleaseCard(true)
          if (typeof (window as any).triggerBlockchainBurst === 'function') {
            ; (window as any).triggerBlockchainBurst()
          }
        } catch (txnError: any) {
          console.error("Blockchain transaction failed:", txnError)
          throw new Error("Transaction rejected or failed on-chain.")
        }
      }

      setStep('done')
    } catch {
      setError('Verification failed. Check your connection and try again.')
      setStep('idle')
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="relative z-[1] bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <div className="mx-auto max-w-5xl px-4 md:px-12 py-12 animate-pulse space-y-4">
          <div className="h-4 w-64 bg-[var(--bg-secondary)]" />
          <div className="h-10 w-80 bg-[var(--bg-secondary)]" />
          <div className="flex flex-col lg:flex-row gap-6 mt-4">
            <div className="flex-1 h-64 bg-[var(--bg-secondary)]" />
            <div className="flex-1 h-64 bg-[var(--bg-secondary)]" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !grant || !milestone) {
    return (
      <div className="relative z-[1] bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <div className="mx-auto max-w-5xl px-4 md:px-12 py-16 text-center">
          <h1 className="font-headline text-[26px] md:text-[28px] text-[var(--text-primary)]">
            COULD NOT LOAD MILESTONE
          </h1>
          <p className="mt-2 text-[14px] text-[var(--text-muted)]">
            {error ??
              'We could not find this milestone. Check the link and try again.'}
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

  const stepStatuses = {
    submit: getStepStatus('submit'),
    verify: getStepStatus('verify'),
    fraud: getStepStatus('fraud'),
    release: getStepStatus('release'),
  }

  const verifyDisabled =
    verifying || step === 'done' || !proofUrl || proofDescription.length < 50

  const status = milestone.status ?? 'PENDING'
  const statusBg =
    status === 'SUBMITTED'
      ? 'var(--gold-light)'
      : status === 'VERIFIED'
        ? 'var(--accent-light)'
        : status === 'RELEASED'
          ? '#E8F5E8'
          : 'var(--bg-secondary)'
  const statusColor =
    status === 'SUBMITTED'
      ? 'var(--gold)'
      : status === 'VERIFIED'
        ? 'var(--accent)'
        : status === 'RELEASED'
          ? '#2E7D32'
          : 'var(--text-muted)'

  const showRejectionBanner =
    step === 'done' &&
    (verifyResult?.result?.verified === false ||
      fraudResult?.result?.flagged === true) &&
    !showReleaseCard

  return (
    <div className="relative z-[1] bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-5xl px-4 md:px-12 py-10">
        {/* Header */}
        <header className="ms-header">
          <p className="text-[13px] text-[var(--text-muted)] mb-3">
            <Link
              to="/grants"
              className="underline decoration-dotted hover:text-[var(--accent)]"
            >
              Grants
            </Link>{' '}
            /{' '}
            <Link
              to={`/ grants / ${grantId} `}
              className="underline decoration-dotted hover:text-[var(--accent)]"
            >
              {grant.title ?? 'Grant'}
            </Link>{' '}
            / Milestone {milestoneIndex + 1}
          </p>
          <h1 className="font-headline text-[38px] md:text-[64px] leading-[0.85] text-[var(--text-primary)]">
            SUBMIT
            <br />
            MILESTONE
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-[15px] text-[var(--text-secondary)]">
              {milestone.title ?? `Milestone ${milestoneIndex + 1} `}
            </p>
            <span className="font-headline text-[20px] md:text-[28px] text-[var(--gold)]">
              ₹{Number(milestone.amount ?? 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[13px] text-[var(--text-muted)]">
              ALGO to be released on verification
            </span>
            <span
              className="text-[11px] uppercase tracking-[0.08em] px-3 py-1"
              style={{
                backgroundColor: statusBg,
                color: statusColor,
                clipPath:
                  'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
              }}
            >
              {status}
            </span>
          </div>
        </header>

        <div className="mt-7 h-px bg-[var(--border)]" />

        {/* Main */}
        <div className="mt-8 flex flex-col lg:flex-row gap-6 items-start">
          {/* Left – form */}
          <section className="ms-form flex-[2] bg-[var(--bg-elevated)] border border-[var(--border)] border-t-[3px] border-t-[var(--accent)] px-5 md:px-7 py-6 md:py-7 w-full">
            <h2 className="font-headline text-[22px] md:text-[24px] text-[var(--text-primary)] mb-2">
              YOUR PROOF SUBMISSION
            </h2>
            <p className="text-[13px] text-[var(--text-secondary)] mb-5 leading-relaxed">
              Submit your milestone deliverable proof. AI will verify authenticity
              and scan for fraud. Funds release automatically if approved.
            </p>

            {/* Proof URL */}
            <div className="mt-1">
              <label className="block text-[12px] uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">
                PROOF URL OR FILE UPLOAD *
              </label>
              <p className="text-[12px] text-[var(--text-muted)] mb-1">
                Provide a GitHub repo, live demo, OR upload a photo/PDF document.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://github.com/username/project"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  disabled={verifying || step === 'done' || uploading}
                  className="w-full flex-1 bg-[var(--bg-primary)] border border-[var(--border)] text-[14px] text-[var(--text-primary)] px-3 py-2"
                />
                <button
                  type="button"
                  className="btn btn-secondary px-4 py-2 flex items-center justify-center min-w-[120px] gap-2 whitespace-nowrap"
                  disabled={verifying || step === 'done' || uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <span className="inline-block h-4 w-4 border-2 border-[var(--text-primary)] border-t-transparent animate-spin rounded-full" />
                  ) : (
                    'Upload File'
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setUploading(true)
                      setTimeout(() => {
                        setProofUrl(`https://storage.cleargrant.app/proofs/${file.name.replace(/\s+/g, '-')}`)
                        setUploading(false)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }, 1500)
                    }
                  }}
                />
              </div>
            </div>

            {/* Certificate of Completion */}
            <div className="mt-4 p-4 border border-[var(--border-strong)] bg-black/20">
              <label className="block text-[12px] uppercase tracking-[0.1em] text-[var(--accent)] mb-1">
                CERTIFICATE OF COMPLETION (OPTIONAL/PREFERRED)
              </label>
              <p className="text-[10px] text-[var(--text-muted)] mb-2">
                Provide a link or upload an official completion certificate. N8N Vision AI will verify it for authenticity.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://drive.google.com/certificate.pdf"
                  onChange={(e) => {
                    if (e.target.value) {
                      setProofDescription(prev => prev.replace(/\n\n\[CERTIFICATE LINK\]: .*$/, '') + `\n\n[CERTIFICATE LINK]: ${e.target.value}`)
                    }
                  }}
                  disabled={verifying || step === 'done'}
                  className="w-full flex-1 bg-[var(--bg-primary)] border border-[var(--border)] text-[14px] text-[var(--text-primary)] px-3 py-2"
                />
                <button
                  type="button"
                  className="btn btn-secondary px-4 py-2 flex items-center justify-center min-w-[120px] gap-2 whitespace-nowrap"
                  disabled={verifying || step === 'done' || uploading}
                  onClick={() => certInputRef.current?.click()}
                >
                  {uploading ? (
                    <span className="inline-block h-4 w-4 border-2 border-[var(--text-primary)] border-t-transparent animate-spin rounded-full" />
                  ) : (
                    'Upload File'
                  )}
                </button>
                <input
                  ref={certInputRef}
                  type="file"
                  accept="image/*,application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setUploading(true)
                      setTimeout(() => {
                        const url = `https://storage.cleargrant.app/certs/${file.name.replace(/\s+/g, '-')}`
                        setProofDescription(prev => prev.replace(/\n\n\[CERTIFICATE LINK\]: .*$/, '') + `\n\n[CERTIFICATE LINK]: ${url}`)
                        setUploading(false)
                        if (certInputRef.current) certInputRef.current.value = ''
                      }, 1500)
                    }
                  }}
                />
              </div>
            </div>

            {/* Proof description */}
            <div className="mt-4">
              <label className="block text-[12px] uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">
                PROOF DESCRIPTION *
              </label>
              <p className="text-[12px] text-[var(--text-muted)] mb-1">
                Describe what you built. Be specific — AI analyzes this text.
              </p>
              <textarea
                rows={7}
                placeholder="Describe exactly what was built for this milestone. Include: what features work, how they were implemented, what tests were run, and how this meets the milestone requirements. The more specific, the higher your verification confidence."
                value={proofDescription}
                onChange={(e) => setProofDescription(e.target.value)}
                disabled={verifying || step === 'done'}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-[14px] text-[var(--text-primary)] px-3 py-2"
              />
              <p className="mt-1 text-right text-[11px] text-[var(--text-muted)]">
                {proofDescription.length} chars
              </p>
            </div>

            {/* Steps */}
            <div className="mt-5 mb-4 flex items-center gap-0 text-[11px]">
              {(
                [
                  { key: 'submit', label: 'SUBMIT PROOF' },
                  { key: 'verify', label: 'AI VERIFY' },
                  { key: 'fraud', label: 'FRAUD SCAN' },
                  { key: 'release', label: 'RELEASE FUNDS' },
                ] as const
              ).map((s, idx) => {
                const statusVal = stepStatuses[s.key]
                const isLast = idx === 3
                const circleColor =
                  statusVal === 'done'
                    ? 'var(--accent)'
                    : statusVal === 'current'
                      ? 'var(--accent-light)'
                      : 'var(--border)'
                const textColor =
                  statusVal === 'done'
                    ? 'var(--accent)'
                    : statusVal === 'current'
                      ? 'var(--accent)'
                      : 'var(--text-muted)'
                const lineColor =
                  statusVal === 'done' ? 'var(--accent)' : 'var(--border)'

                return (
                  <div
                    key={s.key}
                    className="flex flex-1 items-center"
                  >
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full text-[11px]"
                        style={{
                          backgroundColor:
                            statusVal === 'done'
                              ? 'var(--accent)'
                              : statusVal === 'current'
                                ? 'var(--bg-elevated)'
                                : 'var(--bg-elevated)',
                          border: `2px solid ${circleColor} `,
                        }}
                      >
                        {statusVal === 'done' ? '✓' : idx + 1}
                      </div>
                      <span
                        className="mt-1 hidden sm:block uppercase tracking-[0.08em]"
                        style={{ color: textColor }}
                      >
                        {s.label}
                      </span>
                    </div>
                    {!isLast && (
                      <div
                        className="h-[2px] flex-1 mx-1"
                        style={{ backgroundColor: lineColor }}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Verify button */}
            <button
              type="button"
              className="btn btn-primary w-full py-3"
              disabled={verifyDisabled}
              onClick={handleVerify}
              data-hover
            >
              {step === 'idle' && 'Verify with AI + Fraud Scan →'}
              {step === 'verifying' && (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent animate-spin" />
                  Running AI Verification...
                </span>
              )}
              {step === 'fraud' && (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent animate-spin" />
                  Running Fraud Analysis...
                </span>
              )}
              {step === 'releasing' && (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent animate-spin" />
                  Releasing Funds on Algorand...
                </span>
              )}
              {step === 'done' && '✓ Verification Complete'}
            </button>

            {step === 'done' && (
              <button
                type="button"
                className="btn btn-secondary w-full mt-2"
                onClick={() => navigate('/dashboard')}
                data-hover
              >
                View in Dashboard →
              </button>
            )}

            {/* Milestone context */}
            <div className="mt-5 border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">
                MILESTONE REQUIREMENTS
              </p>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                {milestone.description ?? 'No requirements specified.'}
              </p>
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                Deadline: {formatDate(milestone.deadline)}
              </p>
            </div>
          </section>

          {/* Right – results area */}
          <section className="ms-results-area flex-[3] w-full space-y-4">
            {!showVerifyCard && !showFraudCard && !showReleaseCard && step === 'idle' && (
              <div className="flex min-h-[260px] flex-col items-center justify-center border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-8 text-center">
                <svg
                  width="52"
                  height="52"
                  viewBox="0 0 64 64"
                  aria-hidden="true"
                >
                  <path
                    d="M32 6L12 14v18c0 10.5 6.7 20.5 20 24 13.3-3.5 20-13.5 20-24V14L32 6z"
                    fill="none"
                    stroke="var(--text-muted)"
                    strokeWidth="2"
                  />
                  <path
                    d="M23 32l5 5 13-13"
                    fill="none"
                    stroke="var(--text-muted)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
                <h3 className="mt-4 font-headline text-[20px] md:text-[22px] text-[var(--text-muted)]">
                  AI VERIFICATION RESULTS
                </h3>
                <p className="mt-3 text-[14px] text-[var(--text-muted)] max-w-xs leading-relaxed">
                  Submit your milestone proof on the left. AI Verifier and Fraud
                  Sentinel will run simultaneously and results appear here.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {['🤖 AI Verify', '🛡️ Fraud Scan', '⛓️ On-Chain Proof'].map(
                    (label) => (
                      <span
                        key={label}
                        className="text-[11px] uppercase tracking-[0.08em] px-3 py-1"
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {label}
                      </span>
                    ),
                  )}
                </div>
              </div>
            )}

            {step !== 'idle' &&
              !showVerifyCard &&
              !showFraudCard &&
              !showReleaseCard && (
                <div className="flex min-h-[260px] flex-col justify-center items-center text-center border border-[#00FF94]/30 bg-black/40 px-6 py-6">
                  <RiveLoader />
                  <p className="mt-6 text-[15px] font-medium text-[#00FF94] tracking-wide animate-pulse">
                    {step === 'verifying' && 'AI Verifier running...'}
                    {step === 'fraud' && 'Fraud Sentinel scanning...'}
                    {step === 'releasing' && 'Releasing Funds on Algorand...'}
                  </p>
                  <p className="mt-2 text-[12px] text-[var(--text-secondary)]">
                    Validating your milestone submission. Please wait.
                  </p>
                </div>
              )}

            {/* Verify card */}
            {showVerifyCard && verifyResult && (
              <div
                ref={verifyCardRef}
                className="border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-5"
                style={{
                  borderLeftWidth: '4px',
                  borderLeftColor:
                    verifyResult.result.verified === true
                      ? 'var(--accent)'
                      : 'var(--danger)',
                }}
              >
                <div className="flex items-center justify-between">
                  <h3
                    className="font-headline text-[20px] md:text-[22px]"
                    style={{
                      color:
                        verifyResult.result.verified === true
                          ? 'var(--accent)'
                          : 'var(--danger)',
                    }}
                  >
                    {verifyResult.result.verified === true
                      ? 'MILESTONE VERIFIED ✓'
                      : 'VERIFICATION FAILED ✗'}
                  </h3>
                  <div className="text-right">
                    <p className="font-headline text-[24px] text-[var(--text-primary)] leading-none">
                      {Math.round(
                        (verifyResult.result.confidence ?? 0) * 100,
                      )}
                      %
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      confidence
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span>Confidence</span>
                    <span>
                      {Math.round(
                        (verifyResult.result.confidence ?? 0) * 100,
                      )}
                      %
                    </span>
                  </div>
                  <div className="mt-1 h-[4px] w-full bg-[var(--border)]">
                    <div
                      className="h-full"
                      style={{
                        width: `${Math.round(
                          (verifyResult.result.confidence ?? 0) * 100,
                        )
                          }% `,
                        backgroundColor:
                          (verifyResult.result.confidence ?? 0) >= 0.7
                            ? 'var(--accent)'
                            : (verifyResult.result.confidence ?? 0) >= 0.4
                              ? 'var(--gold)'
                              : 'var(--danger)',
                      }}
                    />
                  </div>
                </div>
                <p className="mt-3 text-[13px] text-[var(--text-secondary)] leading-relaxed">
                  {verifyResult.result.reasoning}
                </p>
                {(verifyResult.result.githubCommits ||
                  verifyResult.result.lastCommit) && (
                    <div className="mt-3 flex flex-wrap gap-4 text-[12px]">
                      {verifyResult.result.githubCommits && (
                        <div>
                          <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.08em]">
                            GitHub Commits
                          </p>
                          <p className="font-headline text-[18px] text-[var(--text-primary)]">
                            {verifyResult.result.githubCommits}
                          </p>
                        </div>
                      )}
                      {verifyResult.result.lastCommit && (
                        <div>
                          <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.08em]">
                            Last Commit
                          </p>
                          <p className="text-[12px] text-[var(--text-secondary)]">
                            {verifyResult.result.lastCommit}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                <div className="mt-4">
                  <BlockchainProof
                    txId={verifyResult.blockchain.txId}
                    explorerUrl={verifyResult.blockchain.explorerUrl}
                    verified={verifyResult.blockchain.verified}
                    label="Verification result recorded on Algorand"
                  />
                </div>
              </div>
            )}

            {/* Fraud card */}
            {showFraudCard && fraudResult && (
              <div
                ref={fraudCardRef}
                className="border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-5"
                style={{
                  borderLeftWidth: '4px',
                  borderLeftColor:
                    fraudResult.result.flagged === true
                      ? 'var(--danger)'
                      : 'var(--accent)',
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-headline text-[20px] md:text-[22px] text-[var(--text-primary)]">
                    FRAUD ANALYSIS
                  </h3>
                  <span
                    className="text-[11px] uppercase tracking-[0.09em] px-3 py-1"
                    style={{
                      backgroundColor:
                        fraudResult.result.flagged === true
                          ? 'var(--danger-light)'
                          : 'var(--accent-light)',
                      color:
                        fraudResult.result.flagged === true
                          ? 'var(--danger)'
                          : 'var(--accent)',
                      clipPath:
                        'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
                    }}
                  >
                    {fraudResult.result.flagged === true ? '⚠ FLAGGED' : '✓ CLEAN'}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span>Fraud Score</span>
                    <span>{fraudResult.result.fraudScore ?? 0}/100</span>
                  </div>
                  <div className="mt-1 h-[4px] w-full bg-[var(--border)]">
                    <div
                      className="h-full"
                      style={{
                        width: `${fraudResult.result.fraudScore ?? 0}% `,
                        backgroundColor:
                          (fraudResult.result.fraudScore ?? 0) < 30
                            ? 'var(--accent)'
                            : (fraudResult.result.fraudScore ?? 0) < 60
                              ? 'var(--gold)'
                              : 'var(--danger)',
                      }}
                    />
                  </div>
                </div>
                <p
                  className="mt-3 text-[13px] leading-relaxed"
                  style={{
                    color:
                      fraudResult.result.flagged === true
                        ? 'var(--danger)'
                        : 'var(--accent)',
                  }}
                >
                  {fraudResult.result.flagged === true
                    ? '⚠ Suspicious patterns detected. Review required before fund release.'
                    : '✓ No suspicious patterns detected. Proof appears authentic.'}
                </p>
                {fraudResult.result.flagged === true &&
                  Array.isArray(fraudResult.result.signals) &&
                  fraudResult.result.signals.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--danger)] font-semibold">
                        FLAGS DETECTED
                      </p>
                      <div className="mt-2 space-y-1">
                        {fraudResult.result.signals.map((s: string, idx: number) => (
                          <div
                            // eslint-disable-next-line react/no-array-index-key
                            key={idx}
                            className="flex items-start gap-2"
                          >
                            <span className="mt-[5px] h-[5px] w-[5px] rounded-full bg-[var(--danger)]" />
                            <p className="text-[12px] text-[var(--text-secondary)]">
                              {s}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                {fraudResult.result.recommendation && (
                  <p className="mt-3 text-[13px] text-[var(--text-secondary)] leading-relaxed">
                    {fraudResult.result.recommendation}
                  </p>
                )}
                <div className="mt-4">
                  <BlockchainProof
                    txId={fraudResult.blockchain.txId}
                    explorerUrl={fraudResult.blockchain.explorerUrl}
                    verified={fraudResult.blockchain.verified}
                    label="Fraud scan recorded on Algorand"
                  />
                </div>
              </div>
            )}

            {/* Rejection banner */}
            {showRejectionBanner && (
              <div className="mt-3 border border-[var(--danger)] border-l-[4px] bg-[var(--danger-light)] px-4 py-3">
                <h3 className="font-headline text-[20px] text-[var(--danger)]">
                  FUNDS NOT RELEASED
                </h3>
                <p className="mt-2 text-[13px] text-[var(--text-secondary)] leading-relaxed">
                  {verifyResult?.result?.verified === false
                    ? 'Milestone verification failed. AI could not confirm the proof meets requirements. Improve your submission and try again.'
                    : 'Fraud detection flagged this submission. Review the signals above and resubmit with clearer evidence.'}
                </p>
                <button
                  type="button"
                  className="btn btn-secondary mt-3"
                  onClick={() => {
                    setStep('idle')
                    setShowVerifyCard(false)
                    setShowFraudCard(false)
                    setVerifyResult(null)
                    setFraudResult(null)
                  }}
                  data-hover
                >
                  Revise and Resubmit →
                </button>
              </div>
            )}

            {/* Release card */}
            {showReleaseCard && releaseResult && (
              <div
                ref={releaseCardRef}
                className="px-6 py-6 text-white"
                style={{
                  backgroundColor: 'var(--accent)',
                  clipPath:
                    'polygon(12px 0%, calc(100% - 12px) 0%, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0% calc(100% - 12px), 0% 12px)',
                }}
              >
                <p className="text-[11px] uppercase tracking-[0.15em] text-white/80">
                  FUNDS RELEASED TO YOUR WALLET
                </p>
                <p className="release-amount mt-3 font-headline text-[46px] md:text-[64px] leading-[0.9]">
                  ₹{Number(releaseResult.amount ?? milestone.amount ?? 0).toLocaleString('en-IN')}
                </p>
                <p className="mt-2 text-[14px] text-white/85">
                  ALGO transferred to{' '}
                  {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                </p>
                <div className="my-4 h-px bg-white/25" />
                <div className="mt-2">
                  <BlockchainProof
                    txId={releaseResult.txId}
                    explorerUrl={releaseResult.explorerUrl}
                    verified
                    label="Funds released on Algorand Testnet"
                  />
                </div>
                <p className="mt-3 text-[12px] text-white/75 text-center">
                  ⛓️ Transaction permanently recorded on Algorand · Asset ID:{' '}
                  {ALGO_ASSET_ID} · Network: Testnet
                </p>
                <button
                  type="button"
                  className="btn mt-4 w-full"
                  style={{
                    backgroundColor: '#ffffff',
                    color: 'var(--accent)',
                  }}
                  onClick={() => navigate('/dashboard')}
                  data-hover
                >
                  View in Dashboard →
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default SubmitMilestone

