import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { apiGet } from '../utils/api'

gsap.registerPlugin(ScrollTrigger)

interface TxItem {
  id: number
  action: string
  amount: string
  txId: string
  timeAgo: string
  type: 'credit' | 'neutral'
}

const mockFeed: TxItem[] = [
  {
    id: 1,
    action: 'Milestone 2 Verified — AI Ethics Lab',
    amount: '+2,500 ALGO',
    txId: '7XKLP3Q9A1C7...9MNPQ2',
    timeAgo: '2m ago',
    type: 'credit',
  },
  {
    id: 2,
    action: 'Grant Funded — Campus Mobility',
    amount: '+50,000 ALGO',
    txId: '3RQT8ZDH5V7K...5KWZ9P',
    timeAgo: '5m ago',
    type: 'credit',
  },
  {
    id: 3,
    action: 'NFT Minted — Completion Badge',
    amount: '—',
    txId: '9JBX4LMN23KD...2LPR8X',
    timeAgo: '12m ago',
    type: 'neutral',
  },
  {
    id: 4,
    action: 'Milestone 1 Released — Green Labs',
    amount: '+7,500 ALGO',
    txId: '5PLM8QWZ9RT2...4HSK1Z',
    timeAgo: '18m ago',
    type: 'credit',
  },
  {
    id: 5,
    action: 'DAO Vote — Ethics Charter',
    amount: '—',
    txId: '8HSK2MDN7QW3...7PLM4A',
    timeAgo: '24m ago',
    type: 'neutral',
  },
  {
    id: 6,
    action: 'PATH Reward — Voting Streak',
    amount: '+120 PATH',
    txId: '2LPR8XZC5QW9...3NVB7K',
    timeAgo: '32m ago',
    type: 'credit',
  },
]

