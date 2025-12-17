import { LineStatus, WeightReading } from '@/types/production';
import { LineStatusBadge } from './LineStatusBadge';
import { WeightDisplay } from './WeightDisplay';
import { cn } from '@/lib/utils';
import { Package, Monitor, User } from 'lucide-react';

interface ProductionLineCardProps {
  status: LineStatus;
  weight: WeightReading;
  onClick?: () => void;
  className?: string;
}

export function ProductionLineCard({ status, weight, onClick, className }: ProductionLineCardProps) {
  const { line, activeTask, terminal } = status;

  return (
    <button
      onClick={onClick}
      className={cn(
        'industrial-card text-left transition-all hover:ring-2 hover:ring-accent/50 active:scale-[0.99] w-full',
        line.state === 'RUNNING' && 'ring-1 ring-status-stable/30',
        line.state === 'PAUSED' && 'ring-1 ring-status-unstable/30',
        line.state === 'ERROR' && 'ring-1 ring-status-error/30',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg">{line.name}</h3>
          <p className="text-sm text-muted-foreground font-mono">{line.code}</p>
        </div>
        <LineStatusBadge state={line.state} size="sm" />
      </div>

      {/* Weight display */}
      <div className="mb-4">
        <WeightDisplay 
          weight={weight}
          product={activeTask?.product}
          size="md"
          showStatus={false}
        />
      </div>

      {/* Task info */}
      <div className="pt-4 border-t border-border">
        {activeTask ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm truncate max-w-[120px]">{activeTask.product.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-lg">
                {activeTask.completedQuantity}
              </span>
              <span className="text-sm text-muted-foreground">pcs</span>
            </div>
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            Aucune tâche active
          </div>
        )}
      </div>

      {/* Terminal & Operator */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className={cn(
            'w-2 h-2 rounded-full',
            terminal?.isOnline ? 'bg-status-stable' : 'bg-muted'
          )} />
          <Monitor className="w-3 h-3" />
          <span className="truncate max-w-[80px]">{terminal?.name || 'Non assigné'}</span>
        </div>
        {activeTask && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[80px]">{activeTask.operator.username}</span>
          </div>
        )}
      </div>
    </button>
  );
}
