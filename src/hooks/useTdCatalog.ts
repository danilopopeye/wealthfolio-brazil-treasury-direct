import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddonContext } from '@wealthfolio/addon-sdk';
import type { TdSecurityMatch } from '../types';
import {
  connectSecurity,
  fetchHeldInstruments,
  isWiredToProvider,
  matchSecuritiesByQuotes,
} from '../lib/catalog';
import { useTesouroQuotes } from './useTesouroQuotes';

/**
 * Catalog state: current quotes cross-referenced with the user's held
 * securities (matched by name), including wiring status and the connect
 * mutation that links a security to the Tesouro Direto custom provider.
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

  // Matched securities (name join) need asset profiles to know wiring status.
  const matches = quotesQuery.data
    ? matchSecuritiesByQuotes(quotesQuery.data.quotes, instruments, new Set())
    : [];

  const profilesQuery = useQuery({
    queryKey: ['tesouro-direto', 'profiles', matches.map((m) => m.assetId)],
    queryFn: async () => {
      const profiles = await Promise.all(
        matches.map(async (match) => ({
          assetId: match.assetId,
          profile: await ctx.api.assets.getProfile(match.assetId),
        }))
      );
      return new Map(
        profiles.map(({ assetId, profile }) => [assetId, profile] as const)
      );
    },
    enabled: matches.length > 0,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const wiredAssetIds = new Set(
    [...(profilesQuery.data ?? new Map())]
      .filter(([, profile]) => isWiredToProvider(profile))
      .map(([assetId]) => assetId)
  );

  const links: TdSecurityMatch[] = quotesQuery.data
    ? matchSecuritiesByQuotes(quotesQuery.data.quotes, instruments, wiredAssetIds)
    : [];

  const connectMutation = useMutation({
    mutationFn: ({ assetId, apiId }: { assetId: string; apiId: number }) =>
      connectSecurity(ctx, assetId, apiId),
    onSuccess: async (_, { assetId }) => {
      await queryClient.invalidateQueries({
        queryKey: ['tesouro-direto', 'profiles'],
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
  };
}
