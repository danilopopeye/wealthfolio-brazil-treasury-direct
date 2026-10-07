import { useQuery } from '@tanstack/react-query';
import type { AddonContext } from '@wealthfolio/addon-sdk';
import { findTdProvider } from '../lib/provider';

/**
 * Whether the Tesouro Direto Monitor custom provider exists in the host.
 * The catalog's Conectar button writes provider config that only works
 * once this provider is created in Settings → Market Data.
 */
export function useTdProvider(ctx: AddonContext) {
  return useQuery({
    queryKey: ['tesouro-direto', 'provider'],
    queryFn: async () => findTdProvider(await ctx.api.market.getProviders()),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
