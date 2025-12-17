import { cn } from '@/lib/utils';
import { Package, TrendingUp } from 'lucide-react';

interface ItemsCounterProps {
  count: number;
  target?: number;
  lastItemStatus?: 'ok' | 'underweight' | 'overweight';
  showFlash?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ItemsCounter({ 
  count, 
  target, 
  lastItemStatus,
  showFlash = false,
  size = 'lg',
  className 
}: ItemsCounterProps) {
  const progress = target ? (count / target) * 100 : null;

  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  };

  const iconClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={cn(
      'flex flex-col items-center gap-3 p-6 rounded-2xl transition-all duration-300',
      showFlash && 'capture-flash',
      className
    )}>
      {/* Icon and label */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Package className={iconClasses[size]} />
        <span className="uppercase tracking-wider text-sm font-medium">Pièces</span>
      </div>

      {/* Counter */}
      <div className={cn(
        'font-mono font-bold tracking-tight',
        sizeClasses[size],
        lastItemStatus === 'ok' ? 'text-status-stable' :
        lastItemStatus === 'underweight' || lastItemStatus === 'overweight' ? 'text-status-error' :
        'text-foreground'
      )} style={{ textShadow: '0 0 30px currentColor' }}>
        {count.toLocaleString()}
      </div>

      {/* Target progress */}
      {target && (
        <div className="w-full max-w-48">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Objectif: {target}</span>
            <span className="font-medium text-accent">{Math.round(progress!)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full rounded-full transition-all duration-500',
                progress! >= 100 ? 'bg-status-stable' : 'bg-accent'
              )}
              style={{ width: `${Math.min(progress!, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Rate indicator */}
      {size === 'lg' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <TrendingUp className="w-4 h-4 text-accent" />
          <span>~12 pièces/min</span>
        </div>
      )}
    </div>
  );
}
