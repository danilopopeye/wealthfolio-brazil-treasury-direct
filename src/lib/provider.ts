import type { MarketDataProviderInfo } from '@wealthfolio/addon-sdk';
import { TD_PROVIDER_CODE, normalizeName } from './catalog';

/**
 * Display names the custom provider may be created with. "Tesouro Direto"
 * is the current convention; "Tesouro Direto Monitor" keeps installs made
 * before the rename working.
 */
export const TD_PROVIDER_NAMES = ['Tesouro Direto', 'Tesouro Direto Monitor'] as const;

/**
 * Finds our custom provider among the host's market data providers.
 * Matches the provider code (what the addon wires into securities) or any
 * of the known display names. The found provider's id is the code used for
 * wiring, so providers created under either name work.
 */
export function findTdProvider(
  providers: MarketDataProviderInfo[]
): MarketDataProviderInfo | undefined {
  const names = new Set(TD_PROVIDER_NAMES.map((name) => normalizeName(name)));
  return providers.find(
    (provider) =>
      provider.id === TD_PROVIDER_CODE || names.has(normalizeName(provider.name))
  );
}
