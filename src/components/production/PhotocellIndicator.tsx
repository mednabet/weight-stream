import { PhotocellState } from '@/types/production';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PhotocellIndicatorProps {
  state: PhotocellState;
  captureState?: 'idle' | 'armed' | 'capturing' | 'cooldown';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  error?: string;
  className?: string;
}

export function PhotocellIndicator({ 
  state, 
  captureState = 'idle',
  size = 'md', 
  showLabel = true,
  error,
  className 
}: PhotocellIndicatorProps) {
  const isActive = state === 1;
  const isCapturing = captureState === 'capturing';
  const isArmed = captureState === 'armed';
  const isCooldown = captureState === 'cooldown';
  const hasError = !!error;

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const iconClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const getBackgroundClass = () => {
    if (hasError) return 'bg-status-error';
    if (isCapturing) return 'bg-status-capturing animate-pulse';
    if (isActive && isArmed) return 'bg-status-stable';
    if (isActive && isCooldown) return 'bg-status-unstable';
    if (isActive) return 'bg-accent';
    return 'bg-muted';
  };

  const getGlowClass = () => {
    if (hasError) return 'shadow-[0_0_20px_hsl(var(--status-error)/0.5)]';
    if (isCapturing) return 'shadow-[0_0_25px_hsl(var(--status-capturing)/0.6)]';
    if (isActive && isArmed) return 'shadow-[0_0_20px_hsl(var(--status-stable)/0.5)]';
    if (isActive) return 'shadow-[0_0_15px_hsl(var(--accent)/0.4)]';
    return '';
  };

  const getLabel = () => {
    if (hasError) return 'Erreur';
    if (isCapturing) return 'Capture...';
    if (isCooldown) return 'Attente...';
    if (isArmed) return isActive ? 'Détecté' : 'Armé';
    return isActive ? 'Présence' : 'Vide';
  };

  const indicator = (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div 
        className={cn(
          'rounded-full flex items-center justify-center transition-all duration-200',
          sizeClasses[size],
          getBackgroundClass(),
          getGlowClass()
        )}
      >
        {hasError ? (
          <AlertTriangle className={cn(iconClasses[size], 'text-background')} />
        ) : isActive ? (
          <Eye className={cn(iconClasses[size], 'text-background')} />
        ) : (
          <EyeOff className={cn(iconClasses[size], 'text-muted-foreground')} />
        )}
      </div>
      
      {showLabel && (
        <span className={cn(
          'text-xs font-medium uppercase tracking-wider',
          hasError ? 'text-status-error' : isActive ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {getLabel()}
        </span>
      )}
    </div>
  );

  // Wrap with tooltip if there's an error
  if (hasError) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {indicator}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground">
            <p className="text-sm font-medium text-status-error">Erreur capteur</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return indicator;
}
