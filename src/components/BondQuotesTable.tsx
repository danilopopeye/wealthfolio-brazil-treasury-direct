import { format, parseISO } from 'date-fns';
import { Link2 } from 'lucide-react';
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@wealthfolio/ui';
import type { TdSecurityMatch, TesouroQuote } from '../types';
import { groupQuotesByType } from '../lib/tesouro';

const brl = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatRate(value: number | null): string {
  return value === null ? '—' : `${brl.format(value)}%`;
}

function formatPrice(value: number | null): string {
  return value === null ? '—' : `R$ ${brl.format(value)}`;
}

function formatDate(isoDate: string): string {
  return format(parseISO(isoDate), 'dd/MM/yyyy');
}

/** Small colored delta badge for price changes (up = green, down = red). */
function DeltaBadge({ value, suffix }: { value: number | null; suffix: string }) {
  if (value === null || value === 0) return null;
  const up = value > 0;
  return (
    <span
      className={`ml-1 text-[10px] tabular-nums ${
        up
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400'
      }`}
    >
      {up ? '▲' : '▼'} {brl.format(Math.abs(value))}{suffix}
    </span>
  );
}

interface SecurityCellProps {
  link: TdSecurityMatch | undefined;
  connecting: boolean;
  onConnect: (assetId: string, apiId: number) => void;
}

/** Status of the user's security for this bond: synced, connectable, or none. */
function SecurityCell({ link, connecting, onConnect }: SecurityCellProps) {
  if (!link) {
    return (
      <span className="text-xs text-muted-foreground">sem security</span>
    );
  }
  if (link.wired) {
    return <Badge variant="outline" className="text-green-600 dark:text-green-400">Sincronizado</Badge>;
  }
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 px-2 text-xs"
      disabled={connecting}
      onClick={() => onConnect(link.assetId, link.bond.apiId)}
    >
      <Link2 className="mr-1 h-3 w-3" />
      {connecting ? 'Conectando...' : 'Conectar'}
    </Button>
  );
}

interface QuoteRowProps {
  quote: TesouroQuote;
  link: TdSecurityMatch | undefined;
  connecting: boolean;
  onConnect: (assetId: string, apiId: number) => void;
}

function QuoteRow({ quote, link, connecting, onConnect }: QuoteRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium tabular-nums">
        {formatDate(quote.maturity)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatRate(quote.buyRate)}
        <DeltaBadge value={quote.rateDelta} suffix=" p.p." />
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatRate(quote.sellRate)}</TableCell>
      <TableCell className="text-right tabular-nums">
        {formatPrice(quote.buyPrice)}
        <DeltaBadge value={quote.buyPriceDeltaPercent} suffix="%" />
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatPrice(quote.sellPrice)}
        <DeltaBadge value={quote.sellPriceDeltaPercent} suffix="%" />
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {formatPrice(quote.minimumInvestment)}
      </TableCell>
      <TableCell className="text-center">
        <SecurityCell link={link} connecting={connecting} onConnect={onConnect} />
      </TableCell>
    </TableRow>
  );
}

const COLUMN_COUNT = 7;

/**
 * Quotes for a single bond family, rendered as a titled section:
 * a separator row with the bond type followed by its maturities.
 */
function BondTypeSection(props: {
  bondType: string;
  quotes: TesouroQuote[];
  linksByBondName: Map<string, TdSecurityMatch>;
  connectingAssetId: string | null;
  onConnect: (assetId: string, apiId: number) => void;
}) {
  const { bondType, quotes, linksByBondName, connectingAssetId, onConnect } = props;
  return (
    <>
      <TableRow className="bg-muted/50 hover:bg-muted/50">
        <TableCell colSpan={COLUMN_COUNT} className="font-semibold">
          {bondType}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {quotes.length} {quotes.length === 1 ? 'vencimento' : 'vencimentos'}
          </span>
        </TableCell>
      </TableRow>
      {quotes.map((quote) => (
        <QuoteRow
          key={quote.name}
          quote={quote}
          link={linksByBondName.get(quote.name)}
          connecting={connectingAssetId === (linksByBondName.get(quote.name)?.assetId ?? null)}
          onConnect={onConnect}
        />
      ))}
    </>
  );
}

/** Full quotes table with per-bond security wiring status. */
export function BondQuotesTable(props: {
  quotes: TesouroQuote[];
  linksByBondName: Map<string, TdSecurityMatch>;
  connectingAssetId: string | null;
  onConnect: (assetId: string, apiId: number) => void;
}) {
  const { quotes, ...sectionProps } = props;
  const groups = groupQuotesByType(quotes);

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vencimento</TableHead>
            <TableHead className="text-right">Taxa compra</TableHead>
            <TableHead className="text-right">Taxa venda</TableHead>
            <TableHead className="text-right">PU compra</TableHead>
            <TableHead className="text-right">PU venda</TableHead>
            <TableHead className="text-right">Mínimo</TableHead>
            <TableHead className="text-center">Security</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <BondTypeSection key={group.bondType} {...group} {...sectionProps} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
