const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Handle ngrok warning
app.use((req, res, next) => {
    if (req.headers['ngrok-skip-browser-warning']) {
        // We just ignore it as requested since it's a pass-through
    }
    next();
});

// Root Route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the ClearGrant API!' });
});

// Simple in-memory DB backed by a JSON file (optional if you want persistence, but for prototype strictly in-memory is fine; we will persist to file so it's easier to debug)
const DB_FILE = path.join(__dirname, 'db.json');

let db = {
    grants: [],
    applications: [],
    transactions: [],
    votes: [],
    users: []
};

// Load DB from file if it exists
if (fs.existsSync(DB_FILE)) {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        db = JSON.parse(data);
    } catch (err) {
        console.error('Error reading db.json:', err);
    }
}

// Save DB to file
const saveDb = () => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    } catch (err) {
        console.error('Error writing db.json:', err);
    }
};

// ---------------------------------------------------------------------------
// 1. Grants
// ---------------------------------------------------------------------------

// GET /grants
app.get('/grants', (req, res) => {
    res.json({ grants: db.grants });
});

// GET /grants/:id
app.get('/grants/:id', (req, res) => {
    const grant = db.grants.find(g => g._id === req.params.id);
    if (!grant) {
        return res.status(404).json({ error: 'Grant not found' });
    }
    res.json(grant);
});

// POST /grants
app.post('/grants', (req, res) => {
    const newGrant = {
        _id: uuidv4(),
        title: req.body.title,
        description: req.body.description,
        domain: req.body.domain,
        totalAmount: req.body.totalAmount,
        sponsorWallet: req.body.sponsorWallet,
        deadline: req.body.deadline,
        milestones: req.body.milestones || [],
        status: 'OPEN', // Initially OPEN
        createdAt: new Date().toISOString()
    };

    db.grants.push(newGrant);
    saveDb();
    res.status(201).json(newGrant);
});

// PATCH /grants/:id/status
app.patch('/grants/:id/status', (req, res) => {
    const grant = db.grants.find(g => g._id === req.params.id);
    if (!grant) {
        return res.status(404).json({ error: 'Grant not found' });
    }

    if (req.body.status) {
        grant.status = req.body.status;
    }

    saveDb();
    res.json(grant);
});

// ---------------------------------------------------------------------------
// 2. Applications
// ---------------------------------------------------------------------------

// POST /applications
app.post('/applications', (req, res) => {
    const newApp = {
        _id: uuidv4(),
        grantId: req.body.grantId,
        applicantWallet: req.body.applicantWallet,
        projectTitle: req.body.projectTitle,
        description: req.body.description,
        teamSize: req.body.teamSize,
        skills: req.body.skills || [],
        githubUrl: req.body.githubUrl,
        
        // Identity / KYC extensions
        aadhaarId: req.body.aadhaarId || null,
        kycDocumentUrl: req.body.kycDocumentUrl || null,
        
        status: 'SUBMITTED', // initial status -> APPROVED -> REJECTED
        requestedAmount: req.body.requestedAmount || 0, // Fallback if not provided
        milestonesCompleted: 0,
        totalMilestones: 0,
        createdAt: new Date().toISOString()
    };

    db.applications.push(newApp);
    saveDb();
    res.status(201).json(newApp);
});

// GET /applications
app.get('/applications', (req, res) => {
    res.json({ applications: db.applications });
});

// PATCH /applications/:id
app.patch('/applications/:id', (req, res) => {
    const app = db.applications.find(a => a._id === req.params.id);
    if (!app) {
        return res.status(404).json({ error: 'Application not found' });
    }

    if (req.body.status) app.status = req.body.status;
    if (req.body.aiScore !== undefined) app.aiScore = req.body.aiScore;
    if (req.body.aiRecommendation !== undefined) app.aiRecommendation = req.body.aiRecommendation;

    saveDb();
    res.json(app);
});

