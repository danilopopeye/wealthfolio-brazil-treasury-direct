# Changelog

All notable changes to the tesouro-direto addon will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.3] - 2026-10-07

### Fixed
- False "sem cotações recentes" warning: the quote history endpoint returns
  newest-first, and the staleness check was reading the oldest quote as the
  latest. The newest quote is now computed explicitly regardless of order
- The provider code is learned only from quotes inside the freshness window,
  ignoring stale history left by renamed providers

## [1.2.2] - 2026-10-07

### Fixed
- Provider guard no longer uses market.getProviders(): it only lists built-in
  providers, so the warning showed even with the custom provider present.
  The guard now warns only when a wired security has no recent quotes
  (missing or older than six days)
- The provider code used for wiring is learned from the dataSource of quotes
  that are actually syncing, falling back to the documented
  tesouro-direto code, so installs running the legacy
  tesouro-direto-monitor code keep connecting correctly

## [1.2.1] - 2026-09-20

### Changed
- Provider renamed to just "Tesouro Direto" in the docs and setup guidance;
  providers created under the legacy "Tesouro Direto Monitor" name keep
  working

### Fixed
- The wiring now uses the provider code discovered from
  market.getProviders() instead of a hardcoded code, so installs where the
  provider auto-generates a different code connect correctly

## [1.2.0] - 2026-09-20

### Added
- Provider guard on the quotes page: when the Tesouro Direto Monitor custom
  provider is missing, the page shows a warning with the setup steps instead
  of letting wired securities fail their price sync silently

## [1.1.1] - 2026-09-20

### Fixed
- Documented that the custom provider needs Both sources: older host versions
  require a latest source and do not fall back to the historical series
  ("No 'latest' source" sync error)
- Documented that the provider must be named exactly "Tesouro Direto Monitor"
  (the addon references its code) and that preferred provider and symbol
  override must be set together when wiring a security manually
- Historical URL uses `dias=0`, which returns the full available series

## [1.1.0] - 2026-09-20

### Added
- Quotes page with the latest business-day rates and prices for every bond
  family, grouped by type, with daily deltas and minimum investment
- Catalog that matches the user's securities by name and wires them to the
  Tesouro Direto Monitor custom provider with one click
- Vitest suite for the parsing, name matching and provider config logic
- Forgejo CI (lint, test, build) and release workflow that publishes the
  addon zip on version tags

### Changed
- Data source switched from the Tesouro Transparente CSV to the Tesouro
  Direto Monitor JSON API (the official CSV exceeds the host network
  broker's 2 MB response cap and its server ignores HTTP Range in practice)

### Fixed
- Vite config no longer forces watch mode on production builds

## [1.0.0] - 2026-09-19

### Added
- Initial addon structure and setup

### Security

## [1.0.0] - {{currentDate}}

### Added
- Initial release of tesouro-direto addon
- Basic addon functionality and core features
- Integration with Wealthfolio addon SDK v3.8.0
- Sidebar navigation integration for easy access
- Responsive design for all screen sizes

### Features
- Track the values of Brazil's Tesouro Direto
- User-friendly interface
- Compatible with Wealthfolio platform

### Compatibility
- Requires Wealthfolio 3.8.0 or newer
