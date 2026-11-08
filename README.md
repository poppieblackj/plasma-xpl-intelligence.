# Plasma XPL Intelligence Dashboard

Institutional-style research dashboard for **Plasma (XPL)** with comparative views of **Arbitrum (ARB)**, **OP Mainnet (OP)** and **Sui (SUI)**.

**Live dashboard:** https://plasma-xpl-intelligence.vercel.app/

## Architecture

- `index.html`: responsive single-page dashboard with charts, comparisons, data-quality flags and CSV export.
- `api/metrics.js`: Vercel serverless endpoint; gathers TVL, stablecoin supply, DEX volume, fees, token prices and historical TVL using DeFiLlama and CoinGecko.
- `api/wallets.js`: reads native XPL balances and block number through Plasma JSON-RPC (`eth_getBalance`). **Wallet identity labels are research hypotheses, not independently verified ownership.**
- `vercel.json`: Vercel function and response-header configuration.

## Data sources and interpretation

| Metric | Upstream source | Important note |
|---|---|---|
| TVL, historical TVL | DeFiLlama | DeFi TVL is not stablecoin supply |
| Stablecoin supply | DeFiLlama Stablecoins | Stablecoin capitalization, not Visa adjusted transfer volume |
| DEX volumes / fees | DeFiLlama | Chain-level DEX activity is **not** total on-chain transfer volume |
| Token price, mcap, volume | CoinGecko / DeFiLlama fallback | Feed may lag; `null` indicates unavailable |
| Native XPL balances | Plasma JSON-RPC | Balances alone cannot establish CEX flow or token allocation ownership |
| Visa adjusted transactions, addresses, lending | **Not connected** | No values are fabricated |

The dashboard refreshes every **5 minutes while open** (1/5/15-minute options) and uses server-side caching. It is **not** a persistent 24/7 wallet transaction monitor. Every displayed value should be interpreted with its provider/source and timestamp.

## Deploy to Vercel

1. Connect this repository to a **new or existing** Vercel project.
2. Framework preset: **Other**; root directory: repository root.
3. No secrets required for the included public endpoints. Never commit API keys or personal credentials.
4. On every push to the production branch, Vercel can redeploy automatically **once Git integration is enabled**.

The live project was originally created via direct Vercel deployment. **GitHub–Vercel automatic deployment is a separate integration step**; adding code to this repository does not enable it by itself.

## Running / testing locally

Requires Node.js 22+ for the `fetch` API. For local Vercel functions use the Vercel CLI (`vercel dev`); opening `index.html` directly will not host `/api/*`.

## Research caveats

- This project is a research tool, **not trading advice**.
- Do not treat unverified wallet attribution as a confirmed team, investor or market-maker identity.
- Do not conflate DEX turnover, token exchange volume, stablecoin supply and Visa adjusted transfer volume.
- OP Mainnet refers to the single chain, not the entire OP Superchain.

*Last synchronized from the working Vercel dashboard: 2026-11-08.*
