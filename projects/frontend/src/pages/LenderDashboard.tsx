import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { gsap } from 'gsap'
import { apiGet, apiPost } from '../utils/api'

export default function LenderDashboard() {
    const { activeAddress } = useWallet()
    // Align fallback with SponsorDashboard to make testing work without connecting
    const walletAddress =
        activeAddress ?? 'KJRWDDAMLSXDBNGYALHIYU2O7MBG2PUP6UMFBB2AG6STNMMEK4ODRJ67OE'

    const [grants, setGrants] = useState<any[]>([])
    const [applications, setApplications] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const grantsData = await apiGet('/grants')
                const list = Array.isArray(grantsData) ? grantsData : grantsData.grants ?? []

                // Filter grants created by this sponsor
                const myGrants = list.filter(
                    (g: any) => g.sponsorWallet === walletAddress,
                )
                setGrants(myGrants)

                const appsData = await apiGet('/applications')
                const appsList = Array.isArray(appsData) ? appsData : appsData.applications ?? []
                const myGrantIds = myGrants.map((g: any) => g._id)
                const relevantApps = appsList.filter((app: any) =>
                    myGrantIds.includes(app.grantId),
                )
                setApplications(relevantApps)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [walletAddress])

    useEffect(() => {
        if (!loading) {
            gsap.fromTo(
                '.dashboard-stagger',
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out' },
            )
        }
    }, [loading, applications])

    const handleDecision = async (appId: string, decision: 'APPROVED' | 'REJECTED') => {
        try {
            const result = await apiPost(`/applications/${appId}/sponsor-decision`, { decision })

            // Update local state
            setApplications(prev => prev.map(a => a._id === appId ? result.application : a))

            // Visual feedback
            const btnGroup = document.getElementById(`decision-btns-${appId}`)
            if (btnGroup) {
                gsap.to(btnGroup, { opacity: 0, scale: 0.9, duration: 0.3, onComplete: () => { btnGroup.style.display = 'none' } })
            }

        } catch (err) {
            console.error(err)
            alert("Failed to submit decision.")
        }
    }

    if (loading) {
        return (
            <div className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="pt-24 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
            <header className="mb-12 dashboard-stagger">
                <h1 className="font-headline text-[32px] md:text-[48px] uppercase tracking-wide">
                    Lender <span className="text-[var(--accent)]">Command Center</span>
                </h1>
                <p className="text-[var(--text-muted)] mt-2">
                    Review incoming applications, AI Risk Reports, and disburse funds.
                </p>
            </header>

            {grants.length === 0 ? (
                <div className="bg-[var(--bg-elevated)] border border-[var(--border)] p-12 text-center dashboard-stagger">
                    <h2 className="text-[20px] font-headline text-[var(--text-primary)] mb-4">You have not created any Grants</h2>
                    <Link to="/sponsor" className="btn btn-primary">Create a Grant</Link>
                </div>
            ) : (
                <div className="space-y-12">
                    {grants.map((grant) => {
                        const grantApps = applications.filter((a) => a.grantId === grant._id)

                        return (
                            <section
                                key={grant._id}
                                className="dashboard-stagger bg-[var(--bg-elevated)] border border-[var(--border)] p-6 md:p-8"
                            >
                                <div className="flex justify-between items-start mb-6 border-b border-[var(--border)] pb-4">
                                    <div>
                                        <span className="text-[10px] text-[var(--accent)] tracking-[0.2em] uppercase mb-1 block">
                                            {grant.domain}
                                        </span>
                                        <h2 className="text-[24px] font-headline">
                                            {grant.title}
                                        </h2>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[24px] font-headline text-[var(--gold)]">
                                            ₹{Number(grant.totalAmount).toLocaleString('en-IN')}
                                        </span>
                                        <p className="text-[12px] text-[var(--text-muted)] mt-1">
                                            Total Vault
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[14px] uppercase tracking-[0.1em] text-[var(--text-muted)] mb-4">
                                        Applications ({grantApps.length})
                                    </h3>

                                    {grantApps.length === 0 ? (
                                        <p className="text-[14px] text-[var(--text-muted)] italic">
                                            No applications yet.
                                        </p>
                                    ) : (
                                        grantApps.map((app) => (
                                            <div
                                                key={app._id}
                                                className="border border-[var(--border-strong)] bg-black/20 p-4 md:p-6 flex flex-col md:flex-row gap-6 relative"
                                            >
                                                {/* Status Ribbon */}
                                                {app.status === 'APPROVED' && (
                                                    <div className="absolute top-0 right-0 bg-[var(--accent)] text-black text-[10px] font-bold px-3 py-1 lowercase tracking-[0.1em]">
                                                        FUNDED
                                                    </div>
                                                )}
                                                {app.status === 'REJECTED' && (
                                                    <div className="absolute top-0 right-0 bg-[var(--danger)] text-black text-[10px] font-bold px-3 py-1 lowercase tracking-[0.1em]">
                                                        REJECTED
                                                    </div>
                                                )}

                                                <div className="flex-[2]">
                                                    <h4 className="text-[18px] font-headline text-[var(--text-primary)]">
                                                        {app.projectTitle}
                                                    </h4>
                                                    <p className="text-[13px] text-[var(--text-muted)] mt-2 line-clamp-2">
                                                        {app.description}
                                                    </p>

                                                    <div className="flex gap-4 mt-4 text-[12px] text-[var(--text-muted)]">
                                                        <div>
                                                            <strong className="block text-[var(--text-primary)]">
                                                                Aadhaar ID
                                                            </strong>
                                                            {app.aadhaarId || 'Not provided'}
                                                        </div>
                                                        <div>
                                                            <strong className="block text-[var(--text-primary)]">
                                                                KYC
                                                            </strong>
                                                            {app.kycDocumentUrl ? (
                                                                <a
                                                                    href={app.kycDocumentUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-[var(--accent)] hover:underline"
                                                                >
                                                                    View Doc ↗
                                                                </a>
                                                            ) : (
                                                                'Missing'
                                                            )}
                                                        </div>
                                                        <div>
                                                            <strong className="block text-[var(--text-primary)]">
                                                                Wallet
                                                            </strong>
                                                            {app.applicantWallet.substring(0, 6)}...
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex-[1] bg-[var(--bg-primary)] border border-[var(--border)] p-4 flex flex-col items-center justify-center text-center">
                                                    <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">
                                                        AI Risk Score
                                                    </div>
                                                    <div
                                                        className="text-[32px] font-headline leading-none"
                                                        style={{
                                                            color:
                                                                app.aiScore >= 70
                                                                    ? 'var(--accent)'
                                                                    : app.aiScore >= 50
                                                                        ? 'var(--gold)'
                                                                        : 'var(--danger)',
                                                        }}
                                                    >
                                                        {app.aiScore ?? '--'}
                                                    </div>
                                                    <p className="text-[11px] mt-2 text-[var(--text-muted)]">
                                                        {app.aiRecommendation || 'Awaiting n8n analysis'}
                                                    </p>
                                                </div>

                                                {app.status === 'SUBMITTED' && (
                                                    <div id={`decision-btns-${app._id}`} className="flex flex-col gap-2 justify-center min-w-[140px]">
                                                        <button
                                                            onClick={() => handleDecision(app._id, 'APPROVED')}
                                                            className="btn btn-primary w-full py-2 text-[12px]">
                                                            Approve & Fund
                                                        </button>
                                                        <button
                                                            onClick={() => handleDecision(app._id, 'REJECTED')}
                                                            className="btn btn-secondary border-red-500/50 text-red-400 hover:bg-red-500/10 w-full py-2 text-[12px]">
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}

                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
