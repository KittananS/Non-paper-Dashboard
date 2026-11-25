# Non-paper Performance Dashboard 2026

Executive analytics dashboard for tracking Non-paper portfolio sales, profitability, distribution expansion, NPD launch trajectories, and unit economics across all 8 product groups (`DACARE`, `DATISSUE`, `DAOS`, `DABATTERY`, `DASP`, `DANB`, `QUALITY`, `DALIFESTYLE`).

## Project Structure

```text
├── index.html                  # Lightweight semantic HTML entry & instant skeleton shell
├── css/
│   └── styles.css              # Precompiled static stylesheet (zero runtime Tailwind CDN)
├── image/                      # Optimized WebP + PNG fallback product group assets
└── js/
    ├── vendor-bridge.js        # Safe UMD global bridge for deferred vendor libraries
    ├── config.js               # Data source URLs, product group metadata, changelog
    ├── icons.js                # Inline SVG icon factory (zero external icon CDN)
    ├── utils.js                # Defensive parsers, bounded caches, timeout-safe CSV fetcher
    ├── dataEngine.js           # Pure single-pass KPI, forecast, GP, return & NPD calculations
    ├── app.js                  # Main Dashboard state controller & defensive bootstrapper
    └── components/
        ├── common.js           # ErrorBoundary, dropdowns, mobile drawer, shared UI primitives
        ├── overview.js         # Executive Overview KPIs, trends, acquisition & 6-pillar synthesis
        ├── portfolio.js        # Portfolio mix, authentic profitability, top performers & return health
        ├── distribution.js     # Top accounts, churn/drop-off radar, presence & white space matrix
        ├── innovation.js       # Dynamic 12-month NPD vitality index & M1–M12 launch trajectory
        └── volume.js           # Unit economics, ASP tracker, volume movers & verified GP/unit
```

## Key Capabilities (`v2.3.0`)

- **Stale-While-Revalidate Local Cache (`IndexedDB`)**: Hydrates sanitized datasets immediately on repeat visits (`<0.15s`) while silently refreshing live Google Sheets CSVs in the background, displaying a live `Synced` timestamp.
- **Granular Global Filtering**: Filter across `Product Group`, `Sub-Product`, `Channel`, `Sub-Channel` (e.g., `B2S`, `OFM`, `Lotus's`, `Shopee`, `Lazada`), `Month`, plus a 1-click **Exclude Returns (Gross Sales)** mode while keeping Return Diagnostics intact.
- **YTD Target Pacing Benchmark**: Seasonality-weighted (or linear fallback) expected YTD target marker and `Ahead / Behind YTD Pace` variance on the 2026 Target card.
- **Churn & Drop-off Radar**: Automatically flags `Lost in 2026`, `Dormant (≥3M)`, and `Sharp Drop (>30% YoY)` accounts with 1-click Win-Back List copy and CSV export.
- **1-Click CSV Export (UTF-8 BOM)**: Every analytical table across all 5 tabs exports clean, formula-injection-safe `.csv` files that render Thai characters properly in Microsoft Excel.
- **Shareable View Links & Executive Print / PDF Mode**: URL query parameters (`?tab=...&groups=...&ch=...&subCh=...`) auto-sync via `Share View`, and `Print / PDF` formats a clean A4 landscape executive report.

## Local Preview

Serve the static files using any HTTP server:

```bash
python3 -m http.server 8080
```