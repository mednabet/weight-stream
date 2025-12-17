import { useMemo } from 'react';
import { ProductionItem } from '@/types/production';
import { cn } from '@/lib/utils';
import { formatWeight } from '@/lib/weight-conversion';
import { 
  CheckCircle2, AlertTriangle, TrendingDown, TrendingUp, 
  Scale, Package, Timer, BarChart3, Percent
} from 'lucide-react';

interface ProductionStatsProps {
  items: ProductionItem[];
  productUnit?: string;
  startedAt?: string;
  decimalPrecision?: number;
  className?: string;
}

export function ProductionStats({ items, productUnit = 'g', startedAt, decimalPrecision = 2, className }: ProductionStatsProps) {
  const stats = useMemo(() => {
    const okItems = items.filter(i => i.status === 'ok');
    const underweightItems = items.filter(i => i.status === 'underweight');
    const overweightItems = items.filter(i => i.status === 'overweight');
    
    const total = items.length;
    const okRate = total > 0 ? (okItems.length / total) * 100 : 0;
    const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
    const avgWeight = total > 0 ? totalWeight / total : 0;
    
    // Calculate rate per hour
    let ratePerHour = 0;
    if (startedAt && total > 0) {
      const startTime = new Date(startedAt).getTime();
      const now = Date.now();
      const hoursElapsed = (now - startTime) / (1000 * 60 * 60);
      ratePerHour = hoursElapsed > 0 ? total / hoursElapsed : 0;
    }
    
    return {
      total,
      ok: okItems.length,
      underweight: underweightItems.length,
      overweight: overweightItems.length,
      okRate,
      totalWeight,
      avgWeight,
      ratePerHour,
    };
  }, [items, startedAt]);

  if (items.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 text-muted-foreground", className)}>
        <BarChart3 className="w-12 h-12 opacity-30 mb-2" />
        <p className="text-sm">Aucune donnée</p>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {/* OK Count */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-status-ok/10 border border-status-ok/20">
        <div className="w-10 h-10 rounded-lg bg-status-ok/20 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-status-ok" />
        </div>
        <div>
          <div className="text-2xl font-bold text-status-ok">{stats.ok}</div>
          <div className="text-xs text-muted-foreground">Conformes</div>
        </div>
      </div>
      
      {/* OK Rate */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Percent className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="text-2xl font-bold text-primary">{stats.okRate.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">Taux OK</div>
        </div>
      </div>
      
      {/* Underweight */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-status-error/10 border border-status-error/20">
        <div className="w-10 h-10 rounded-lg bg-status-error/20 flex items-center justify-center">
          <TrendingDown className="w-5 h-5 text-status-error" />
        </div>
        <div>
          <div className="text-2xl font-bold text-status-error">{stats.underweight}</div>
          <div className="text-xs text-muted-foreground">Sous-poids</div>
        </div>
      </div>
      
      {/* Overweight */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <div className="text-2xl font-bold text-amber-500">{stats.overweight}</div>
          <div className="text-xs text-muted-foreground">Sur-poids</div>
        </div>
      </div>
      
      {/* Total Weight */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary border border-border/50">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <Scale className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <div className="text-lg font-bold">{formatWeight(stats.totalWeight, productUnit, decimalPrecision)}<span className="text-sm font-normal text-muted-foreground ml-1">{productUnit}</span></div>
          <div className="text-xs text-muted-foreground">Poids total</div>
        </div>
      </div>
      
      {/* Rate per hour */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary border border-border/50">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <Timer className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <div className="text-lg font-bold">{stats.ratePerHour.toFixed(0)}<span className="text-sm font-normal text-muted-foreground ml-1">/h</span></div>
          <div className="text-xs text-muted-foreground">Cadence</div>
        </div>
      </div>
    </div>
  );
}
