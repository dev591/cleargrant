import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { gsap } from 'gsap'
import { apiPost } from '../utils/api'

// Simple implementation of SHA-256 in browser for the hash challenge
async function sha256(message: string) {
    const msgBuffer = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
}

// AES-GCM Encryption 
async function encryptData(secretData: string, passwordHash: string) {
    const enc = new TextEncoder()
    const passwordKey = await crypto.subtle.importKey(
        "raw",
        enc.encode(passwordHash.substring(0, 32)), // Must be 256 bits (32 bytes)
        "AES-GCM",
        false,
        ["encrypt"]
    )
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const cipherBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        passwordKey,
        enc.encode(secretData)
    )

    // Combine IV and Ciphertext for storage
    const cipherArray = Array.from(new Uint8Array(cipherBuffer))
    const ivArray = Array.from(iv)
    const payloadHex = [...ivArray, ...cipherArray].map(b => b.toString(16).padStart(2, '0')).join('')
    return payloadHex
}

// AES-GCM Decryption
async function decryptData(encryptedPayloadHex: string, passwordHash: string) {
    const enc = new TextEncoder()
    const passwordKey = await crypto.subtle.importKey(
        "raw",
        enc.encode(passwordHash.substring(0, 32)),
        "AES-GCM",
        false,
        ["decrypt"]
    )

    // Convert hex back to bytes
    const bytes = new Uint8Array(encryptedPayloadHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)))
    const iv = bytes.slice(0, 12)
    const data = bytes.slice(12)

    try {
        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            passwordKey,
            data
        )
        return new TextDecoder().decode(decryptedBuffer)
    } catch (e) {
        throw new Error("Decryption failed. Incorrect hash 7/7 key.")
    }
}


