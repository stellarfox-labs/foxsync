# Contributing to FoxSync

Thank you for contributing to FoxSync — the GitHub webhook service that bridges OSS contributions to on-chain Stellar reputation.

---

## Getting Started

```bash
git clone https://github.com/vaultfox-protocol/foxsync
cd foxsync
npm install
cp .env.example .env
# Fill in your values
npm run dev
```

Requirements: Node.js 20+, a Stellar testnet account, deployed reputation contract.

---

## How to Contribute

1. Browse [open issues](https://github.com/vaultfox-protocol/foxsync/issues)
2. Comment to express interest
3. Fork → branch → code → PR

### Code Standards
- TypeScript strict mode — no `any` types
- All functions must have JSDoc comments
- Tests required for new features (Vitest)
- Run `npm test` before submitting

---

## Issue Labels

| Label | Description |
|---|---|
| `good first issue` | Great for newcomers |
| `complexity:medium` | Standard Node.js features |
| `complexity:high` | Stellar/Soroban integration work |

---

## Questions?

Open a GitHub Discussion or comment on the issue.
