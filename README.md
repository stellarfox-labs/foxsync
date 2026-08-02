# GrantFox Webhook Sync

A Node.js service that listens to GitHub webhook events and automatically syncs OSS contributions to the GrantFox ecosystem — awarding FoxPoints on-chain via the Soroban Reputation contract.

---

## What It Does

```
GitHub Event (PR merged / Issue closed)
           │
           ▼
   HMAC Signature Verification
           │
           ▼
   Extract ContributionEvent
           │
           ▼
   Contributor Stellar Address Lookup
           │
           ▼
   Calculate FoxPoints (based on labels)
           │
      ┌────┴────┐
      ▼         ▼
 On-chain   GrantFox
 Reputation Platform
 Contract   API Sync
 (Stellar)  (optional)
```

---

## FoxPoints Rules

| Label | Points |
|---|---|
| `complexity:critical` | 150 |
| `complexity:high` | 80 |
| `complexity:medium` | 40 |
| `complexity:low` | 15 |
| `type:feature` | 60 |
| `type:bug` | 30 |
| `type:refactor` | 25 |
| `type:test` | 20 |
| `type:docs` | 10 |
| *(no match)* | 10 |

The first matching label wins. Labels are case-insensitive.

---

## Architecture

```
src/
├── config.ts                    # Zod-validated environment config
├── index.ts                     # Express server entry point
├── types.ts                     # Domain types
├── github/
│   ├── webhookHandler.ts        # @octokit/webhooks event handling
│   ├── contributorRegistry.ts  # GitHub username → Stellar address map
│   └── pointsCalculator.ts     # Label → FoxPoints rules
├── stellar/
│   └── reputationClient.ts     # Soroban reputation contract caller
├── services/
│   ├── contributionProcessor.ts # Main pipeline orchestrator
│   └── grantfoxSync.ts          # GrantFox platform API sync
├── routes/
│   ├── webhook.ts               # POST /webhook
│   └── registry.ts              # CRUD /contributors
└── tests/
    ├── pointsCalculator.test.ts
    ├── contributorRegistry.test.ts
    └── contributionProcessor.test.ts
```

---

## Setup

### 1. Install dependencies

```bash
cd grantfox-webhook-sync
npm install
```

### Docker (recommended for production)

```bash
cp .env.example .env
# Fill in your values

# Start with Docker
docker compose up --build

# Run in background
docker compose up -d --build

# View logs
docker compose logs -f foxsync

# Stop
docker compose down
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in your values:
# - GITHUB_WEBHOOK_SECRET  (from GitHub repo webhook settings)
# - GITHUB_TOKEN           (GitHub PAT for API access)
# - STELLAR_OPERATOR_SECRET (keypair that calls the reputation contract)
# - REPUTATION_CONTRACT_ID  (from soroban-milestone-escrow deploy)
```

### 3. Run in development

```bash
npm run dev
```

### 4. Expose locally with ngrok (for GitHub webhook testing)

```bash
ngrok http 3001
# Copy the HTTPS URL and set it as your GitHub webhook URL
```

### 5. Register a contributor

```bash
curl -X POST http://localhost:3001/contributors \
  -H "Content-Type: application/json" \
  -d '{"github_username": "alice", "stellar_address": "G..."}'
```

---

## GitHub Webhook Setup

1. Go to your GitHub repo → Settings → Webhooks → Add webhook
2. Payload URL: `https://your-domain.com/webhook`
3. Content type: `application/json`
4. Secret: same as `GITHUB_WEBHOOK_SECRET` in your `.env`
5. Events: select **Pull requests** and **Issues**

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/webhook` | GitHub webhook receiver |
| `GET` | `/health` | Health check |
| `POST` | `/contributors` | Register contributor |
| `GET` | `/contributors/:username` | Look up contributor |
| `GET` | `/contributors` | List all contributors |

---

## Running Tests

```bash
npm test
```

---

## Deploying to Production

The service is a standard Node.js HTTP server. Deploy to:
- Railway / Render / Fly.io (zero-config)
- Docker container (`node:20-alpine`)
- Any VPS with Node.js 20+

**Never commit your `.env` file.** Use platform secrets for:
- `STELLAR_OPERATOR_SECRET`
- `GITHUB_WEBHOOK_SECRET`
- `GRANTFOX_API_KEY`

---

## Pair With

This service is designed to work with the
[soroban-milestone-escrow](../soroban-milestone-escrow) contracts.
Deploy those first, then fill in the contract IDs here.

---

## License

Apache 2.0

---

## Organization

**[github.com/vaultfox-protocol](https://github.com/vaultfox-protocol)**