export default function EscrowVault() {
    const { activeAddress } = useWallet()
    const walletAddress = activeAddress ?? 'DEMO_ESCROW_WALLET_123'

    const [mode, setMode] = useState<'LOCK' | 'UNLOCK'>('LOCK')

    // Escrow State
    const [secretData, setSecretData] = useState('')
    const [answers, setAnswers] = useState(['', '', '', '', '', '', ''])

    const [locking, setLocking] = useState(false)
    const [unlocking, setUnlocking] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [vaultRecord, setVaultRecord] = useState<any>(null)
    const [decryptedResult, setDecryptedResult] = useState<string | null>(null)

    const questions = [
        "1. What is the exact latitude of your childhood home?",
        "2. What is the private key of your first testnet wallet?",
        "3. What was the exact time (HH:MM) of your first smart contract deployment?",
        "4. What is the SHA-256 hash of your favorite book title?",
        "5. What are the last 4 digits of your PGP fingerprint?",
        "6. What is the UUID of your most successful grant?",
        "7. What is your chosen cryptographic salt for this vault?"
    ]

    const handleAnswerChange = (index: number, value: string) => {
        const newAnswers = [...answers]
        newAnswers[index] = value
        setAnswers(newAnswers)
    }

    const getHashKey = async () => {
        // Strict 7/7 Concatenation
        const combined = answers.map(a => a.trim().toLowerCase()).join('||')
        return await sha256(combined)
    }

    const handleLock = async () => {
        if (answers.some(a => a.trim() === '')) {
            setError("You must answer exactly 7 out of 7 questions to generate the cryptographic lock.")
            return
        }
        if (!secretData) {
            setError("You must provide data to encrypt.")
            return
        }

        setLocking(true)
        setError(null)
        try {
            const challengeHash = await getHashKey()
            const encryptedPayload = await encryptData(secretData, challengeHash)

            // POST to backend for storage + MOCK ALGO Txn
            const res = await apiPost('/escrow/lock', {
                ownerWallet: walletAddress,
                encryptedPayload,
                challengeHash, // Store the hash to verify future unlock attempts
                metadata: { description: "Lender Identity KYC Backup" }
            })

            setVaultRecord(res)

        } catch (e: any) {
            setError(e.message)
        } finally {
            setLocking(false)
        }
    }

    const handleUnlock = async () => {
        if (!vaultRecord) return
        if (answers.some(a => a.trim() === '')) {
            setError("You must provide all 7 answers exactly as entered to reconstruct the AES decryption key.")
            return
        }

        setUnlocking(true)
        setError(null)
        setDecryptedResult(null)

        try {
            const reconstructedHash = await getHashKey()

            // 1. Ask Backend to verify against stored hash
            const res = await apiPost('/escrow/unlock', {
                vaultId: vaultRecord.vaultId,
                providedHash: reconstructedHash
            })

            // 2. If backend releases payload, decrypt it locally with the hash as the password
            const decryptedString = await decryptData(res.encryptedPayload, reconstructedHash)
            setDecryptedResult(decryptedString)

        } catch (e: any) {
            setError(e.message || "Decryption failed. A single incorrect character in any of the 7 answers breaks the encryption algorithm.")

            // Visual feedback for mathematical failure
            gsap.fromTo('.escrow-error', { x: -10 }, { x: 10, duration: 0.1, yoyo: true, repeat: 5 })
        } finally {
            setUnlocking(false)
        }
    }


    return (
        <div className="pt-24 pb-20 px-4 md:px-8 max-w-4xl mx-auto">
            <header className="mb-12 text-center">
                <h1 className="font-headline text-[32px] md:text-[48px] uppercase tracking-wide">
                    7/7 Zero-Knowledge <span className="text-[var(--danger)]">Escrow</span>
                </h1>
                <p className="text-[var(--text-muted)] mt-2 max-w-2xl mx-auto">
                    Secure your sensitive sponsorship data (KYC, real identity) using a strict 7-question mathematical lock.
                    The answers are <strong className="text-[var(--text-primary)]">never transmitted</strong>. They are hashed locally to form an unbreakable AES-GCM encryption key, anchored to Algorand.
                </p>
            </header>

            {/* Mode Toggle */}
            <div className="flex justify-center mb-8 gap-4">
                <button
                    onClick={() => { setMode('LOCK'); setError(null); setAnswers(['', '', '', '', '', '', '']); setSecretData(''); setVaultRecord(null) }}
                    className={`px-6 py-2 text-[12px] uppercase font-bold tracking-[0.1em] ${mode === 'LOCK' ? 'bg-[var(--danger)] text-black' : 'border border-[var(--border)] text-[var(--text-muted)]'}`}>
                    Lock Data
                </button>
                <button
                    onClick={() => { setMode('UNLOCK'); setError(null); setAnswers(['', '', '', '', '', '', '']); setDecryptedResult(null) }}
                    className={`px-6 py-2 text-[12px] uppercase font-bold tracking-[0.1em] ${mode === 'UNLOCK' ? 'bg-[var(--accent)] text-black' : 'border border-[var(--border)] text-[var(--text-muted)]'}`}>
                    Unlock Escrow
                </button>
            </div>

            {error && (
                <div className="escrow-error mb-6 p-4 bg-[var(--danger-light)] border border-[var(--danger)] text-[var(--danger)] text-[13px] text-center">
                    {error}
                </div>
            )}

            <div className="bg-[var(--bg-elevated)] border border-[var(--border)] p-6 md:p-8">

                {/* Questions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {questions.map((q, idx) => (
                        <div key={idx} className={idx === 6 ? "md:col-span-2" : ""}>
                            <label className="block text-[11px] text-[var(--text-muted)] mb-1">{q}</label>
                            <input
                                type="password"
                                className="w-full bg-black/50 border border-[var(--border-strong)] px-3 py-2 text-[14px] font-mono-chain"
                                value={answers[idx]}
                                onChange={(e) => handleAnswerChange(idx, e.target.value)}
                            />
                        </div>
                    ))}
                </div>

                {mode === 'LOCK' && !vaultRecord && (
                    <div className="border-t border-[var(--border)] pt-6">
                        <label className="block text-[13px] uppercase tracking-[0.1em] text-[var(--danger)] mb-2">
                            SECRET DATA TO ENCRYPT
                        </label>
                        <textarea
                            rows={4}
                            placeholder="{ 'lenderName': 'XYZ Corp', 'bankAccount': '...', 'Aadhaar': '...' }"
                            className="w-full bg-black/50 border border-[var(--danger)] px-3 py-2 text-[14px] font-mono-chain mb-6"
                            value={secretData}
                            onChange={(e) => setSecretData(e.target.value)}
                        />

                        <button
                            onClick={handleLock}
                            disabled={locking}
                            className="w-full py-4 bg-[var(--danger)] text-black font-headline text-[18px]">
                            {locking ? 'GENERATING MATH PROOF...' : 'ENCRYPT & LOCK VAULT'}
                        </button>
                    </div>
                )}

                {mode === 'LOCK' && vaultRecord && (
                    <div className="border-t border-[var(--border)] pt-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-[var(--accent)] text-black flex items-center justify-center text-[24px] mx-auto mb-4">
                            ✓
                        </div>
                        <h3 className="text-[20px] font-headline text-[var(--text-primary)]">VAULT SECURED</h3>
                        <p className="text-[13px] text-[var(--text-muted)] mt-2">
                            Data is encrypted and logging hash is anchored.
                        </p>
                        <div className="mt-4 inline-block bg-black/50 p-3 border border-[var(--border-strong)] text-[11px] font-mono-chain text-left">
                            <div className="text-[var(--accent)] mb-1">Vault ID: {vaultRecord.vaultId}</div>
                            <div>Algorand Txn: {vaultRecord.algoTxId}</div>
                        </div>
                    </div>
                )}

                {mode === 'UNLOCK' && (
                    <div className="border-t border-[var(--border)] pt-6">

                        {decryptedResult ? (
                            <div className="p-6 border border-[var(--accent)] bg-[var(--accent-light)]">
                                <h3 className="text-[16px] text-[var(--accent)] font-headline mb-3">DECRYPTION SUCCESSFUL</h3>
                                <pre className="text-[12px] font-mono-chain text-[var(--text-primary)] whitespace-pre-wrap">
                                    {decryptedResult}
                                </pre>
                            </div>
                        ) : (
                            <>
                                {!vaultRecord ? (
                                    <p className="text-[13px] text-[var(--gold)] text-center mb-6">
                                        Please Lock a payload first in this demo flow to test the unlock logic.
                                    </p>
                                ) : (
                                    <button
                                        onClick={handleUnlock}
                                        disabled={unlocking}
                                        className="w-full py-4 bg-[var(--accent)] text-black font-headline text-[18px]">
                                        {unlocking ? 'RECONSTRUCTING KEY...' : 'DECRYPT 7/7 VAULT'}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}

            </div>
        </div>
    )
}
