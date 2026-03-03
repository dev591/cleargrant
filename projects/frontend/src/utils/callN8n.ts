// ClearGrant — n8n webhook caller
// Use this for EVERY AI webhook call. Never raw fetch to n8n.

export interface N8nResponse {
  result: Record<string, any>
  blockchain: {
    txId: string
    explorerUrl: string
    verified: boolean
  }
}

export async function callN8n(url: string, walletAddress: string, input: Record<string, any>): Promise<N8nResponse> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: walletAddress,
        walletAddress,
        input,
      }),
    })

    if (!res.ok) throw new Error(`n8n ${url} → ${res.status}`)

    const data = await res.json()

    // Normalize — n8n sometimes returns flat, sometimes nested
    return {
      result: data.result ?? data,
      blockchain: data.blockchain ?? {
        txId: data.txId ?? 'ALGO-PENDING',
        explorerUrl: data.explorerUrl ?? 'https://testnet.algoexplorer.io/tx/pending',
        verified: data.verified ?? false,
      },
    }
  } catch (error) {
    console.error('❌ N8N Webhook failed! We are no longer using mock responses. Error:', error)
    throw error // Force failure so the user knows the AI webhook is down or CORS failed
  }
}

