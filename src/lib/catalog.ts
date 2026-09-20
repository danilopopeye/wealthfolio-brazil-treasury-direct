import type { AddonContext, Asset } from '@wealthfolio/addon-sdk';
import type { TdSecurityMatch, TesouroQuote } from '../types';

/** Custom provider id created by the user in Settings → Market Data. */
export const TD_PROVIDER_CODE = 'tesouro-direto-monitor';

/** Builds the providerConfig that wires a security to our custom provider. */
export function buildProviderConfig(apiId: number, existing?: Record<string, unknown> | null) {
  const config: Record<string, unknown> = { ...(existing ?? {}) };
  config.preferred_provider = 'CUSTOM_SCRAPER';
  config.custom_provider_code = TD_PROVIDER_CODE;
  const overrides = { ...((config.overrides as Record<string, unknown>) ?? {}) };
  overrides[`CUSTOM:${TD_PROVIDER_CODE}`] = {
    type: 'equity_symbol',
    symbol: String(apiId),
  };
  config.overrides = overrides;
  return config;
}

/** Whether a security profile already maps to our custom provider. */
export function isWiredToProvider(profile: Asset | undefined | null): boolean {
  const config = profile?.providerConfig as Record<string, unknown> | null | undefined;
  if (!config) return false;
  const overrides = config.overrides as Record<string, unknown> | undefined;
  return Boolean(overrides?.[`CUSTOM:${TD_PROVIDER_CODE}`]);
}

/** Case/whitespace-insensitive name normalization for matching. */
export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Display/fallback name for an instrument (name may be an empty string). */
export function instrumentName(instrument: { name?: string | null; symbol: string }): string {
  return instrument.name?.trim() || instrument.symbol;
}

/**
 * Matches Tesouro Direto quotes against the user's security instruments by
 * normalized name. Bonds without a matching security are simply omitted.
 */
export function matchSecuritiesByQuotes(
  quotes: TesouroQuote[],
  instruments: Array<{ assetId: string; symbol: string; name?: string | null }>,
  wiredAssetIds: Set<string>
): TdSecurityMatch[] {
  const byName = new Map(instruments.map((i) => [normalizeName(instrumentName(i)), i]));
  const matches: TdSecurityMatch[] = [];

  for (const bond of quotes) {
    const instrument = byName.get(normalizeName(bond.name));
    if (!instrument) continue;
    matches.push({
      bond,
      assetId: instrument.assetId,
      symbol: instrument.symbol,
      securityName: instrumentName(instrument),
      wired: wiredAssetIds.has(instrument.assetId),
    });
  }

  return matches;
}

/**
 * Collects the distinct instruments the user currently holds, across all
 * accounts. Only securities with an open position are returned.
 */
export async function fetchHeldInstruments(
  ctx: AddonContext
): Promise<Array<{ assetId: string; symbol: string; name?: string | null }>> {
  const accounts = await ctx.api.accounts.getAll();
  const instruments = new Map<string, { assetId: string; symbol: string; name?: string | null }>();

  for (const account of accounts) {
    if (!account.isActive) continue;
    const holdings = await ctx.api.portfolio.getHoldings(account.id);
    for (const holding of holdings) {
      const instrument = holding.instrument;
      if (!instrument?.id) continue;
      if (!instruments.has(instrument.id)) {
        instruments.set(instrument.id, {
          assetId: instrument.id,
          symbol: instrument.symbol,
          name: instrument.name,
        });
      }
    }
  }

  return [...instruments.values()];
}

/**
 * Wires a security to the Tesouro Direto custom provider: preserves any
 * existing providerConfig, sets MARKET mode, and triggers a first sync.
 */
export async function connectSecurity(
  ctx: AddonContext,
  assetId: string,
  apiId: number
): Promise<void> {
  const profile = await ctx.api.assets.getProfile(assetId);
  await ctx.api.assets.updateProfile({
    id: assetId,
    // The backend requires `notes` (non-optional) even though the SDK marks
    // it optional — always forward the current value to avoid a 422.
    notes: profile?.notes ?? '',
    quoteMode: 'MARKET',
    providerConfig: buildProviderConfig(apiId, profile?.providerConfig),
  });
  await ctx.api.market.sync([assetId], false);
}