const Home = () => {
  const navigate = useNavigate()

  const scene1Ref = useRef<HTMLDivElement | null>(null)
  const scene2Ref = useRef<HTMLDivElement | null>(null)
  const scene4HeadlineRefs = useRef<HTMLDivElement[]>([])
  const scene4TextRef = useRef<HTMLParagraphElement | null>(null)
  const howWrapperRef = useRef<HTMLDivElement | null>(null)
  const howTrackRef = useRef<HTMLDivElement | null>(null)
  const statsBandRef = useRef<HTMLDivElement | null>(null)
  const ctaRef = useRef<HTMLDivElement | null>(null)
  const statsNumberRefs = useRef<HTMLSpanElement[]>([])

  const [feed, setFeed] = useState<TxItem[]>(mockFeed.slice(0, 3))
  const feedIndexRef = useRef(3)

  // Scene 1 – The New Hero
  useEffect(() => {
    if (!scene1Ref.current) return
    const ctx = gsap.context(() => {
      const container = scene1Ref.current!
      const heroLines = container.querySelectorAll('[data-hero-line]')
      const copyEls = container.querySelectorAll('[data-scene1-copy]')

      const tl = gsap.timeline({ delay: 0.2 })
      tl.from(heroLines, {
        opacity: 0,
        y: 60,
        clipPath: 'inset(100% 0 0 0)',
        duration: 1.2,
        stagger: 0.15,
        ease: 'power3.out',
      })
      tl.from(
        copyEls,
        {
          opacity: 0,
          y: 20,
          duration: 1,
          stagger: 0.3,
          ease: 'power2.out',
        },
        '-=0.5',
      )
    }, scene1Ref)

    return () => {
      ctx.revert()
    }
  }, [])

  // Scene 2 – The Pain
  useEffect(() => {
    if (!scene2Ref.current) return
    const ctx = gsap.context(() => {
      const section = scene2Ref.current!
      const blocks = section.querySelectorAll('[data-scene2-block]')

      gsap.fromTo(
        section,
        { backgroundColor: 'var(--bg-primary)' },
        {
          backgroundColor: '#EDEAE4',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            end: 'bottom 20%',
            scrub: true,
          },
        },
      )

      gsap.from(blocks, {
        opacity: 0,
        y: 40,
        duration: 0.8,
        stagger: 0.35,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 70%',
        },
      })
    }, scene2Ref)

    return () => ctx.revert()
  }, [])

  // Scene 3 – The Shift
  useEffect(() => {
    const el = document.querySelector('[data-scene3-line]')
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 1.4,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 80%',
          },
        },
      )
    }, el)
    return () => ctx.revert()
  }, [])

  // Scene 4 – The Solution
  useEffect(() => {
    const headlines = scene4HeadlineRefs.current
    const text = scene4TextRef.current
    if (!headlines.length || !text) return

    const ctx = gsap.context(() => {
      gsap.set(headlines, { clipPath: 'inset(0 100% 0 0)' })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: headlines[0].parentElement,
          start: 'top 70%',
        },
      })

      tl.to(headlines, {
        clipPath: 'inset(0 0% 0 0)',
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.15,
      }).from(
        text,
        {
          opacity: 0,
          y: 20,
          duration: 0.7,
          ease: 'power2.out',
        },
        '-=0.4',
      )
    })

    return () => ctx.revert()
  }, [])

  // Scene 5 – How It Works (horizontal)
  useEffect(() => {
    const wrapper = howWrapperRef.current
    const track = howTrackRef.current
    if (!wrapper || !track) return

    const ctx = gsap.context(() => {
      // Flip in animation on scroll into view
      gsap.from(wrapper, {
        rotateX: -15,
        opacity: 0,
        y: 60,
        duration: 1.2,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: wrapper,
          start: 'top 80%',
        }
      })

      // Horizontal pinning
      gsap.to(track, {
        x: () => -(track.offsetWidth - window.innerWidth),
        ease: 'none',
        scrollTrigger: {
          trigger: wrapper,
          pin: true,
          scrub: 1,
          end: () => `+=${track.offsetWidth - window.innerWidth}`,
        },
      })
    }, wrapper)

    return () => ctx.revert()
  }, [])

  // Scene 6 – Live feed (auto-animate) – single interval
  useEffect(() => {
    const id = window.setInterval(() => {
      setFeed((prev) => {
        const nextItem = mockFeed[feedIndexRef.current % mockFeed.length]
        feedIndexRef.current += 1
        const updated = [...prev, nextItem]
        if (updated.length > 5) updated.shift()
        return updated
      })
    }, 3000)

    return () => window.clearInterval(id)
  }, [])

  // Animate newest feed row when feed changes
  useEffect(() => {
    const container = document.querySelector('[data-feed-container]')
    if (!container) return
    const rows = container.querySelectorAll('[data-feed-row]')
    const last = rows[rows.length - 1]
    if (!last) return

    gsap.fromTo(
      last,
      { opacity: 0, y: 12 },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: 'power2.out',
      },
    )
  }, [feed])

  // Scene 7 – Stats band + countup
  useEffect(() => {
    if (!statsBandRef.current || !statsNumberRefs.current.length) return
    const ctx = gsap.context(() => {
      const targets = statsNumberRefs.current
      const values = [48, 127, 99.2, 0]
      const suffixes = ['L+', '', '%', '']

      ScrollTrigger.create({
        trigger: statsBandRef.current,
        start: 'top 80%',
        onEnter: () => {
          targets.forEach((el, index) => {
            const obj = { val: 0 }
            gsap.to(obj, {
              val: values[index],
              duration: 1.3,
              ease: 'power2.out',
              snap: String(index === 2 ? 0.1 : 1) as any,
              onUpdate: () => {
                const v = index === 2 ? obj.val.toFixed(1) : Math.round(obj.val).toString()
                el.textContent =
                  index === 0 ? `₹${v}${suffixes[index]}` : `${v}${suffixes[index]}`
              },
            })
          })
        },
      })
    }, statsBandRef)

    return () => ctx.revert()
  }, [])

  // Scene 8 – CTA word-by-word + buttons
  useEffect(() => {
    if (!ctaRef.current) return
    const ctx = gsap.context(() => {
      const container = ctaRef.current!
      const headline = container.querySelector('[data-cta-headline]') as HTMLElement | null
      const buttons = container.querySelectorAll('[data-cta-button]')
      if (!headline) return

      const words = headline.innerText.split(' ')
      headline.innerHTML = words.map((w) => `<span class="inline-block mr-2">${w}</span>`).join(' ')
      const spans = headline.querySelectorAll('span')

      gsap.from(spans, {
        opacity: 0,
        y: 30,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: container,
          start: 'top 80%',
        },
      })

      gsap.from(buttons, {
        opacity: 0,
        scale: 0.9,
        duration: 0.6,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: container,
          start: 'top 78%',
        },
      })
    }, ctaRef)

    return () => ctx.revert()
  }, [])

  // Scene 7 – stats from backend (optional enhancement)
  useEffect(() => {
    // 🔌 BACKEND: GET /stats
    apiGet('/stats')
      .then((data) => {
        if (!statsNumberRefs.current.length) return
        const mapping = [
          data.totalFundsTracked ?? 48,
          data.milestonesVerified ?? 127,
          data.avgTrustScore ?? 99.2,
          data.fundsLost ?? 0,
        ]
        statsNumberRefs.current.forEach((span, i) => {
          const v = mapping[i]
          if (i === 0) {
            span.textContent = `₹${v}L+`
          } else if (i === 2) {
            span.textContent = `${v}%`
          } else {
            span.textContent = `${v}`
          }
        })
      })
      .catch(() => {
        // fallback to static values handled in GSAP onEnter
      })
  }, [])

  return (
    <div className="relative z-[1] bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Scene 1 – The Hero */}
      <section
        ref={scene1Ref}
        data-scroll-home="hero"
        className="min-h-screen flex items-center justify-center px-6 relative"
      >
        <div className="flex flex-col items-center text-center gap-4 z-10 w-full">
          <p
            className="text-[12px] md:text-[14px] tracking-[0.2em] font-medium uppercase text-[#00FF94]"
            data-scene1-copy
          >
            THE FUTURE OF GRANT FUNDING
          </p>

          <div className="flex flex-col items-center mt-2 overflow-hidden">
            <div
              className="font-headline text-[80px] md:text-[140px] leading-[0.85] text-[var(--text-primary)]"
              style={{ clipPath: 'inset(0 0 0 0)' }}
              data-hero-line
            >
              WANNA
            </div>
            <div
              className="font-headline text-[80px] md:text-[140px] leading-[0.85] text-[#00FF94]"
              style={{ clipPath: 'inset(0 0 0 0)' }}
              data-hero-line
            >
              FUND
            </div>
            <div
              className="font-headline text-[80px] md:text-[140px] leading-[0.85] text-[var(--text-primary)]"
              style={{ clipPath: 'inset(0 0 0 0)' }}
              data-hero-line
            >
              SOMETHING
            </div>
            <div
              className="font-headline text-[80px] md:text-[140px] leading-[0.85] text-[var(--text-primary)]"
              style={{ clipPath: 'inset(0 0 0 0)' }}
              data-hero-line
            >
              REAL?
            </div>
          </div>

          <p
            className="text-[16px] md:text-[19px] text-[var(--text-secondary)] leading-relaxed max-w-lg mt-6"
            data-scene1-copy
          >
            Transparent, verifiable, milestone-based blockchain funding. <br />
            Because trust is good, but proof is better.
          </p>

          <div className="mt-8 flex items-center gap-4" data-scene1-copy>
            <button
              onClick={() => navigate('/grants')}
              className="btn btn-primary px-8 py-4 text-[15px] font-semibold"
            >
              Explore Grants
            </button>
            <button
              onClick={() => navigate('/grants/create')}
              className="text-[14px] font-medium uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--text-primary)] hover:text-[#00FF94] hover:border-[#00FF94] transition-colors"
            >
              Submit Proposal
            </button>
          </div>
        </div>
      </section>

      {/* Scene 2 – The Pain */}
      <section
        ref={scene2Ref}
        className="min-h-screen flex flex-col justify-center gap-16 px-[10vw] py-20"
      >
        <div
          data-scene2-block
          className="max-w-3xl"
        >
          <div className="font-headline text-[72px] md:text-[120px] text-[var(--text-primary)] leading-none">
            67%
          </div>
          <p className="mt-2 text-[16px] text-[var(--text-secondary)]">
            of grant recipients never submit final reports.
          </p>
        </div>
        <div
          data-scene2-block
          className="max-w-3xl"
        >
          <div className="font-headline text-[72px] md:text-[120px] text-[var(--text-primary)] leading-none">
            3 WKS
          </div>
          <p className="mt-2 text-[16px] text-[var(--text-secondary)]">
            average time to manually verify a single milestone.
          </p>
        </div>
        <div
          data-scene2-block
          className="max-w-3xl"
        >
          <div className="font-headline text-[72px] md:text-[120px] text-[var(--gold)] leading-none">
            ₹0
          </div>
          <p className="mt-2 text-[16px] text-[var(--text-secondary)]">
            accountability when student funds are misused.
          </p>
        </div>
      </section>

      {/* Scene 3 – The Shift */}
      <section className="min-h-[70vh] flex items-center justify-center px-6">
        <p
          data-scene3-line
          className="text-[22px] text-[var(--text-secondary)] tracking-[0.1em] text-center max-w-2xl"
        >
          We built something different.
        </p>
      </section>

      {/* Scene 4 – The Solution */}
      <section
        data-scroll-home="building"
        className="min-h-screen flex items-center justify-center px-6"
      >
        <div className="flex flex-col items-center text-center">
          <p className="text-[12px] uppercase tracking-[0.25em] text-[var(--accent)] mb-2">
            Introducing
          </p>
          <div className="flex flex-col leading-[0.82] items-center">
            <div
              ref={(el) => {
                if (el) scene4HeadlineRefs.current[0] = el
              }}
              className="font-headline text-[76px] md:text-[130px] text-[var(--text-primary)]"
            >
              CLEAR
            </div>
            <div
              ref={(el) => {
                if (el) scene4HeadlineRefs.current[1] = el
              }}
              className="font-headline text-[76px] md:text-[130px] text-[var(--text-primary)] -mt-4"
            >
              GRANT
            </div>
          </div>
          <p
            ref={scene4TextRef}
            className="mt-6 text-[19px] text-[var(--text-secondary)] leading-relaxed max-w-xl"
          >
            Milestone-based grant funding.
            <br />
            AI verifies every deliverable.
            <br />
            Blockchain makes every rupee
            <br />
            permanent and auditable.
          </p>
        </div>
      </section>

      {/* Scene 5 – How It Works (horizontal) */}
      <section
        ref={howWrapperRef}
        className="relative h-screen overflow-hidden hidden md:block"
      >
        <div
          ref={howTrackRef}
          className="flex h-full"
        >
          {/* Panel 1 */}
          <div className="relative flex h-full w-screen items-center px-[10vw]">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="font-headline text-[200px] md:text-[280px] text-[var(--accent)] opacity-[0.07] select-none">
                01
              </span>
            </div>
            <div className="relative z-10 max-w-xl">
              <p className="text-[12px] uppercase tracking-[0.22em] text-[var(--accent)] mb-2">
                Step One
              </p>
              <h2 className="font-headline text-[40px] md:text-[52px] text-[var(--text-primary)]">
                SPONSORS CREATE GRANTS
              </h2>
              <p className="mt-4 text-[17px] text-[var(--text-secondary)] leading-relaxed max-w-md">
                Define milestones, set funding amounts, publish conditions to Algorand blockchain. Every grant term is
                permanent and tamper-proof.
              </p>
              <div className="mt-6 h-[3px] w-[60px] bg-[var(--accent)]" />
              <p className="mt-3 text-[12px] text-[var(--text-muted)]">
                Grant config recorded on-chain at creation.
              </p>
            </div>
          </div>

          {/* Panel 2 */}
          <div className="relative flex h-full w-screen items-center px-[10vw]">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="font-headline text-[200px] md:text-[280px] text-[var(--accent)] opacity-[0.07] select-none">
                02
              </span>
            </div>
            <div className="relative z-10 max-w-xl">
              <p className="text-[12px] uppercase tracking-[0.22em] text-[var(--accent)] mb-2">
                Step Two
              </p>
              <h2 className="font-headline text-[40px] md:text-[52px] text-[var(--text-primary)]">
                TEAMS APPLY &amp; BUILD
              </h2>
              <p className="mt-4 text-[17px] text-[var(--text-secondary)] leading-relaxed max-w-md">
                Submit proposals. AI scores them in seconds. Best teams get funded. Every milestone tracked
                transparently from day one.
              </p>
              <div className="mt-6 h-[3px] w-[60px] bg-[var(--accent)]" />
              <p className="mt-3 text-[12px] text-[var(--text-muted)]">
                AI score hash stored on Algorand.
              </p>
            </div>
          </div>

          {/* Panel 3 */}
          <div className="relative flex h-full w-screen items-center px-[10vw]">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="font-headline text-[200px] md:text-[280px] text-[var(--accent)] opacity-[0.07] select-none">
                03
              </span>
            </div>
            <div className="relative z-10 max-w-xl">
              <p className="text-[12px] uppercase tracking-[0.22em] text-[var(--accent)] mb-2">
                Step Three
              </p>
              <h2 className="font-headline text-[40px] md:text-[52px] text-[var(--text-primary)]">
                AI VERIFIES. CHAIN PAYS.
              </h2>
              <p className="mt-4 text-[17px] text-[var(--text-secondary)] leading-relaxed max-w-md">
                Submit milestone proof. AI + Fraud Sentinel verify authenticity automatically. Funds release to your
                wallet. Zero corruption.
              </p>
              <div className="mt-6 h-[3px] w-[60px] bg-[var(--accent)]" />
              <p className="mt-3 text-[12px] text-[var(--text-muted)]">
                ⛓️ Powered by Algorand Testnet.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Scene 5 – Mobile stacked version */}
      <section className="md:hidden px-6 py-16 space-y-16">
        {/* Panel 1 */}
        <div className="relative">
          <span className="pointer-events-none font-headline text-[160px] text-[var(--accent)] opacity-[0.06] absolute -top-10 -left-2 select-none">
            01
          </span>
          <div className="relative z-10">
            <p className="text-[12px] uppercase tracking-[0.22em] text-[var(--accent)] mb-2">
              Step One
            </p>
            <h2 className="font-headline text-[34px] text-[var(--text-primary)]">
              SPONSORS CREATE GRANTS
            </h2>
            <p className="mt-3 text-[16px] text-[var(--text-secondary)] leading-relaxed">
              Define milestones, set funding amounts, publish conditions to Algorand blockchain. Every grant term is
              permanent and tamper-proof.
            </p>
            <div className="mt-5 h-[3px] w-[60px] bg-[var(--accent)]" />
            <p className="mt-2 text-[12px] text-[var(--text-muted)]">
              Grant config recorded on-chain at creation.
            </p>
          </div>
        </div>

        {/* Panel 2 */}
        <div className="relative">
          <span className="pointer-events-none font-headline text-[160px] text-[var(--accent)] opacity-[0.06] absolute -top-10 -left-2 select-none">
            02
          </span>
          <div className="relative z-10">
            <p className="text-[12px] uppercase tracking-[0.22em] text-[var(--accent)] mb-2">
              Step Two
            </p>
            <h2 className="font-headline text-[34px] text-[var(--text-primary)]">
              TEAMS APPLY &amp; BUILD
            </h2>
            <p className="mt-3 text-[16px] text-[var(--text-secondary)] leading-relaxed">
              Submit proposals. AI scores them in seconds. Best teams get funded. Every milestone tracked
              transparently from day one.
            </p>
            <div className="mt-5 h-[3px] w-[60px] bg-[var(--accent)]" />
            <p className="mt-2 text-[12px] text-[var(--text-muted)]">
              AI score hash stored on Algorand.
            </p>
          </div>
        </div>

        {/* Panel 3 */}
        <div className="relative">
          <span className="pointer-events-none font-headline text-[160px] text-[var(--accent)] opacity-[0.06] absolute -top-10 -left-2 select-none">
            03
          </span>
          <div className="relative z-10">
            <p className="text-[12px] uppercase tracking-[0.22em] text-[var(--accent)] mb-2">
              Step Three
            </p>
            <h2 className="font-headline text-[34px] text-[var(--text-primary)]">
              AI VERIFIES. CHAIN PAYS.
            </h2>
            <p className="mt-3 text-[16px] text-[var(--text-secondary)] leading-relaxed">
              Submit milestone proof. AI + Fraud Sentinel verify authenticity automatically. Funds release to your
              wallet. Zero corruption.
            </p>
            <div className="mt-5 h-[3px] w-[60px] bg-[var(--accent)]" />
            <p className="mt-2 text-[12px] text-[var(--text-muted)]">
              ⛓️ Powered by Algorand Testnet.
            </p>
          </div>
        </div>
      </section>

      {/* Scene 6 – Live Blockchain Feed */}
      <section className="min-h-[80vh] flex flex-col md:flex-row items-stretch px-6 md:px-[10vw] py-20 gap-12">
        <div className="flex-1 flex flex-col justify-center">
          <h2 className="font-headline text-[40px] md:text-[56px] text-[var(--text-primary)]">
            LIVE ON ALGORAND
          </h2>
          <p className="mt-2 text-[15px] text-[var(--text-muted)]">
            Real transactions. Permanent. Forever.
          </p>
          <p className="mt-4 text-[13px] md:text-[15px] text-[var(--text-secondary)] max-w-sm leading-relaxed">
            Every grant action — from funding to milestone verification to fund release — is recorded on-chain in real
            time.
          </p>
          <button
            type="button"
            className="btn btn-primary mt-8"
            data-hover
            onClick={() => navigate('/grants')}
          >
            Browse Active Grants →
          </button>
        </div>
        <div className="flex-1">
          <div className="rounded-md bg-[var(--bg-elevated)] border border-[var(--border)] shadow-sm p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-medium text-[var(--text-secondary)]">
                Recent on-chain activity
              </p>
              <span className="font-mono-chain text-[11px] text-[var(--text-muted)]">
                Algorand Testnet
              </span>
            </div>
            <div
              data-feed-container
              className="relative flex-1 overflow-hidden mt-2"
            >
              <div className="absolute inset-0 overflow-hidden">
                <div className="flex flex-col">
                  {feed.map((item) => (
                    <div
                      key={item.id + '-' + item.timeAgo}
                      data-feed-row
                      className="flex items-center gap-3 py-2.5 px-2 border-b border-[var(--border)]"
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            item.type === 'credit' ? 'var(--accent)' : 'var(--text-muted)',
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-[var(--text-primary)] truncate">
                          {item.action}
                        </p>
                        <div className="mt-0.5 flex items-center gap-3">
                          <span className="font-headline text-[14px] text-[var(--gold)]">
                            {item.amount}
                          </span>
                          <span className="font-mono-chain text-[11px] text-[var(--text-muted)]">
                            {item.txId.slice(0, 7)}...{item.txId.slice(-5)}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                        {item.timeAgo}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scene 7 – Stats Dark Band */}
      <section
        ref={statsBandRef}
        className="bg-[var(--bg-dark)] text-white px-6 md:px-[10vw] py-16"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-16">
          <div className="text-center md:text-left">
            <span
              ref={(el) => {
                if (el) statsNumberRefs.current[0] = el
              }}
              className="font-headline text-[52px] md:text-[72px] block"
            >
              ₹48L+
            </span>
            <span className="text-[14px] text-white/60">Active Funds Tracked</span>
          </div>
          <div className="text-center md:text-left">
            <span
              ref={(el) => {
                if (el) statsNumberRefs.current[1] = el
              }}
              className="font-headline text-[52px] md:text-[72px] block"
            >
              127
            </span>
            <span className="text-[14px] text-white/60">Milestones Verified</span>
          </div>
          <div className="text-center md:text-left">
            <span
              ref={(el) => {
                if (el) statsNumberRefs.current[2] = el
              }}
              className="font-headline text-[52px] md:text-[72px] block"
            >
              99.2%
            </span>
            <span className="text-[14px] text-white/60">Fraud Detection Rate</span>
          </div>
          <div className="text-center md:text-left">
            <span
              ref={(el) => {
                if (el) statsNumberRefs.current[3] = el
              }}
              className="font-headline text-[52px] md:text-[72px] block"
            >
              0
            </span>
            <span className="text-[14px] text-white/60">Funds Lost to Fraud</span>
          </div>
        </div>
      </section>

      {/* Scene 8 – Final CTA */}
      <section
        ref={ctaRef}
        data-scroll-home="ready"
        className="min-h-screen flex flex-col items-center justify-center px-6"
      >
        <div className="max-w-3xl text-center">
          <h2
            data-cta-headline
            className="font-headline text-[56px] md:text-[92px] leading-[0.85] text-[var(--text-primary)]"
          >
            READY TO BUILD WITH ACCOUNTABILITY?
          </h2>
          <p className="mt-6 text-[18px] text-[var(--text-secondary)] leading-relaxed">
            Connect your wallet. Apply for a grant.
            <br />
            Or sponsor the next generation of builders.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              className="btn btn-primary w-full sm:w-auto"
              data-cta-button
              data-hover
              onClick={() => navigate('/grants')}
            >
              Browse Open Grants →
            </button>
            <button
              type="button"
              className="btn btn-secondary w-full sm:w-auto"
              data-cta-button
              data-hover
              onClick={() => navigate('/sponsor')}
            >
              I&apos;m a Sponsor
            </button>
          </div>
          <p className="mt-12 font-mono-chain text-[11px] text-[var(--text-muted)]">
            Built on Algorand Testnet · PATH Coin ID: 756376747 · NEXATHON 2026 · SIT Hyderabad
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 md:px-[10vw] py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-headline text-[18px] text-[var(--text-primary)]">
            ClearGrant
          </span>
          <span className="text-[12px] text-[var(--text-muted)]">
            · Transparent Grant Funding on Algorand
          </span>
        </div>
        <div className="text-[12px] text-[var(--text-muted)] text-left md:text-right">
          NEXATHON 2026 · SIT Hyderabad · Agentic AI + Blockchain
        </div>
      </footer>
    </div>
  )
}

export default Home

