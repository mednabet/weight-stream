import { ProductionTask } from '@/types/production';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';

interface TaskControlsProps {
  task?: ProductionTask;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  disabled?: boolean;
  className?: string;
}

export function TaskControls({ 
  task, 
  onStart, 
  onPause, 
  onResume, 
  onStop,
  disabled = false,
  className 
}: TaskControlsProps) {
  const isActive = task?.state === 'active';
  const isPaused = task?.state === 'paused';
  const hasTask = !!task;

  return (
    <div className={cn('flex gap-3', className)}>
      {!hasTask ? (
        // No task - show start button
        <Button
          variant="touch"
          size="touch-lg"
          onClick={onStart}
          disabled={disabled}
          className="flex-1"
        >
          <Play className="w-6 h-6 mr-2" />
          Démarrer production
        </Button>
      ) : isActive ? (
        // Active task - show pause and stop
        <>
          <Button
            variant="touch-warning"
            size="touch-lg"
            onClick={onPause}
            disabled={disabled}
            className="flex-1"
          >
            <Pause className="w-6 h-6 mr-2" />
            Pause
          </Button>
          <Button
            variant="touch-danger"
            size="touch-lg"
            onClick={onStop}
            disabled={disabled}
            className="flex-1"
          >
            <Square className="w-6 h-6 mr-2" />
            Arrêter
          </Button>
        </>
      ) : isPaused ? (
        // Paused task - show resume and stop
        <>
          <Button
            variant="touch"
            size="touch-lg"
            onClick={onResume}
            disabled={disabled}
            className="flex-1"
          >
            <RotateCcw className="w-6 h-6 mr-2" />
            Reprendre
          </Button>
          <Button
            variant="touch-danger"
            size="touch-lg"
            onClick={onStop}
            disabled={disabled}
          >
            <Square className="w-6 h-6" />
          </Button>
        </>
      ) : null}
    </div>
  );
}
