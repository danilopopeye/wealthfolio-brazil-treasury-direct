import type { MarketDataProviderInfo } from '@wealthfolio/addon-sdk';
import { TD_PROVIDER_CODE, normalizeName } from './catalog';

/** Display name the custom provider must be created with (see README). */
const TD_PROVIDER_NAME = 'Tesouro Direto Monitor';

/**
 * Finds our custom provider among the host's market data providers.
 * Matches the provider code (what the addon wires into securities) and,
 * as a courtesy, the expected display name.
 */
export function findTdProvider(
  providers: MarketDataProviderInfo[]
): MarketDataProviderInfo | undefined {
  return providers.find(
    (provider) =>
      provider.id === TD_PROVIDER_CODE ||
      normalizeName(provider.name) === normalizeName(TD_PROVIDER_NAME)
  );
}
