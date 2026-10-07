import { describe, expect, it } from 'vitest';
import { findTdProvider } from '../provider';
import type { MarketDataProviderInfo } from '@wealthfolio/addon-sdk';

function info(id: string, name: string): MarketDataProviderInfo {
  return { id, name, logoFilename: '', lastSyncedDate: null };
}

describe('findTdProvider', () => {
  it('finds the provider by the legacy code', () => {
    expect(
      findTdProvider([info('YAHOO', 'Yahoo'), info('tesouro-direto-monitor', 'Tesouro Direto Monitor')])?.id,
    ).toBe('tesouro-direto-monitor');
  });

  it('finds a provider created under the short name, whatever its code', () => {
    // A fresh "Tesouro Direto" provider auto-generates its own code.
    expect(findTdProvider([info('td', 'Tesouro Direto')])?.id).toBe('td');
    expect(findTdProvider([info('tesouro-direto', 'Tesouro Direto')])?.id).toBe('tesouro-direto');
  });

  it('matches display names case-insensitively', () => {
    expect(findTdProvider([info('x', 'tesouro direto monitor')])?.id).toBe('x');
    expect(findTdProvider([info('x', 'TESOURO DIRETO')])?.id).toBe('x');
  });

  it('returns undefined when the provider is missing', () => {
    expect(findTdProvider([info('YAHOO', 'Yahoo')])).toBeUndefined();
    expect(findTdProvider([])).toBeUndefined();
  });
});
