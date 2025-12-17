import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Scale, Eye, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SensorStatusBadgeProps {
  type: 'scale' | 'photocell';
  isConnected: boolean;
  error?: string;
  className?: string;
}

export function SensorStatusBadge({ type, isConnected, error, className }: SensorStatusBadgeProps) {
  const Icon = type === 'scale' ? Scale : Eye;
  const label = type === 'scale' ? 'Balance' : 'Photocellule';
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              isConnected 
                ? 'bg-status-ok/20 text-status-ok border border-status-ok/30' 
                : 'bg-status-error/20 text-status-error border border-status-error/30',
              className
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
            {isConnected ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            {error && <AlertCircle className="w-3 h-3 animate-pulse" />}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <div className="font-medium">
              {label}: {isConnected ? 'Connecté' : 'Déconnecté'}
            </div>
            {error && (
              <div className="text-xs text-status-error">
                Erreur: {error}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface SensorStatusBarProps {
  isScaleConnected: boolean;
  isPhotocellConnected: boolean;
  errors: { scale?: string; photocell?: string };
  className?: string;
}

export function SensorStatusBar({ 
  isScaleConnected, 
  isPhotocellConnected, 
  errors,
  className 
}: SensorStatusBarProps) {
  const allConnected = isScaleConnected && isPhotocellConnected;
  const hasErrors = errors.scale || errors.photocell;
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <SensorStatusBadge 
        type="scale" 
        isConnected={isScaleConnected} 
        error={errors.scale} 
      />
      <SensorStatusBadge 
        type="photocell" 
        isConnected={isPhotocellConnected} 
        error={errors.photocell} 
      />
      {hasErrors && (
        <div className="text-xs text-status-warning animate-pulse ml-2">
          Vérifiez les connexions
        </div>
      )}
    </div>
  );
}
