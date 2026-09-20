import type { AddonContext } from '@wealthfolio/addon-sdk';
import type { BondTypeGroup, TesouroQuote, TesouroQuotes } from '../types';

/**
 * Current Tesouro Direto rates and prices.
 *
 * The official Tesouro Transparente CSV contains the full history since 2004
 * (~14.5 MB per download), which exceeds the host network broker's 2 MB
 * response cap. This JSON API returns the same latest-day quotes in ~30 KB,
 * including extras the CSV does not have (daily deltas, minimum investment
 * and D+1 quotes). Non-official source: if it is down the page shows its
 * error state with a retry button.
 */
const TESOURO_API_URL = 'https://api.tesourodiretomonitor.com.br/api/taxas/atuais';

/** Display order for well-known bond families; unknown ones come last, alphabetical. */
const BOND_TYPE_ORDER = [
  'Tesouro Selic',
  'Tesouro Reserva',
  'Tesouro Prefixado',
  'Tesouro Prefixado com Juros Semestrais',
  'Tesouro IPCA+',
  'Tesouro IPCA+ com Juros Semestrais',
  'Tesouro IGPM+ com Juros Semestrais',
  'Tesouro Educa+',
  'Tesouro Renda+',
];

/** Raw quote shape returned by the API. */
interface RawQuote {
  id: number;
  nome: string;
  tipo: string;
  vencimento: string;
  ativo: boolean;
  taxaCompra: number | null;
  taxaVenda: number | null;
  puCompra: number | null;
  puVenda: number | null;
  valorMinimo: number | null;
  deltaTaxa: number | null;
  deltaPuCompraPercent: number | null;
  deltaPuVendaPercent: number | null;
  dataAtualizacao: string;
}

/** Raw response envelope returned by the API. */
interface RawResponse {
  success: boolean;
  count: number;
  data: RawQuote[];
}

/**
 * Maps an API quote into our normalized shape. Nulls stay null so the table
 * can render an em dash for untradeable bonds.
 */
function mapQuote(raw: RawQuote): TesouroQuote | null {
  if (!raw.nome || !raw.vencimento) return null;
  // Maturity arrives as an ISO timestamp; keep only the date part.
  const maturity = raw.vencimento.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(maturity)) return null;

  return {
    name: raw.nome,
    apiId: raw.id,
    bondType: raw.nome.replace(/\s+\d{4}$/, ''),
    maturity,
    buyRate: raw.taxaCompra,
    sellRate: raw.taxaVenda,
    buyPrice: raw.puCompra,
    sellPrice: raw.puVenda,
    minimumInvestment: raw.valorMinimo,
    rateDelta: raw.deltaTaxa,
    buyPriceDeltaPercent: raw.deltaPuCompraPercent,
    sellPriceDeltaPercent: raw.deltaPuVendaPercent,
    updatedAt: raw.dataAtualizacao,
  };
}

/** Parses the raw API payload into our normalized shape. */
export function parseTesouroQuotes(payload: RawResponse): TesouroQuotes {
  if (!payload || payload.success !== true || !Array.isArray(payload.data)) {
    throw new Error('Unexpected Tesouro Direto API response shape');
  }

  const quotes = payload.data
    .filter((raw) => raw.ativo !== false)
    .map(mapQuote)
    .filter((quote): quote is TesouroQuote => quote !== null);

  if (quotes.length === 0) {
    throw new Error('No active Tesouro Direto quotes found in API response');
  }

  quotes.sort((a, b) => a.maturity.localeCompare(b.maturity));
  // Quotes for delisted bonds can lag behind; the newest timestamp is the
  // business day the overall table refers to.
  const baseDate = quotes.reduce(
    (latest, quote) => (quote.updatedAt > latest ? quote.updatedAt : latest),
    ''
  );
  return { baseDate, quotes };
}

/** Fetches the latest Tesouro Direto quotes through the host network broker. */
export async function fetchTesouroQuotes(
  ctx: AddonContext
): Promise<TesouroQuotes> {
  const response = await ctx.api.network.request({
    url: TESOURO_API_URL,
    method: 'GET',
  });

  if (response.status !== 200) {
    throw new Error(
      `Failed to fetch Tesouro Direto quotes (HTTP ${response.status})`
    );
  }

  return parseTesouroQuotes(JSON.parse(response.body));
}

/** Groups quotes by bond family in a stable, canonical order. */
export function groupQuotesByType(quotes: TesouroQuote[]): BondTypeGroup[] {
  const groups = new Map<string, TesouroQuote[]>();
  for (const quote of quotes) {
    const list = groups.get(quote.bondType) ?? [];
    list.push(quote);
    groups.set(quote.bondType, list);
  }

  return [...groups.entries()]
    .map(([bondType, list]) => ({ bondType, quotes: list }))
    .sort((a, b) => {
      const rankA = BOND_TYPE_ORDER.indexOf(a.bondType);
      const rankB = BOND_TYPE_ORDER.indexOf(b.bondType);
      if (rankA === -1 && rankB === -1) return a.bondType.localeCompare(b.bondType);
      if (rankA === -1) return 1;
      if (rankB === -1) return -1;
      return rankA - rankB;
    });
}
