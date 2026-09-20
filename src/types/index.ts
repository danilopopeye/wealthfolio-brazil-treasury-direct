/** A single Tesouro Direto bond quote. */
export interface TesouroQuote {
  /** Bond display name, e.g. "Tesouro IPCA+ 2032". */
  name: string;
  /** Numeric id used by the source API to address this bond's endpoints. */
  apiId: number;
  /** Bond family derived from the name, e.g. "Tesouro IPCA+".
   * Used for grouping rows in the table. */
  bondType: string;
  /** Maturity date in ISO format (yyyy-MM-dd). */
  maturity: string;
  /** Annual buy rate in percentage points (e.g. 7.58 means 7.58% a.a.). */
  buyRate: number | null;
  /** Annual sell rate in percentage points. */
  sellRate: number | null;
  /** Unit buy price in BRL. */
  buyPrice: number | null;
  /** Unit sell price in BRL. */
  sellPrice: number | null;
  /** Minimum investment amount in BRL. */
  minimumInvestment: number | null;
  /** Buy rate change vs. the previous business day, in percentage points. */
  rateDelta: number | null;
  /** Buy price change vs. the previous business day, in %. */
  buyPriceDeltaPercent: number | null;
  /** Sell price change vs. the previous business day, in %. */
  sellPriceDeltaPercent: number | null;
  /** Last update timestamp of this quote, in ISO format. */
  updatedAt: string;
}

/** All quotes for the most recent business day available from the source. */
export interface TesouroQuotes {
  /** Business day the quotes refer to, in ISO format (yyyy-MM-dd). */
  baseDate: string;
  quotes: TesouroQuote[];
}

/** Quotes grouped by bond family, in a canonical display order. */
export interface BondTypeGroup {
  bondType: string;
  quotes: TesouroQuote[];
}

/** A user security that matches a Tesouro Direto bond by name. */
export interface TdSecurityMatch {
  bond: TesouroQuote;
  assetId: string;
  symbol: string;
  securityName: string;
  /** True when the security's providerConfig already maps to our provider. */
  wired: boolean;
}
