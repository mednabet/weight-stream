import { useState } from 'react';
import { ProductionItem, Product } from '@/types/production';
import { cn } from '@/lib/utils';
import { formatWeight } from '@/lib/weight-conversion';
import { CheckCircle, AlertTriangle, ArrowDown, ArrowUp, Clock, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type FilterType = 'all' | 'ok' | 'error';

interface RecentItemsProps {
  items: ProductionItem[];
  product?: Product;
  maxItems?: number;
  decimalPrecision?: number;
  className?: string;
}

export function RecentItems({ items, product, maxItems = 10, decimalPrecision = 2, className }: RecentItemsProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'ok') return item.status === 'ok';
    if (filter === 'error') return item.status === 'underweight' || item.status === 'overweight';
    return true;
  });

  const displayItems = filteredItems.slice(0, maxItems);

  const okCount = items.filter(i => i.status === 'ok').length;
  const errorCount = items.filter(i => i.status !== 'ok').length;

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getStatusIcon = (status: ProductionItem['status']) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="w-5 h-5 text-status-ok" />;
      case 'underweight':
        return <ArrowDown className="w-5 h-5 text-status-error" />;
      case 'overweight':
        return <ArrowUp className="w-5 h-5 text-status-warning" />;
    }
  };

  const getStatusBg = (status: ProductionItem['status']) => {
    switch (status) {
      case 'ok':
        return 'bg-status-ok/10 border-status-ok/20';
      case 'underweight':
        return 'bg-status-error/10 border-status-error/20';
      case 'overweight':
        return 'bg-status-warning/10 border-status-warning/20';
    }
  };

  const unit = product?.unit || 'g';

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with filters */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Captures
          </h3>
          <span className="text-xs text-muted-foreground">{items.length} total</span>
        </div>
        
        {/* Filter tabs */}
        <div className="flex gap-1">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors',
              filter === 'all' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
            )}
          >
            Tous ({items.length})
          </button>
          <button
            onClick={() => setFilter('ok')}
            className={cn(
              'flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1',
              filter === 'ok' 
                ? 'bg-status-ok text-white' 
                : 'bg-status-ok/20 text-status-ok hover:bg-status-ok/30'
            )}
          >
            <CheckCircle className="w-3 h-3" />
            OK ({okCount})
          </button>
          <button
            onClick={() => setFilter('error')}
            className={cn(
              'flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1',
              filter === 'error' 
                ? 'bg-status-error text-white' 
                : 'bg-status-error/20 text-status-error hover:bg-status-error/30'
            )}
          >
            <AlertTriangle className="w-3 h-3" />
            Erreurs ({errorCount})
          </button>
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-3">
        {displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Clock className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-sm">
              {filter === 'all' ? 'Aucune pièce capturée' : 
               filter === 'ok' ? 'Aucune pièce conforme' : 'Aucune pièce hors tolérance'}
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {displayItems.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl border transition-all',
                  getStatusBg(item.status),
                  index === 0 && 'animate-fade-in'
                )}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <span className="font-mono font-semibold text-lg">
                      {formatWeight(item.weight, unit, decimalPrecision)}{unit}
                    </span>
                    {item.status !== 'ok' && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'ml-2 text-xs',
                          item.status === 'underweight' 
                            ? 'border-status-error/50 text-status-error' 
                            : 'border-status-warning/50 text-status-warning'
                        )}
                      >
                        {item.status === 'underweight' ? 'Sous' : 'Sur'}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-muted-foreground font-mono">
                    {formatTime(item.capturedAt)}
                  </div>
                  <div className="text-xs text-muted-foreground/60">
                    #{item.sequence}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
