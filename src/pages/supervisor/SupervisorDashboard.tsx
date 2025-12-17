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

export function SupervisorDashboard() {
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => window.location.href = '/'}
              className="mr-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Factory className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">Dashboard Superviseur</h1>
                <p className="text-sm text-muted-foreground">Gestion de la production</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary">
              <span className="text-sm font-medium">{user?.email}</span>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={soundEnabled ? "default" : "ghost"} 
                    size="icon" 
                    onClick={() => setSoundEnabled(!soundEnabled)}
                  >
                    {soundEnabled ? (
                      <Volume2 className="w-5 h-5" />
                    ) : (
                      <VolumeX className="w-5 h-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {soundEnabled ? "Désactiver les sons d'alerte" : "Activer les sons d'alerte"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-[1920px] mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Button 
                variant={activeTab === 'overview' ? 'default' : 'outline'}
                onClick={() => setActiveTab('overview')}
                className="gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                Vue d'ensemble
              </Button>
              <Button 
                variant={activeTab === 'live-lines' ? 'default' : 'outline'}
                onClick={() => setActiveTab('live-lines')}
                className="gap-2"
              >
                <Activity className="w-4 h-4" />
                Lignes en direct
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Settings className="w-4 h-4" />
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
