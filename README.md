# wealthfolio-tesouro-direto

Wealthfolio addon that tracks Tesouro Direto (Brazilian Treasury) bonds.

## What it does

- **Quotes page**: latest business-day rates and prices for every bond family
  (Selic, Prefixado, IPCA+, Educa+, Renda+...), grouped by type, with daily
  deltas and minimum investment.
- **Catalog wiring**: cross-references your existing securities (matched by
  name) and offers a one-click **Conectar** button that configures the security
  to auto-sync its price through the Tesouro Direto Monitor custom provider.

The price auto-sync itself is native Wealthfolio functionality (custom market
data provider) — the addon automates the tedious part: mapping each security
to the provider with the exact API id.

## One-time setup: the custom provider

The addon cannot create market data providers, so create it once in
**Settings → Market Data → Custom Providers → Add Provider**:

- Mode: **Dated series** (newest row = latest)
- Format: **JSON API**
- URL: `https://api.tesourodiretomonitor.com.br/api/titulos/{SYMBOL}/historico?dias=3650`
- Price path: `$.data.historico[*].puVenda`
- As of path: `$.data.historico[*].coletadoEm`
- Provider name: `Tesouro Direto Monitor` (code `tesouro-direto-monitor`)

## Connecting a security

1. Create the security (Securities → Add Security) using the bond's official
   name (e.g. `Tesouro IPCA+ 2032`) — the symbol can be anything you like.
2. Record your position (buy activity) so the security shows up in holdings.
3. Open the addon page and click **Conectar** on the bond's row.

The addon sets quote mode to Market, wires the provider config with the bond's
API id (case-proof numeric mapping), and triggers the first quote sync with
full history.

## Data source

Quotes come from [Tesouro Direto Monitor](https://tesourodiretomonitor.com.br)'s
public API (`api.tesourodiretomonitor.com.br`). The official Tesouro
Transparente CSV was ruled out: its ~14.5 MB full-history download exceeds the
host network broker's 2 MB response cap, and the server's HTTP Range support
returns 206 headers but the complete body anyway.

## Development

```bash
pnpm install
pnpm dev:server   # dev server on :3001 (Wealthfolio in addon dev mode discovers it)
pnpm build        # production build
pnpm type-check
pnpm bundle       # distributable zip in dist/
```
