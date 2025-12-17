import { useAuth } from '@/contexts/AuthContext';
import { ProductionLine } from '@/types/production';
import { Button } from '@/components/ui/button';
import { LineStatusBadge } from '@/components/production/LineStatusBadge';
import { cn } from '@/lib/utils';
import { LogOut, User, Wifi, WifiOff, Settings, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface KioskHeaderProps {
  line?: ProductionLine;
  isOnline?: boolean;
  onLogout?: () => void;
  onSettings?: () => void;
  className?: string;
}

export function KioskHeader({ line, isOnline = true, onLogout, onSettings, className }: KioskHeaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className={cn(
      'flex items-center justify-between px-6 py-4 bg-card/50 backdrop-blur-sm border-b border-border',
      className
    )}>
      {/* Line info */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/')}
          className="mr-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {line && (
          <>
            <div>
              <h1 className="text-xl font-bold">{line.name}</h1>
              <div className="text-sm text-muted-foreground font-mono">{line.code}</div>
            </div>
            <LineStatusBadge state={line.state} size="md" />
          </>
        )}
      </div>

      {/* Center - Connection status */}
      <div className="flex items-center gap-2">
        {isOnline ? (
          <div className="flex items-center gap-2 text-status-stable">
            <Wifi className="w-5 h-5" />
            <span className="text-sm font-medium">Connecté</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-status-error animate-pulse">
            <WifiOff className="w-5 h-5" />
            <span className="text-sm font-medium">Hors ligne</span>
          </div>
        )}
      </div>

      {/* User info and actions */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground">
            <User className="w-4 h-4" />
            <span className="font-medium">{user.email}</span>
          </div>
        )}
        
        {onSettings && (
          <Button variant="ghost" size="icon-lg" onClick={onSettings}>
            <Settings className="w-5 h-5" />
          </Button>
        )}
        
        {onLogout && (
          <Button variant="touch-secondary" onClick={onLogout} className="gap-2">
            <LogOut className="w-5 h-5" />
            Déconnexion
          </Button>
        )}
      </div>
    </header>
  );
}
