import { describe, expect, it } from 'vitest';
import { findTdProvider } from '../provider';
import type { MarketDataProviderInfo } from '@wealthfolio/addon-sdk';

function info(id: string, name: string): MarketDataProviderInfo {
  return { id, name, logoFilename: '', lastSyncedDate: null };
}

describe('findTdProvider', () => {
  it('finds the provider by code', () => {
    expect(findTdProvider([info('YAHOO', 'Yahoo'), info('tesouro-direto-monitor', 'Tesouro Direto Monitor')])?.id)
      .toBe('tesouro-direto-monitor');
  });

  it('matches the display name as a fallback (case-insensitive)', () => {
    expect(findTdProvider([info('tdm', 'tesouro direto monitor')])?.id).toBe('tdm');
  });

  it('returns undefined when the provider is missing', () => {
    expect(findTdProvider([info('YAHOO', 'Yahoo')])).toBeUndefined();
    expect(findTdProvider([])).toBeUndefined();
  });
});
