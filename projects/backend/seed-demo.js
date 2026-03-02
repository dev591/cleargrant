const fs = require('fs');

const demoData = {
  "grants": [
    {
      "_id": "grant-algokit-v2",
      "title": "AlgoKit Next-Gen Tooling",
      "description": "We are seeking a developer to build advanced scaffolding templates for AlgoKit v2, focusing on React and Python integration for seamless smart contract deployment.",
      "domain": "Technology",
      "totalAmount": 50000,
      "sponsorWallet": "KJRWDDAMLSXDBNGYALHIYU2O7MBG2PUP6UMFBB2AG6STNMMEK4ODRJ67OE",
      "deadline": "2026-10-31",
      "status": "FUNDED",
      "createdAt": "2026-03-01T10:00:00.000Z",
      "milestones": [
        {
          "index": 0,
          "title": "Architecture Design & Scaffolding",
          "description": "Deliver a comprehensive architecture document and the initial CLI scaffolding scripts for the React template.",
          "amount": 25000,
          "deadline": "2026-06-01"
        },
        {
          "index": 1,
          "title": "Final Release & Documentation",
          "description": "Deliver the final production-ready templates with 100% test coverage and full documentation.",
          "amount": 25000,
          "deadline": "2026-08-01"
        }
      ]
    },
    {
      "_id": "grant-defi-agg",
      "title": "DeFi Yield Aggregator Protocol",
      "description": "Looking for a team to build an open-source DeFi yield aggregator on Algorand that routes trades through Tinyman and Pact for optimal slippage.",
      "domain": "Finance",
      "totalAmount": 125000,
      "sponsorWallet": "KJRWDDAMLSXDBNGYALHIYU2O7MBG2PUP6UMFBB2AG6STNMMEK4ODRJ67OE",
      "deadline": "2026-12-01",
      "status": "OPEN",
      "createdAt": "2026-03-02T12:00:00.000Z",
      "milestones": [
        {
          "index": 0,
          "title": "Smart Contract Deployment",
          "description": "Deploy the core aggregator smart contracts on testnet.",
          "amount": 50000,
          "deadline": "2026-05-15"
        },
        {
          "index": 1,
          "title": "Frontend UI Integration",
          "description": "Complete the React frontend and integrate with Pera / Defly wallets.",
          "amount": 75000,
          "deadline": "2026-09-30"
        }
      ]
    }
  ],
  "applications": [
    {
      "_id": "app-algokit-approved",
      "grantId": "grant-algokit-v2",
      "applicantWallet": "DEMO7XKLMNPQRST2UVWXYZ3ABCDEFGHIJKLMNO",
      "projectTitle": "AlgoKit Turbo Templates",
      "description": "Our team has 3 years of experience building on Algorand. We intend to use Vite and Tailwind for the frontend scaffolding and PyTeal/Beaker for the backend smart contracts.",
      "teamSize": 2,
      "skills": ["React", "Python", "Algorand"],
      "githubUrl": "https://github.com/developer/algokit-turbo",
      "status": "APPROVED",
      "requestedAmount": 50000,
      "milestonesCompleted": 0,
      "totalMilestones": 2,
      "createdAt": "2026-03-02T14:30:00.000Z",
      "aiScore": 96,
      "aiRecommendation": "Highly recommended. Applicant shows deep understanding of the Algorand tech stack."
    }
  ],
  "transactions": [
    {
      "_id": "tx-seed-1",
      "grantId": "grant-algokit-v2",
      "type": "DEPOSIT",
      "amount": 50000,
      "fromWallet": "KJRWDDAMLSXDBNGYALHIYU2O7MBG2PUP6UMFBB2AG6STNMMEK4ODRJ67OE",
      "toWallet": "KJRWDDAMLSXDBNGYALHIYU2O7MBG2PUP6UMFBB2AG6STNMMEK4ODRJ67OE",
      "txId": "SEED-TX-101",
      "explorerUrl": "",
      "note": "Grant funded",
      "createdAt": "2026-03-01T10:05:00.000Z"
    }
  ],
  "votes": [],
  "users": [
    {
      "walletAddress": "DEMO7XKLMNPQRST2UVWXYZ3ABCDEFGHIJKLMNO",
      "reputationScore": 85,
      "reputationTier": "EXPERT",
      "completionRate": 100,
      "grantsCompleted": 2,
      "milestonesCompleted": 4,
      "totalMilestones": 4,
      "votingParticipation": 10,
      "totalReceived": 75000
    },
    {
      "walletAddress": "KJRWDDAMLSXDBNGYALHIYU2O7MBG2PUP6UMFBB2AG6STNMMEK4ODRJ67OE",
      "reputationScore": 100,
      "reputationTier": "SPONSOR",
      "completionRate": 0,
      "grantsCompleted": 0,
      "milestonesCompleted": 0,
      "totalMilestones": 0,
      "votingParticipation": 0,
      "totalReceived": 0
    }
  ],
  "escrows": []
};

fs.writeFileSync('db.json', JSON.stringify(demoData, null, 2));
console.log('✅ Success: Demo database seeded with realistic Hackathon data.');