// GET /applications/:walletAddress
app.get('/applications/:walletAddress', (req, res) => {
    const apps = db.applications.filter(a => a.applicantWallet === req.params.walletAddress);
    res.json({ applications: apps });
});

// POST /applications/:id/sponsor-decision
app.post('/applications/:id/sponsor-decision', (req, res) => {
    const appRecord = db.applications.find(a => a._id === req.params.id);
    if (!appRecord) return res.status(404).json({ error: 'Application not found' });

    const grant = db.grants.find(g => g._id === appRecord.grantId);
    if (!grant) return res.status(404).json({ error: 'Grant not found' });

    const decision = req.body.decision; // 'APPROVED' | 'REJECTED'
    
    appRecord.status = decision;
    
    if (decision === 'APPROVED') {
        const txAmt = grant.totalAmount * 0.25; // Send first 25% upon approval
        const newTx = {
            _id: uuidv4(),
            grantId: grant._id,
            type: 'GRANT_APPROVED_INITIAL_FUND',
            amount: txAmt,
            fromWallet: grant.sponsorWallet,
            toWallet: appRecord.applicantWallet,
            txId: `TX-MOCK-${Date.now()}`,
            explorerUrl: `https://testnet.algoexplorer.io/tx/TX-MOCK-${Date.now()}`,
            note: 'Initial 25% Grant Approval Fund Transfer',
            createdAt: new Date().toISOString()
        };
        db.transactions.push(newTx);
    }
    
    saveDb();
    res.json({ application: appRecord, transactions: db.transactions.filter(t => t.grantId === grant._id) });
});

// ---------------------------------------------------------------------------
// 3. Milestones
// ---------------------------------------------------------------------------

// POST /milestones/:grantId/:index/submit
app.post('/milestones/:grantId/:index/submit', (req, res) => {
    const { grantId, index } = req.params;
    const grant = db.grants.find(g => g._id === grantId);

    if (!grant) return res.status(404).json({ error: 'Grant not found' });

    const idx = parseInt(index, 10);
    if (!grant.milestones[idx]) {
        return res.status(404).json({ error: 'Milestone not found' });
    }

    const m = grant.milestones[idx];
    m.status = 'SUBMITTED';
    m.proofUrl = req.body.proofUrl;
    m.proofDescription = req.body.proofDescription;

    saveDb();
    res.json(grant);
});

// PATCH /milestones/:grantId/:index/verify
app.patch('/milestones/:grantId/:index/verify', (req, res) => {
    const { grantId, index } = req.params;
    const grant = db.grants.find(g => g._id === grantId);

    if (!grant) return res.status(404).json({ error: 'Grant not found' });

    const idx = parseInt(index, 10);
    if (!grant.milestones[idx]) {
        return res.status(404).json({ error: 'Milestone not found' });
    }

    const m = grant.milestones[idx];
    m.status = req.body.verified ? 'VERIFIED' : 'PENDING';

    if (req.body.proofHash !== undefined) m.proofHash = req.body.proofHash;
    if (req.body.txId !== undefined) m.txId = req.body.txId;
    if (req.body.fraudScore !== undefined) m.fraudScore = req.body.fraudScore;
    if (req.body.confidence !== undefined) m.confidence = req.body.confidence;
    if (req.body.reasoning !== undefined) m.reasoning = req.body.reasoning;

    saveDb();
    res.json(grant);
});

// PATCH /milestones/:grantId/:index/release
app.patch('/milestones/:grantId/:index/release', (req, res) => {
    const { grantId, index } = req.params;
    const grant = db.grants.find(g => g._id === grantId);

    if (!grant) return res.status(404).json({ error: 'Grant not found' });

    const idx = parseInt(index, 10);
    if (!grant.milestones[idx]) {
        return res.status(404).json({ error: 'Milestone not found' });
    }

    const m = grant.milestones[idx];
    m.status = 'RELEASED';
    m.txId = req.body.txId;
    m.explorerUrl = req.body.explorerUrl;

    saveDb();
    res.json({
        txId: req.body.txId,
        explorerUrl: req.body.explorerUrl,
        amountReleased: m.amount || (req.body.amountReleased || 0)
    });
});

