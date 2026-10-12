import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { AddonContext } from '@wealthfolio/addon-sdk';
import { Alert, AlertDescription, Button, Card, CardContent, Skeleton } from '@wealthfolio/ui';
import { BondQuotesTable } from '../components/BondQuotesTable';
import { useTdCatalog } from '../hooks/useTdCatalog';

/** Warning shown when wired securities stopped receiving quotes. */
function SyncStalledAlert({ count }: { count: number }) {
  const plural = count > 1 ? 's' : '';
  return (
    <Alert variant="destructive">
      <AlertDescription className="space-y-2">
        <p>
          <strong>{count} security{plural} conectada{plural} sem cotações recentes.</strong> O
          provider pode estar ausente ou desconfigurado:
        </p>
        <p className="text-xs opacity-90">
          Settings → Market Data → Custom Providers — o provider deve se chamar{' '}
          <code>Tesouro Direto</code> (code <code>tesouro-direto</code>), no modo{' '}
          <strong>Both</strong>, com os endpoints{' '}
          <code>/api/titulos/&#123;SYMBOL&#125;/historico?dias=0</code> (série) e{' '}
          <code>/api/taxas/atuais</code> (latest). Campos completos no README do addon.
        </p>
      </AlertDescription>
    </Alert>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton key={index} className="h-8 w-full" />
      ))}
    </div>
  );
}

/**
 * Tesouro Direto catalog: latest business-day quotes for every bond family,
 * cross-referenced with the user's securities so each bond can be wired to
 * the Tesouro Direto Monitor custom provider with one click.
 */
export function TesouroDiretoPage({ ctx }: { ctx: AddonContext }) {
  const {
    quotesQuery,
    instrumentsQuery,
    links,
    byBondName,
    connectMutation,
    staleWiredCount,
  } = useTdCatalog(ctx);
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = quotesQuery;

  const refreshAll = () => {
    // The Atualizar button refreshes quotes AND the catalog (profiles may
    // have changed through the host UI while this page was in the background).
    void queryClient.invalidateQueries({ queryKey: ['brazil-treasury-direct'] });
    void refetch();
  };

  useEffect(() => {
    if (isError) {
      ctx.api.logger.error(`Failed to load Tesouro Direto quotes: ${String(error)}`);
    }
  }, [ctx, error, isError]);

  const wiredCount = links.filter((link) => link.wired).length;
  const connectingAssetId = connectMutation.isPending
    ? connectMutation.variables?.assetId ?? null
    : null;

  const handleConnect = (assetId: string, apiId: number) => {
    connectMutation.mutate(
      { assetId, apiId },
      {
        onSuccess: () => ctx.api.toast.success('Security conectada ao Tesouro Direto.'),
      }
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Tesouro Direto</h1>
          <p className="text-sm text-muted-foreground">
            {data
              ? `Cotações de ${format(parseISO(data.baseDate), 'dd/MM/yyyy HH:mm')} — ${data.quotes.length} títulos`
              : 'Taxas e preços unitários dos títulos do Tesouro Nacional'}
          </p>
          {links.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {wiredCount === links.length
                ? `${wiredCount} ${wiredCount === 1 ? 'security conectada' : 'securities conectadas'} ✓`
                : `${wiredCount}/${links.length} securities conectadas — use "Conectar" nas linhas pendentes`}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshAll()}
          disabled={isLoading || isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </div>

      {staleWiredCount > 0 ? <SyncStalledAlert count={staleWiredCount} /> : null}

      {instrumentsQuery.isError && (
        <Alert>
          <AlertDescription>
            Não foi possível ler suas securities — o catálogo mostra apenas cotações.
            Verifique as permissões do addon.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <Alert variant="destructive">
          <AlertDescription className="space-y-2">
            <p>Falha ao carregar as cotações do Tesouro Direto.</p>
            <p className="text-xs opacity-80">{error instanceof Error ? error.message : String(error)}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : data ? (
        <>
          <BondQuotesTable
            quotes={data.quotes}
            linksByBondName={byBondName}
            connectingAssetId={connectingAssetId}
            onConnect={handleConnect}
          />
          <Card>
            <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
              <p>
                <strong>Como conectar:</strong> crie a security (Securities → Add Security) com o
                mesmo nome do título (ex.: "Tesouro IPCA+ 2032"), registre a posição, e clique em
                Conectar. O addon configura o Market Data para o custom provider
                "Tesouro Direto Monitor" — que precisa existir em Settings → Market Data.
              </p>
              <p>
                Fonte: Tesouro Direto Monitor — taxas em % a.a. e PU em reais; mínimo é o
                investimento por título.
                {dataUpdatedAt > 0
                  ? ` Atualizado localmente às ${format(new Date(dataUpdatedAt), 'HH:mm')}.`
                  : ''}
              </p>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
