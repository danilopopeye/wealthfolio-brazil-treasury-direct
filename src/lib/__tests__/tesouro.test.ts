import { describe, expect, it } from 'vitest';
import { groupQuotesByType, parseTesouroQuotes } from '../tesouro';
import type { RawQuote, RawResponse } from '../tesouro';
import type { TesouroQuote } from '../../types';

function rawQuote(overrides: Partial<RawQuote>): RawQuote {
  return {
    id: 1,
    nome: 'Tesouro IPCA+ 2032',
    tipo: 'IPCA',
    vencimento: '2032-08-15T12:00:00.000Z',
    ativo: true,
    taxaCompra: 7.58,
    taxaVenda: 7.7,
    puCompra: 3083.29,
    puVenda: 3060.58,
    valorMinimo: 30.83,
    deltaTaxa: -0.03,
    deltaPuCompraPercent: 0.25,
    deltaPuVendaPercent: 0.21,
    dataAtualizacao: '2026-09-18T12:00:00.000Z',
    ...overrides,
  };
}

function payload(quotes: RawQuote[]): RawResponse {
  return { success: true, count: quotes.length, data: quotes };
}

describe('parseTesouroQuotes', () => {
  it('maps api fields into normalized quotes', () => {
    const result = parseTesouroQuotes(payload([rawQuote({})]));

    expect(result.quotes).toHaveLength(1);
    const quote: TesouroQuote = result.quotes[0];
    expect(quote.apiId).toBe(1);
    expect(quote.name).toBe('Tesouro IPCA+ 2032');
    expect(quote.bondType).toBe('Tesouro IPCA+');
    expect(quote.maturity).toBe('2032-08-15');
    expect(quote.buyRate).toBe(7.58);
    expect(quote.buyPrice).toBe(3083.29);
    expect(quote.updatedAt).toBe('2026-09-18T12:00:00.000Z');
  });

  it('uses the newest updatedAt as the base date', () => {
    const result = parseTesouroQuotes(
      payload([
        rawQuote({ nome: 'Tesouro Selic 2027', dataAtualizacao: '2026-09-17T12:00:00.000Z' }),
        rawQuote({ dataAtualizacao: '2026-09-18T12:00:00.000Z' }),
      ]),
    );

    expect(result.baseDate).toBe('2026-09-18T12:00:00.000Z');
  });

  it('drops inactive bonds and rows without a parsable maturity', () => {
    const result = parseTesouroQuotes(
      payload([
        rawQuote({ ativo: false, nome: 'Tesouro Velho' }),
        rawQuote({ nome: 'Broken', vencimento: 'não é data' }),
        rawQuote({}),
      ]),
    );

    expect(result.quotes).toHaveLength(1);
    expect(result.quotes[0].name).toBe('Tesouro IPCA+ 2032');
  });

  it('sorts quotes by maturity', () => {
    const result = parseTesouroQuotes(
      payload([
        rawQuote({ id: 2, nome: 'Tesouro IPCA+ 2045', vencimento: '2045-05-15T12:00:00.000Z' }),
        rawQuote({ id: 1, vencimento: '2032-08-15T12:00:00.000Z' }),
      ]),
    );

    expect(result.quotes.map((q) => q.maturity)).toEqual(['2032-08-15', '2045-05-15']);
  });

  it('rejects unexpected response shapes', () => {
    expect(() => parseTesouroQuotes({ success: false, count: 0, data: [] } as RawResponse)).toThrow();
    expect(() => parseTesouroQuotes({ success: true, count: 0, data: [] } as RawResponse)).toThrow(
      /no active/i,
    );
  });
});

describe('groupQuotesByType', () => {
  it('groups in canonical order with unknown families last', () => {
    const quotes: TesouroQuote[] = [
      {
        name: 'Tesouro Educa+ 2040',
        apiId: 40,
        bondType: 'Tesouro Educa+',
        maturity: '2040-12-15',
        buyRate: 7.27,
        sellRate: 7.39,
        buyPrice: 1582.65,
        sellPrice: 1554.09,
        minimumInvestment: 15.83,
        rateDelta: 0.02,
        buyPriceDeltaPercent: -0.2,
        sellPriceDeltaPercent: -0.24,
        updatedAt: '2026-09-18T12:00:00.000Z',
      },
      {
        name: 'Tesouro Selic 2029',
        apiId: 5,
        bondType: 'Tesouro Selic',
        maturity: '2029-03-01',
        buyRate: 0.03,
        sellRate: 0.04,
        buyPrice: 19900.69,
        sellPrice: 19885.68,
        minimumInvestment: 199.01,
        rateDelta: 0,
        buyPriceDeltaPercent: 0.05,
        sellPriceDeltaPercent: 0.05,
        updatedAt: '2026-09-18T12:00:00.000Z',
      },
    ];

    const groups = groupQuotesByType(quotes);
    expect(groups.map((g) => g.bondType)).toEqual(['Tesouro Selic', 'Tesouro Educa+']);
  });
});
