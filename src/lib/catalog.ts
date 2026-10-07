import type { AddonContext, Asset } from '@wealthfolio/addon-sdk';
import type { TdSecurityMatch, TesouroQuote } from '../types';

/**
 * Custom provider code derived from the documented provider name
 * ("Tesouro Direto" → code "tesouro-direto"). Used as the default when no
 * live code can be learned from existing quotes.
 */
export const TD_PROVIDER_CODE = 'tesouro-direto';

/**
 * Code from installs made before the provider rename; still accepted when
 * reading wiring status and when learning the live code from quotes.
 */
export const LEGACY_PROVIDER_CODE = 'tesouro-direto-monitor';

/** Extracts the custom provider code from a quote dataSource. */
export function providerCodeFromDataSource(dataSource: string): string | undefined {
  return /^CUSTOM_SCRAPER:(.+)$/.exec(dataSource)?.[1];
}

/**
 * Resolves the provider code to wire new securities with: prefer the code
 * actually delivering quotes today (learned from any quote's dataSource),
 * falling back to the documented default.
 */
export function resolveProviderCode(dataSources: string[]): string {
  for (const source of dataSources) {
    const code = providerCodeFromDataSource(source);
    if (code) return code;
  }
  return TD_PROVIDER_CODE;
}

/** How recent a quote must be to count as fresh (business days + long weekend). */
export const QUOTE_FRESHNESS_MS = 6 * 24 * 60 * 60 * 1000;

/**
 * The newest quote timestamp of a collection, regardless of ordering
 * (the history endpoint returns newest-first).
 */
export function latestQuoteTimestamp(quotes: Array<{ timestamp: string }>): string | undefined {
  return quotes.reduce<string | undefined>(
    (latest, quote) => (latest === undefined || quote.timestamp > latest ? quote.timestamp : latest),
    undefined
  );
}

/**
 * Data sources of quotes inside the freshness window — the codes delivering
 * prices *today*, ignoring stale history from renamed providers.
 */
export function recentQuoteDataSources(
  quotes: Array<{ timestamp: string; dataSource: string }>,
  now = new Date()
): string[] {
  return quotes
    .filter((quote) => {
      const ts = new Date(quote.timestamp).getTime();
      return !Number.isNaN(ts) && now.getTime() - ts <= QUOTE_FRESHNESS_MS;
    })
    .map((quote) => quote.dataSource);
}

/**
 * A wired security is stale when it has no quotes at all or its newest quote
 * is older than a long weekend (Tesouro Direto publishes on business days).
 */
export function isQuoteStale(latestTimestamp: string | undefined, now = new Date()): boolean {
  if (!latestTimestamp) return true;
  const latest = new Date(latestTimestamp).getTime();
  if (Number.isNaN(latest)) return true;
  return now.getTime() - latest > QUOTE_FRESHNESS_MS;
}

/** Builds the providerConfig that wires a security to our custom provider. */
export function buildProviderConfig(
  providerCode: string,
  apiId: number,
  existing?: Record<string, unknown> | null
) {
  const config: Record<string, unknown> = { ...(existing ?? {}) };
  config.preferred_provider = 'CUSTOM_SCRAPER';
  config.custom_provider_code = providerCode;
  const overrides = { ...((config.overrides as Record<string, unknown>) ?? {}) };
  overrides[`CUSTOM:${providerCode}`] = {
    type: 'equity_symbol',
    symbol: String(apiId),
  };
  config.overrides = overrides;
  return config;
}

/** Whether a security profile already maps to one of our provider codes. */
export function isWiredToProvider(
  profile: Asset | undefined | null,
  providerCodes: string[]
): boolean {
  const config = profile?.providerConfig as Record<string, unknown> | null | undefined;
  if (!config) return false;
  const overrides = config.overrides as Record<string, unknown> | undefined;
  return providerCodes.some((code) => Boolean(overrides?.[`CUSTOM:${code}`]));
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
  apiId: number,
  providerCode: string
): Promise<void> {
  const profile = await ctx.api.assets.getProfile(assetId);
  await ctx.api.assets.updateProfile({
    id: assetId,
    // The backend requires `notes` (non-optional) even though the SDK marks
    // it optional — always forward the current value to avoid a 422.
    notes: profile?.notes ?? '',
    quoteMode: 'MARKET',
    providerConfig: buildProviderConfig(providerCode, apiId, profile?.providerConfig),
  });
  await ctx.api.market.sync([assetId], false);
}
