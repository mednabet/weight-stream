import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { DashboardOverview } from '@/components/supervisor/DashboardOverview';
import { ProductsManagement } from '@/components/supervisor/ProductsManagement';
import { LinesManagement } from '@/components/supervisor/LinesManagement';
import { TasksManagement } from '@/components/supervisor/TasksManagement';
import { OperatorsManagement } from '@/components/supervisor/OperatorsManagement';
import { TerminalsManagement } from '@/components/supervisor/TerminalsManagement';
import { LiveLinesStatus } from '@/components/supervisor/LiveLinesStatus';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { 
  Factory, LogOut, Users, Package, ClipboardList, ArrowLeft, Monitor, LayoutDashboard, Volume2, VolumeX, Settings, Activity
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SupervisorDashboardProps {
  embedded?: boolean;
}

export function SupervisorDashboard({ embedded = false }: SupervisorDashboardProps) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('supervisor-sound-enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('supervisor-sound-enabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);
  
  // Enable real-time notifications
  useRealtimeNotifications({
    enableTaskNotifications: true,
    enableSensorNotifications: true,
    enableProductionAlerts: true,
    enableSounds: soundEnabled,
  });

  return (
    <div className={embedded ? "bg-background" : "min-h-screen bg-background"}>
      {/* Header - hidden when embedded */}
      {!embedded && (
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => window.location.href = '/'}
              className="w-8 h-8 sm:w-10 sm:h-10 mr-1 sm:mr-2"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <div className="flex items-center gap-2 sm:gap-3">
              <Factory className="w-6 h-6 sm:w-8 sm:h-8 text-primary hidden sm:block" />
              <div>
                <h1 className="text-base sm:text-xl font-bold">Dashboard Superviseur</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Gestion de la production</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary">
              <span className="text-sm font-medium">{user?.email}</span>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={soundEnabled ? "default" : "ghost"} 
                    size="icon" 
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="w-8 h-8 sm:w-10 sm:h-10"
                  >
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {soundEnabled ? "Désactiver les sons d'alerte" : "Activer les sons d'alerte"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button variant="ghost" size="icon" onClick={logout} className="w-8 h-8 sm:w-10 sm:h-10">
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </header>
      )}

      <main className="p-3 sm:p-6 max-w-[1920px] mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 w-full">
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
              <Button 
                variant={activeTab === 'overview' ? 'default' : 'outline'}
                onClick={() => setActiveTab('overview')}
                className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4 flex-shrink-0"
              >
                <LayoutDashboard className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Vue d'ensemble</span>
                <span className="xs:hidden">Vue</span>
              </Button>
              <Button 
                variant={activeTab === 'live-lines' ? 'default' : 'outline'}
                onClick={() => setActiveTab('live-lines')}
                className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4 flex-shrink-0"
              >
                <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Lignes en direct</span>
                <span className="xs:hidden">Direct</span>
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4 w-full sm:w-auto">
                  <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                  Paramètres
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setActiveTab('lines')} className="gap-2 cursor-pointer">
                  <Factory className="w-4 h-4" />
                  Lignes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('terminals')} className="gap-2 cursor-pointer">
                  <Monitor className="w-4 h-4" />
                  Terminaux
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('products')} className="gap-2 cursor-pointer">
                  <Package className="w-4 h-4" />
                  Produits
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('tasks')} className="gap-2 cursor-pointer">
                  <ClipboardList className="w-4 h-4" />
                  Tâches
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('operators')} className="gap-2 cursor-pointer">
                  <Users className="w-4 h-4" />
                  Opérateurs
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <TabsContent value="overview">
            <DashboardOverview />
          </TabsContent>

          <TabsContent value="live-lines">
            <LiveLinesStatus />
          </TabsContent>

          <TabsContent value="lines">
            <LinesManagement />
          </TabsContent>

          <TabsContent value="terminals">
            <TerminalsManagement />
          </TabsContent>

          <TabsContent value="products">
            <ProductsManagement />
          </TabsContent>

          <TabsContent value="tasks">
            <TasksManagement />
          </TabsContent>

          <TabsContent value="operators">
            <OperatorsManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
