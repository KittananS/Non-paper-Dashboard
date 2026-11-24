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
        ├── distribution.js     # Top accounts, product presence & white space gap matrix
        ├── innovation.js       # Dynamic 12-month NPD vitality index & M1–M12 launch trajectory
        └── volume.js           # Unit economics, ASP tracker, volume movers & verified GP/unit
```

## Local Preview

Serve the static files using any HTTP server:

```bash
python3 -m http.server 8080
```