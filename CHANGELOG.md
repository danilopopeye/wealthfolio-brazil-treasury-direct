# Changelog

All notable changes to the tesouro-direto addon will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
