import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Scale, AlertTriangle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SensorStatusBadgeProps {
  isConnected: boolean;
  error?: string;
  className?: string;
}

export function SensorStatusBadge({ isConnected, error, className }: SensorStatusBadgeProps) {
  const badge = (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
        isConnected 
          ? 'bg-status-ok/20 text-status-ok border border-status-ok/30' 
          : 'bg-status-error/20 text-status-error border border-status-error/30',
        className
      )}
    >
      <Scale className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Balance</span>
      {isConnected ? (
        <Wifi className="w-3 h-3" />
      ) : (
        <WifiOff className="w-3 h-3" />
      )}
    </div>
  );

  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1">
              <div className="font-medium">
                Balance: {isConnected ? 'Connectée' : 'Déconnectée'}
              </div>
              <div className="text-xs text-status-error">
                Erreur: {error}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}

interface SensorStatusBarProps {
  isScaleConnected: boolean;
  errors: { scale?: string };
  className?: string;
}

export function SensorStatusBar({ 
  isScaleConnected, 
  errors,
  className 
}: SensorStatusBarProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <SensorStatusBadge 
        isConnected={isScaleConnected} 
        error={errors.scale} 
      />
      {!isScaleConnected && errors.scale && (
        <div className="flex items-center gap-1 text-xs text-status-error">
          <AlertTriangle className="w-3 h-3" />
          <span>Vérifiez la connexion</span>
        </div>
      )}
    </div>
  );
}
