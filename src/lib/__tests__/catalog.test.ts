import { describe, expect, it } from 'vitest';
import {
  buildProviderConfig,
  isQuoteStale,
  isWiredToProvider,
  latestQuoteTimestamp,
  matchSecuritiesByQuotes,
  normalizeName,
  providerCodeFromDataSource,
  recentQuoteDataSources,
  resolveProviderCode,
  TD_PROVIDER_CODE,
} from '../catalog';
import type { TesouroQuote } from '../../types';

const bond: TesouroQuote = {
  name: 'Tesouro IPCA+ 2032',
  apiId: 31,
  bondType: 'Tesouro IPCA+',
  maturity: '2032-08-15',
  buyRate: 7.58,
  sellRate: 7.7,
  buyPrice: 3083.29,
  sellPrice: 3060.58,
  minimumInvestment: 30.83,
  rateDelta: -0.03,
  buyPriceDeltaPercent: 0.25,
  sellPriceDeltaPercent: 0.21,
  updatedAt: '2026-09-18T12:00:00.000Z',
};

describe('normalizeName', () => {
  it('is case, accent and whitespace insensitive', () => {
    expect(normalizeName('  Tesouro   IPCA+ 2032 ')).toBe('tesouro ipca+ 2032');
    expect(normalizeName('TESOURO IPCA+ 2032')).toBe('tesouro ipca+ 2032');
    expect(normalizeName('tesouro ipca+ 2032')).toBe('tesouro ipca+ 2032');
  });
});

describe('matchSecuritiesByQuotes', () => {
  it('matches securities by name regardless of case and accents', () => {
    const [match] = matchSecuritiesByQuotes(
      [bond],
      [{ assetId: 'asset-1', symbol: 'TD-IPCA-2032', name: 'TESOURO IPCA+ 2032' }],
      new Set(),
    );

    expect(match).toMatchObject({
      bond,
      assetId: 'asset-1',
      symbol: 'TD-IPCA-2032',
      wired: false,
    });
  });

  it('falls back to the symbol when the name is empty', () => {
    const [match] = matchSecuritiesByQuotes(
      [bond],
      [{ assetId: 'asset-2', symbol: 'TESOURO IPCA+ 2032', name: '' }],
      new Set(),
    );

    expect(match?.assetId).toBe('asset-2');
  });

  it('omits bonds without a matching security and flags wired ones', () => {
    const matches = matchSecuritiesByQuotes(
      [bond],
      [{ assetId: 'asset-1', symbol: 'X', name: 'Tesouro IPCA+ 2032' }],
      new Set(['asset-1']),
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].wired).toBe(true);
  });
});

describe('buildProviderConfig', () => {
  it('wires the security to the custom provider with the api id', () => {
    const config = buildProviderConfig('tesouro-direto', 31);

    expect(config.preferred_provider).toBe('CUSTOM_SCRAPER');
    expect(config.custom_provider_code).toBe('tesouro-direto');
    expect(config.overrides).toEqual({
      'CUSTOM:tesouro-direto': { type: 'equity_symbol', symbol: '31' },
    });
  });

  it('preserves unrelated existing config', () => {
    const existing = {
      preferred_provider: 'YAHOO',
      overrides: { YAHOO: { type: 'equity_symbol', symbol: 'XYZ' } },
    };
    const config = buildProviderConfig(TD_PROVIDER_CODE, 15, existing);

    expect((config.overrides as Record<string, unknown>).YAHOO).toEqual({
      type: 'equity_symbol',
      symbol: 'XYZ',
    });
    expect(config.custom_provider_code).toBe(TD_PROVIDER_CODE);
  });
});

describe('isWiredToProvider', () => {
  const profile = (providerConfig: unknown) => ({ providerConfig }) as never;

  it('requires our provider override to consider a profile wired', () => {
    expect(isWiredToProvider(profile(buildProviderConfig('tdm', 31)), ['tdm', TD_PROVIDER_CODE])).toBe(true);
    expect(
      isWiredToProvider(profile({ preferred_provider: 'CUSTOM_SCRAPER', custom_provider_code: 'other' }), ['tdm']),
    ).toBe(false);
    expect(isWiredToProvider(profile(null), ['tdm'])).toBe(false);
    expect(isWiredToProvider(undefined, ['tdm'])).toBe(false);
  });
});

describe('providerCodeFromDataSource', () => {
  it('extracts the code from a custom scraper data source', () => {
    expect(providerCodeFromDataSource('CUSTOM_SCRAPER:tesouro-direto')).toBe('tesouro-direto');
    expect(providerCodeFromDataSource('CUSTOM_SCRAPER:tesouro-direto-monitor')).toBe(
      'tesouro-direto-monitor'
    );
  });

  it('returns undefined for other providers', () => {
    expect(providerCodeFromDataSource('YAHOO')).toBeUndefined();
    expect(providerCodeFromDataSource('')).toBeUndefined();
  });
});

describe('resolveProviderCode', () => {
  it('prefers the code that is actually delivering quotes', () => {
    expect(
      resolveProviderCode(['YAHOO', 'CUSTOM_SCRAPER:tesouro-direto-monitor']),
    ).toBe('tesouro-direto-monitor');
  });

  it('falls back to the documented default code', () => {
    expect(resolveProviderCode([])).toBe('tesouro-direto');
    expect(resolveProviderCode(['YAHOO'])).toBe('tesouro-direto');
  });
});

describe('isQuoteStale', () => {
  const now = new Date('2026-09-20T12:00:00Z');

  it('treats missing quotes as stale', () => {
    expect(isQuoteStale(undefined, now)).toBe(true);
  });

  it('accepts quotes within a long weekend', () => {
    expect(isQuoteStale('2026-09-18T12:00:00Z', now)).toBe(false);
  });

  it('flags quotes older than six days', () => {
    expect(isQuoteStale('2026-09-10T12:00:00Z', now)).toBe(true);
  });
});

describe('latestQuoteTimestamp', () => {
  const q = (timestamp: string) => ({ timestamp });

  it('finds the newest quote regardless of ordering', () => {
    // The history endpoint returns newest-first; make sure both orders work.
    expect(latestQuoteTimestamp([q('2026-09-18T12:00:00Z'), q('2026-02-02T12:00:00Z')])).toBe(
      '2026-09-18T12:00:00Z'
    );
    expect(latestQuoteTimestamp([q('2026-02-02T12:00:00Z'), q('2026-09-18T12:00:00Z')])).toBe(
      '2026-09-18T12:00:00Z'
    );
  });

  it('returns undefined for an empty history', () => {
    expect(latestQuoteTimestamp([])).toBeUndefined();
  });
});

describe('recentQuoteDataSources', () => {
  const now = new Date('2026-09-20T12:00:00Z');
  const q = (timestamp: string, dataSource: string) => ({ timestamp, dataSource });

  it('keeps only sources with fresh quotes', () => {
    expect(
      recentQuoteDataSources(
        [
          q('2026-09-18T12:00:00Z', 'CUSTOM_SCRAPER:tesouro-direto'),
          q('2026-02-02T12:00:00Z', 'CUSTOM_SCRAPER:renamed-away'),
        ],
        now
      ),
    ).toEqual(['CUSTOM_SCRAPER:tesouro-direto']);
  });
});
