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

## Use as an app on iPhone and MacBook

The site is an installable **Progressive Web App (PWA)**: https://plasma-xpl-intelligence.vercel.app/

- **iPhone:** Open the website in **Safari** → **Share** → **Add to Home Screen** → **Add**. A Plasma icon appears on the iPhone Home Screen. The app launches in a standalone view.
- **MacBook (macOS Sonoma 14+):** Open in **Safari** → **File** → **Add to Dock**.
- **MacBook (Chrome/Edge):** Use the browser's **Install app** command if offered; otherwise use the website in a normal browser tab.
- **Mobile layout:** 5-item bottom navigation, touch-friendly controls, responsive cards, safe-area padding.
- **Refresh:** Market and on-chain feeds refresh while the app is open (1/5/15-minute selector). Not continuous background monitoring.
- **Offline behavior:** The app shell may remain accessible, but live market data does not refresh without an internet connection. The service worker deliberately does *not* cache on-chain API responses.
- **Brand:** Official Plasma assets proxied from https://www.plasma.org/brand via `/api/brand`; the app is an independent research project, not affiliated with Plasma.

## Deployment notes

The public site currently uses **direct Vercel deployment**. GitHub is source-of-truth storage; automatic GitHub-triggered deployment is **not yet connected** to the existing Vercel project.


## XPL Alert Center (Web Push)

The dashboard includes a push-alert center at **https://plasma-xpl-intelligence.vercel.app/#alerts**.

- Install the PWA from Safari to the iPhone Home Screen (iOS 16.4+), open it from its icon, and tap **Bật thông báo**. macOS browsers supporting standard Push API can also subscribe.
- Tap **Thử thông báo** to test the live Web Push subscription. Each device registers independently. Access to subscriptions is stored in a **private Vercel Blob store** and is never published to GitHub.
- Configure thresholds for XPL percentage movement between consecutive checks, trailing 24h price movement, 24h TVL change, and native XPL balance changes in research-watchlist addresses. Defaults: 2.5%, 8%, 12%, 1,000,000 XPL.
- **Crucial limitation:** wallet labels in this dashboard are unverified research candidates. Balance deltas are **not** evidence of CEX deposits or completed sales. No full-block chain-wide transfer indexer is connected.
- A GitHub Actions workflow (`.github/workflows/plasma-alerts.yml`) is configured to attempt checks every ~5 minutes on best effort. GitHub may delay or drop scheduled runs, and automatically disables scheduled workflows after 60 days of inactivity on public repositories.
- Vercel Hobby Cron runs one daily fallback at **00:00 UTC** (approximately 07:00 Vietnam time, without minute-level accuracy). Each run is authenticated; GitHub uses short-lived **OIDC** tokens, Vercel Cron uses `CRON_SECRET`. No secrets are stored in the GitHub repository.
- The dashboard's **Monitoring health** card displays the timestamp of the last successful check. **No recent check means no verified active monitoring.**
- Server environment keys: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`, plus the private Vercel Blob integration. Never commit credentials or raw device subscriptions.
- Push delivery requires user permission and depends on Apple/browser push services; it is not guaranteed as an instantaneous or 24/7 notification service.

### Endpoints

- `GET /api/alerts-subscribe`: non-secret VAPID public key and service readiness.
- `POST /api/alerts-subscribe`: device registration, preferences, revoke and one-minute-rate-limited push test, with same-origin checks.
- `GET /api/alerts-check`: monitor health summary (no private subscriptions).
- `POST /api/alerts-check`: protected monitor task; accepts only Vercel Cron secret or a verified GitHub OIDC workflow token.
- `GET /api/alerts-cron`: Vercel daily fallback, protected via `CRON_SECRET`.
