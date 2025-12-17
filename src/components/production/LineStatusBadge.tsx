import { LineState } from '@/types/production';
import { cn } from '@/lib/utils';
import { Play, Pause, Square, Zap, AlertCircle, Loader2 } from 'lucide-react';

interface LineStatusBadgeProps {
  state: LineState;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const stateConfig: Record<LineState, { 
  label: string; 
  icon: typeof Play;
  badgeClass: string;
}> = {
  IDLE: { 
    label: 'En attente', 
    icon: Square,
    badgeClass: 'line-badge-idle'
  },
  RUNNING: { 
    label: 'En cours', 
    icon: Play,
    badgeClass: 'line-badge-active'
  },
  PAUSED: { 
    label: 'En pause', 
    icon: Pause,
    badgeClass: 'line-badge-paused'
  },
  CAPTURING: { 
    label: 'Capture', 
    icon: Zap,
    badgeClass: 'line-badge-active'
  },
  COOLDOWN: { 
    label: 'Cooldown', 
    icon: Loader2,
    badgeClass: 'line-badge-paused'
  },
  ERROR: { 
    label: 'Erreur', 
    icon: AlertCircle,
    badgeClass: 'line-badge-error'
  },
};

export function LineStatusBadge({ state, size = 'md', showIcon = true, className }: LineStatusBadgeProps) {
  const config = stateConfig[state];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-5 py-2.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className={cn(
      'line-badge',
      config.badgeClass,
      sizeClasses[size],
      className
    )}>
      {showIcon && (
        <Icon className={cn(
          iconSizes[size],
          state === 'COOLDOWN' && 'animate-spin'
        )} />
      )}
      <span className="font-semibold">{config.label}</span>
    </div>
  );
}
