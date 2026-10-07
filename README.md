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
**Settings → Market Data → Custom Providers → Add Provider** using the
**Both** mode (a dated series plus a latest endpoint — older host versions
require a `latest` source and do not fall back to the series):

**Historical source** (dated series):

- Format: **JSON API**
- URL: `https://api.tesourodiretomonitor.com.br/api/titulos/{SYMBOL}/historico?dias=0`
  (`dias=0` returns the full available series)
- Price path: `$.data.historico[*].puVenda`
- As of path: `$.data.historico[*].coletadoEm`

**Latest source** (current-day quotes):

- Format: **JSON API**
- URL: `https://api.tesourodiretomonitor.com.br/api/taxas/atuais`
- Price path: `$.data[?(@.id == {SYMBOL})].puVenda` (no quotes: the id is a
  JSON number)
- As of path: `$.data[?(@.id == {SYMBOL})].dataAtualizacao`

Provider name: `Tesouro Direto Monitor` — **keep this exact name**: the addon
references the provider by its auto-generated code `tesouro-direto-monitor`,
and a different name produces a different code, breaking the wiring.

## Connecting a security

1. Create the security (Securities → Add Security) using the bond's official
   name (e.g. `Tesouro IPCA+ 2032`) — the symbol can be anything you like.
2. Record your position (buy activity) so the security shows up in holdings.
3. Open the addon page and click **Conectar** on the bond's row.

The addon sets quote mode to Market, wires the provider config with the bond's
API id (case-proof numeric mapping), and triggers the first quote sync with
full history.

## Troubleshooting

**"No 'latest' source" when syncing** — the provider only has a historical
source. Older host versions have a quick price-refresh flow that requires a
`latest` source and does not fall back to the series. Edit the provider and
add the Latest endpoint (see the Both-mode setup above).

**Override configured but prices never arrive** — the three provider fields
are a package: Preferred Provider (`Tesouro Direto Monitor`) **and** the
symbol mapping override (the numeric API id) must both be set on the
security. Setting only the override in the edit sheet leaves the security
unassigned. The addon's Conectar button always sets all of them together.

**Wired but sync fails with a provider error** — check the provider code.
The addon hardcodes `tesouro-direto-monitor`; if the provider was created
under a different name (hence a different code), the lookup fails. Rename
the provider or re-create it with the exact name above.

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