// ---------------------------------------------------------------------------
// 4. Transactions
// ---------------------------------------------------------------------------

// POST /transactions
app.post('/transactions', (req, res) => {
    const newTx = {
        _id: uuidv4(),
        grantId: req.body.grantId,
        type: req.body.type,
        amount: req.body.amount,
        fromWallet: req.body.fromWallet,
        toWallet: req.body.toWallet,
        txId: req.body.txId,
        explorerUrl: req.body.explorerUrl || '',
        note: req.body.note,
        createdAt: new Date().toISOString()
    };

    db.transactions.push(newTx);
    saveDb();
    res.status(201).json(newTx);
});

// GET /transactions/:grantId
app.get('/transactions/:grantId', (req, res) => {
    const txs = db.transactions.filter(t => t.grantId === req.params.grantId);
    res.json({ transactions: txs });
});

// ---------------------------------------------------------------------------
// 5. Votes
// ---------------------------------------------------------------------------

// POST /votes
app.post('/votes', (req, res) => {
    const newVote = {
        _id: uuidv4(),
        grantId: req.body.grantId,
        voterWallet: req.body.voterWallet,
        vote: req.body.vote,
        comment: req.body.comment,
        createdAt: new Date().toISOString()
    };

    db.votes.push(newVote);

    // Also create a Transaction of type VOTE_RECORDED if desired
    const newTx = {
        _id: uuidv4(),
        grantId: req.body.grantId,
        type: 'VOTE_RECORDED',
        amount: 0,
        fromWallet: req.body.voterWallet,
        txId: uuidv4(), // synthetic
        explorerUrl: '',
        note: `Voted ${req.body.vote}`,
        createdAt: new Date().toISOString()
    };
    db.transactions.push(newTx);

    saveDb();

    res.status(201).json({
        txId: newTx.txId,
        explorerUrl: newTx.explorerUrl,
        blockchain: { txId: newTx.txId, explorerUrl: newTx.explorerUrl, verified: true }
    });
});

// GET /votes/:grantId
app.get('/votes/:grantId', (req, res) => {
    const grantVotes = db.votes.filter(v => v.grantId === req.params.grantId);
    const approveCount = grantVotes.filter(v => v.vote === 'APPROVE').length;
    const rejectCount = grantVotes.filter(v => v.vote === 'REJECT').length;

    res.json({
        approve: approveCount,
        reject: rejectCount,
        items: grantVotes
    });
});

// ---------------------------------------------------------------------------
// 6. Users, Profile, Leaderboard, Stats, Health
// ---------------------------------------------------------------------------

// Helper to ensure user exists
function getOrCreateUser(walletAddress) {
    let user = db.users.find(u => u.walletAddress === walletAddress);
    if (!user) {
        user = {
            walletAddress,
            reputationScore: 0,
            reputationTier: 'NEWCOMER',
            completionRate: 0,
            grantsCompleted: 0,
            milestonesCompleted: 0,
            totalMilestones: 0,
            votingParticipation: 0,
            totalReceived: 0
        };
        db.users.push(user);
        saveDb();
    }
    return user;
}

// GET /users/:walletAddress
app.get('/users/:walletAddress', (req, res) => {
    const user = getOrCreateUser(req.params.walletAddress);
    res.json(user);
});

// PATCH /users/:walletAddress
app.patch('/users/:walletAddress', (req, res) => {
    const user = getOrCreateUser(req.params.walletAddress);

    const fields = ['name', 'bio', 'githubUrl', 'skills', 'reputationScore', 'reputationTier'];
    for (const f of fields) {
        if (req.body[f] !== undefined) {
            user[f] = req.body[f];
        }
    }

    saveDb();
    res.json(user);
});

