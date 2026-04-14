import { WeightReading, Product } from '@/types/production';
import { cn } from '@/lib/utils';
import { Scale, AlertTriangle, WifiOff, CheckCircle } from 'lucide-react';
import { convertWeight, formatWeight } from '@/lib/weight-conversion';

interface WeightDisplayProps {
  weight: WeightReading;
  product?: Product;
  lineUnit?: string; // Unit from the production line (scale unit)
  decimalPrecision?: number; // Decimal precision from weight unit config
  showStatus?: boolean;
  showValidity?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function WeightDisplay({ weight, product, lineUnit = 'g', decimalPrecision, showStatus = true, showValidity = true, size = 'lg', className }: WeightDisplayProps) {
  // Scale returns weight already in lineUnit (configured unit for the line)
  const displayUnit = lineUnit;
  const displayValue = weight.status === 'error' || weight.status === 'offline' 
    ? 0 
    : weight.value;
  
  // Convert from lineUnit to product unit for validation
  const productUnit = product?.unit || lineUnit;
  const validationValue = weight.status === 'error' || weight.status === 'offline' 
    ? 0 
    : convertWeight(weight.value, lineUnit, productUnit);

  const getStatusColor = () => {
    if (weight.status === 'error') return 'text-status-error';
    if (weight.status === 'unstable') return 'text-status-unstable';
    if (weight.status === 'offline') return 'text-status-offline';
    return 'text-status-stable';
  };

  const getStatusDotClass = () => {
    switch (weight.status) {
      case 'stable': return 'status-dot-stable';
      case 'unstable': return 'status-dot-unstable';
      case 'error': return 'status-dot-error';
      default: return 'status-dot-offline';
    }
  };

  // Validity is now determined manually by the operator
  const validity = null;

  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl',
  };

  const unitClasses = {
    sm: 'text-xs ml-1',
    md: 'text-base ml-1',
    lg: 'text-xl ml-1',
  };

  const formattedValue = weight.status === 'error' ? '---' : formatWeight(displayValue, displayUnit, decimalPrecision);

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      {/* Weight value with status inline */}
      <div className="flex items-center gap-3">
        {showStatus && (
          <div className="flex items-center gap-1.5">
            <div className={cn('status-dot', getStatusDotClass())} />
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              {weight.status === 'stable' ? 'Stable' : 
               weight.status === 'unstable' ? 'Instable' : 
               weight.status === 'error' ? 'Erreur' : 'Hors ligne'}
            </span>
          </div>
        )}
      </div>

      {/* Weight value */}
      <div className={cn('font-mono font-bold tracking-tight flex items-baseline', sizeClasses[size], getStatusColor())}>
        {weight.status === 'error' ? (
          <AlertTriangle className={cn(size === 'lg' ? 'w-12 h-12' : size === 'md' ? 'w-8 h-8' : 'w-5 h-5')} />
        ) : weight.status === 'offline' ? (
          <WifiOff className={cn(size === 'lg' ? 'w-12 h-12' : size === 'md' ? 'w-8 h-8' : 'w-5 h-5')} />
        ) : (
          <>
            <span style={{ textShadow: '0 0 30px currentColor' }}>{formattedValue}</span>
            <span className={cn('text-muted-foreground font-medium', unitClasses[size])}>{displayUnit}</span>
          </>
        )}
      </div>

      {/* Target info */}
      {product && (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            Cible: {product.targetWeight}{productUnit} ({product.minWeight}-{product.maxWeight})
          </span>
        </div>
      )}
    </div>
  );
}
