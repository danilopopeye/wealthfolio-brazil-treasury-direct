import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddonContext, Quote } from '@wealthfolio/addon-sdk';
import type { TdSecurityMatch } from '../types';
import {
  connectSecurity,
  fetchHeldInstruments,
  isQuoteStale,
  isWiredToProvider,
  latestQuoteTimestamp,
  matchSecuritiesByQuotes,
  recentQuoteDataSources,
  resolveProviderCode,
  LEGACY_PROVIDER_CODE,
  TD_PROVIDER_CODE,
} from '../lib/catalog';
import { useTesouroQuotes } from './useTesouroQuotes';

/**
 * Catalog state: current quotes cross-referenced with the user's held
 * securities (matched by name), including wiring status, sync health and
 * the connect mutation that links a security to the Tesouro Direto
 * custom provider.
 *
 * The provider code used for wiring is learned from the dataSource of
 * quotes that are actually syncing (e.g. "CUSTOM_SCRAPER:tesouro-direto"),
 * falling back to the documented default — custom providers are not listed
 * by market.getProviders(), so live quotes are the source of truth.
 */
export function useTdCatalog(ctx: AddonContext) {
  const queryClient = useQueryClient();
  const quotesQuery = useTesouroQuotes(ctx);

  const instrumentsQuery = useQuery({
    queryKey: ['tesouro-direto', 'instruments'],
    queryFn: () => fetchHeldInstruments(ctx),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const instruments = instrumentsQuery.data ?? [];

  // Matched securities (name join) need profiles (wiring status) and their
  // quote history (sync health + live provider code).
  const matches = quotesQuery.data
    ? matchSecuritiesByQuotes(quotesQuery.data.quotes, instruments, new Set())
    : [];

  const stateQuery = useQuery({
    queryKey: ['tesouro-direto', 'state', matches.map((m) => m.assetId)],
    queryFn: async () => {
      const entries = await Promise.all(
        matches.map(async (match) => {
          const [profile, history] = await Promise.all([
            ctx.api.assets.getProfile(match.assetId),
            ctx.api.quotes.getHistory(match.assetId).catch(() => [] as Quote[]),
          ]);
          return { assetId: match.assetId, profile, history };
        })
      );
      return entries.map(({ assetId, profile, history }) => ({
        assetId,
        profile,
        latestTimestamp: latestQuoteTimestamp(history),
        dataSources: recentQuoteDataSources(history),
      }));
    },
    enabled: matches.length > 0,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const state = stateQuery.data ?? [];
  const knownCodes = [LEGACY_PROVIDER_CODE, TD_PROVIDER_CODE];
  const providerCode = resolveProviderCode(state.flatMap((s) => s.dataSources));
  const wiredAssetIds = new Set(
    state
      .filter((s) => isWiredToProvider(s.profile, [...knownCodes, providerCode]))
      .map((s) => s.assetId)
  );
  // Wired securities whose quotes are missing or stale: the provider is
  // missing, misconfigured, or the wiring points at the wrong code.
  const staleWiredAssetIds = new Set(
    state
      .filter((s) => wiredAssetIds.has(s.assetId) && isQuoteStale(s.latestTimestamp))
      .map((s) => s.assetId)
  );

  const links: TdSecurityMatch[] = quotesQuery.data
    ? matchSecuritiesByQuotes(quotesQuery.data.quotes, instruments, wiredAssetIds)
    : [];

  const connectMutation = useMutation({
    mutationFn: ({ assetId, apiId }: { assetId: string; apiId: number }) =>
      connectSecurity(ctx, assetId, apiId, providerCode),
    onSuccess: async (_, { assetId }) => {
      await queryClient.invalidateQueries({
        queryKey: ['tesouro-direto', 'state'],
      });
      // Give the triggered sync a moment before refreshing quotes.
      setTimeout(() => {
        void queryClient.invalidateQueries({
          queryKey: ['tesouro-direto', 'quotes'],
        });
      }, 3000);
      void assetId;
    },
    onError: (error) => {
      ctx.api.logger.error(`Failed to connect security: ${String(error)}`);
      ctx.api.toast.error('Não foi possível conectar a security.');
    },
  });

  return {
    quotesQuery,
    instrumentsQuery,
    links,
    byBondName: new Map(links.map((link) => [link.bond.name, link])),
    connectMutation,
    staleWiredAssetIds,
    staleWiredCount: staleWiredAssetIds.size,
  };
}