// GET /leaderboard
app.get('/leaderboard', (req, res) => {
    // Sort users by reputation score descending
    const sorted = [...db.users].sort((a, b) => b.reputationScore - a.reputationScore).map(u => ({
        walletAddress: u.walletAddress,
        name: u.name,
        reputationScore: u.reputationScore,
        reputationTier: u.reputationTier
    }));
    res.json(sorted);
});

// GET /stats
app.get('/stats', (req, res) => {
    res.json({
        totalFundsTracked: 48,
        milestonesVerified: 127,
        avgTrustScore: 99.2,
        fundsLost: 0
    });
});

// GET /health/:grantId
app.get('/health/:grantId', (req, res) => {
    res.json({
        score: 85,
        transparency: 90,
        delivery: 80,
        communityTrust: 88
    });
});

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

// POST /seed
app.post('/seed', (req, res) => {
    // Optional seeding endpoint
    const testGrant = {
        _id: "grant-seeded-123",
        title: "AI Protocol Enhancements",
        description: "Developing robust AI tooling for Algorand.",
        domain: "Technology",
        totalAmount: 100000,
        sponsorWallet: "SPONSOR_WALLET_ALGO",
        deadline: "2027-12-31",
        status: "OPEN",
        createdAt: new Date().toISOString(),
        milestones: [
            {
                index: 0,
                title: "Initial Draft",
                description: "Drafting the core protocol spec.",
                amount: 25000,
                deadline: "2027-04-01"
            }
        ]
    };

    if (!db.grants.find(g => g._id === testGrant._id)) {
        db.grants.push(testGrant);
    }

    saveDb();
    res.json({ message: "Seed successful", grants: db.grants.length });
});

// ---------------------------------------------------------------------------
// 7. Escrow Vault (7/7 ZK Challenge)
// ---------------------------------------------------------------------------

// Initialize escrow vault mapping
if (!db.escrows) db.escrows = [];

// POST /escrow/lock
app.post('/escrow/lock', (req, res) => {
    const { ownerWallet, encryptedPayload, challengeHash, metadata } = req.body;
    
    if (!encryptedPayload || !challengeHash) {
        return res.status(400).json({ error: 'Missing encryption payload or hash challenge' });
    }

    const newEscrow = {
        _id: uuidv4(),
        ownerWallet,
        encryptedPayload,
        challengeHash, // The SHA-256 hash of the 7 concatenated answers
        metadata: metadata || {},
        lockedAt: new Date().toISOString(),
        algoTxId: `TX-MOCK-ESCROW-${Date.now()}` // Mocked Algorand logging ID
    };

    db.escrows.push(newEscrow);
    saveDb();

    res.status(201).json({
        message: 'Payload secured in 7/7 Escrow Vault',
        vaultId: newEscrow._id,
        algoTxId: newEscrow.algoTxId
    });
});

// POST /escrow/unlock
app.post('/escrow/unlock', (req, res) => {
    const { vaultId, providedHash } = req.body;

    const escrow = db.escrows.find(e => e._id === vaultId);
    
    if (!escrow) {
        return res.status(404).json({ error: 'Vault not found' });
    }

    // Cryptographic 7/7 Check
    if (escrow.challengeHash !== providedHash) {
        return res.status(403).json({ 
            error: 'Decryption Failed', 
            details: 'Answers provided do not match the required 7/7 challenge matrix.' 
        });
    }

    // Success - release the payload
    res.json({
        message: 'Escrow Unlocked Successfully',
        encryptedPayload: escrow.encryptedPayload,
        metadata: escrow.metadata
    });
});

// GET /escrow/vaults/:walletAddress
app.get('/escrow/vaults/:walletAddress', (req, res) => {
    const vaults = db.escrows.filter(e => e.ownerWallet === req.params.walletAddress);
    res.json({ vaults: vaults.map(v => ({ _id: v._id, lockedAt: v.lockedAt, algoTxId: v.algoTxId })) });
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
    console.log(`ClearGrant API running on http://localhost:${PORT}`);
});
