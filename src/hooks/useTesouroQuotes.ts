import { useQuery } from '@tanstack/react-query';
import type { AddonContext } from '@wealthfolio/addon-sdk';
import type { TesouroQuotes } from '../types';
import { fetchTesouroQuotes } from '../lib/tesouro';

export const TESOURO_QUOTES_QUERY_KEY = ['tesouro-direto', 'quotes'] as const;

/**
 * Loads the latest Tesouro Direto quotes. The source is updated once per
 * business day (around 10:00 BRT), so a long stale time is appropriate.
 */
export function useTesouroQuotes(ctx: AddonContext) {
  return useQuery<TesouroQuotes>({
    queryKey: TESOURO_QUOTES_QUERY_KEY,
    queryFn: () => fetchTesouroQuotes(ctx),
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
