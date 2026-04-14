import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { useProducts } from '@/hooks/useProductionData';
import { useSensorData } from '@/hooks/useSensorData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Play, Pause, CheckCircle, XCircle, ArrowLeft, LogOut, Scale, BarChart3, Clock, Maximize, Minimize } from 'lucide-react';

interface Line { id: string; name: string; status?: string; scale_url?: string | null }
interface Task {
  id: string;
  line_id: string;
  product_id: string;
  status: string;
  target_quantity: number;
  produced_quantity: number;
  product_name?: string;
  product_reference?: string;
  target_weight?: number;
  tolerance_min?: number;
  tolerance_max?: number;
}
interface ProductionItem {
  id: string;
  weight: number;
  status: 'conforme' | 'non_conforme';
  captured_at: string;
  sequence: number;
}

interface OperatorKioskProps {
  embedded?: boolean;
}

export function OperatorKiosk({ embedded = false }: OperatorKioskProps) {
  const { user, logout } = useAuth();
  const { products } = useProducts();

  const [lines, setLines] = useState<Line[]>([]);
  const [lineId, setLineId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [targetQty, setTargetQty] = useState<number>(50);
  const [recentItems, setRecentItems] = useState<ProductionItem[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get the scale URL from the selected line
  const selectedLine = useMemo(() => lines.find(l => l.id === lineId) || null, [lines, lineId]);

  // Sensor: balance reads from the line's scale_url
  const sensor = useSensorData({ scaleUrl: selectedLine?.scale_url, pollingInterval: 800 });

  const activeTask = useMemo(() => tasks.find(t => t.id === activeTaskId) || null, [tasks, activeTaskId]);

  // Determine if the active task is running (in_progress)
  const isTaskRunning = activeTask?.status === 'in_progress';
  const isTaskActive = activeTask && activeTask.status !== 'completed' && activeTask.status !== 'cancelled';

  // Stats from recent items
  const stats = useMemo(() => {
    const conformes = recentItems.filter(i => i.status === 'conforme').length;
    const nonConformes = recentItems.filter(i => i.status === 'non_conforme').length;
    const total = recentItems.length;
    const tauxConformite = total > 0 ? Math.round((conformes / total) * 100) : 0;
    return { conformes, nonConformes, total, tauxConformite };
  }, [recentItems]);

  const loadLines = async () => {
    const data = await apiClient.getLines();
    setLines(data as any);
    if (!lineId && (data as any[]).length) setLineId((data as any[])[0].id);
  };

  const loadTasks = async (lId: string) => {
    if (!lId) return;
    const data = await apiClient.getTasksForLine(lId);
    setTasks(data as any);
    // Auto-select in_progress task, or keep current if still valid
    const inProgress = (data as any[]).find(t => t.status === 'in_progress');
    if (inProgress) {
      setActiveTaskId(inProgress.id);
    } else if (!activeTaskId || !(data as any[]).find(t => t.id === activeTaskId)) {
      // If no in_progress and current active is gone, select the first pending/paused
      const pending = (data as any[]).find(t => t.status === 'pending' || t.status === 'paused');
      if (pending) setActiveTaskId(pending.id);
    }
  };

  const loadRecentItems = async (taskId: string) => {
    if (!taskId) { setRecentItems([]); return; }
    try {
      const data = await apiClient.getProductionItems(taskId);
      setRecentItems((data as any[]).slice(0, 20));
    } catch {
      setRecentItems([]);
    }
  };

  useEffect(() => {
    loadLines().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!lineId) return;
    loadTasks(lineId).catch(() => {});
    const t = setInterval(() => loadTasks(lineId).catch(() => {}), 3000);
    return () => clearInterval(t);
  }, [lineId]);

  useEffect(() => {
    if (activeTaskId) {
      loadRecentItems(activeTaskId).catch(() => {});
    } else {
      setRecentItems([]);
    }
  }, [activeTaskId]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const createTask = async () => {
    if (!lineId || !productId || !targetQty) return;
    try {
      const created = await apiClient.createTask({
        line_id: lineId,
        product_id: productId,
        target_quantity: targetQty,
        operator_id: user?.id || null,
      });
      setActiveTaskId((created as any).id);
      await loadTasks(lineId);
      toast({ title: 'Tâche créée', description: 'Vous pouvez démarrer la production.' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || 'Impossible de créer la tâche', variant: 'destructive' });
    }
  };

  const setStatus = async (status: string) => {
    if (!activeTaskId) return;
    try {
      await apiClient.updateTaskStatus(activeTaskId, status);
      await loadTasks(lineId);
      if (status === 'completed') {
        // After completing, clear active task and reload
        setActiveTaskId('');
        setRecentItems([]);
      }
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || 'Impossible de changer le statut', variant: 'destructive' });
    }
  };

  // Confirm weighing with manual conformity status chosen by operator
  const confirmWeighing = async (conformityStatus: 'conforme' | 'non_conforme') => {
    if (!activeTaskId) return;
    const weight = sensor.weight.value || 0;
    if (!weight) {
      toast({ title: 'Poids invalide', description: 'Aucun poids détecté (ou 0).', variant: 'destructive' });
      return;
    }
    try {
      await apiClient.addProductionItem(activeTaskId, weight, conformityStatus);
      await loadTasks(lineId);
      await loadRecentItems(activeTaskId);
      const label = conformityStatus === 'conforme' ? 'Conforme' : 'Non conforme';
      toast({ title: `${label}`, description: `Poids enregistré: ${weight.toFixed(3)}` });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || "Impossible d'enregistrer le pesage", variant: 'destructive' });
    }
  };

  return (
    <div className={embedded ? "p-2 sm:p-4 space-y-3 sm:space-y-4" : "min-h-screen bg-background"}>
      {/* Header - only when not embedded */}
      {!embedded && (
        <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between max-w-[1920px] mx-auto">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => window.location.href = '/'}
                className="w-8 h-8 sm:w-10 sm:h-10"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold">Kiosk Opérateur</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">{user?.email || ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="w-8 h-8 sm:w-10 sm:h-10">
                {isFullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={logout} className="w-8 h-8 sm:w-10 sm:h-10">
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>
        </header>
      )}

      <div className={embedded ? "" : "p-3 sm:p-6 max-w-[1920px] mx-auto space-y-3 sm:space-y-4"}>
        {/* Header info when embedded */}
        {embedded && (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg sm:text-xl font-semibold">Kiosk opérateur</div>
              <div className="text-xs sm:text-sm text-muted-foreground">{user?.email || ''}</div>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          {/* ===== COLONNE GAUCHE : Choix ligne / tâche ===== */}
          <Card>
            <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Choix ligne / tâche</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 space-y-3">
              {/* Sélection ligne */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="text-xs sm:text-sm font-medium">Ligne</div>
                  <Select value={lineId} onValueChange={(v) => { setLineId(v); setActiveTaskId(''); }}>
                    <SelectTrigger className="h-10 sm:h-11">
                      <SelectValue placeholder="Choisir une ligne" />
                    </SelectTrigger>
                    <SelectContent>
                      {lines.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sélection produit - visible uniquement si pas de tâche active */}
                {!isTaskActive && (
                  <div className="space-y-1.5">
                    <div className="text-xs sm:text-sm font-medium">Produit</div>
                    <Select value={productId} onValueChange={setProductId}>
                      <SelectTrigger className="h-10 sm:h-11">
                        <SelectValue placeholder="Choisir un produit" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} {p.reference ? `(${p.reference})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Création de tâche - visible uniquement si pas de tâche active */}
              {!isTaskActive && (
                <div className="grid gap-3 sm:grid-cols-2 items-end">
                  <div className="space-y-1.5">
                    <div className="text-xs sm:text-sm font-medium">Quantité cible</div>
                    <Input 
                      type="number" 
                      value={targetQty} 
                      onChange={(e)=>setTargetQty(parseInt(e.target.value||'0',10))} 
                      className="h-10 sm:h-11"
                    />
                  </div>
                  <Button 
                    onClick={createTask} 
                    disabled={!lineId || !productId}
                    className="h-10 sm:h-11"
                  >
                    Créer une tâche
                  </Button>
                </div>
              )}

              {/* Tâche active */}
              <div className="pt-2 border-t space-y-2">
                <div className="text-xs sm:text-sm font-medium">Tâche active</div>
                {isTaskActive && activeTask ? (
                  <div className="rounded-lg border p-2 sm:p-3 space-y-2">
                    <div className="font-medium text-sm sm:text-base truncate">
                      {activeTask.product_name || ''} {activeTask.product_reference ? `(${activeTask.product_reference})` : ''}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Produit: {activeTask.produced_quantity}/{activeTask.target_quantity}
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, (activeTask.produced_quantity / activeTask.target_quantity) * 100)}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          activeTask.status === 'in_progress' ? 'bg-green-600/20 text-green-400 border-green-600/30' :
                          activeTask.status === 'paused' ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30' :
                          'bg-gray-600/20 text-gray-400'
                        }`}
                      >
                        {activeTask.status === 'in_progress' ? 'En cours' : 
                         activeTask.status === 'paused' ? 'En pause' : 
                         activeTask.status === 'pending' ? 'En attente' : activeTask.status}
                      </Badge>
                      <div className="flex gap-1 sm:gap-2">
                        {activeTask.status !== 'in_progress' && (
                          <Button size="sm" variant="outline" onClick={()=>setStatus('in_progress')} className="h-8 px-2 sm:px-3 border-green-600/50 text-green-400 hover:bg-green-600/20">
                            <Play className="w-3 h-3 sm:mr-1" />
                            <span className="hidden sm:inline">Démarrer</span>
                          </Button>
                        )}
                        {activeTask.status === 'in_progress' && (
                          <Button size="sm" variant="outline" onClick={()=>setStatus('paused')} className="h-8 px-2 sm:px-3 border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/20">
                            <Pause className="w-3 h-3 sm:mr-1" />
                            <span className="hidden sm:inline">Pause</span>
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={()=>setStatus('completed')} className="h-8 px-2 sm:px-3 border-blue-600/50 text-blue-400 hover:bg-blue-600/20">
                          <CheckCircle className="w-3 h-3 sm:mr-1" />
                          <span className="hidden sm:inline">Terminer</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs sm:text-sm text-muted-foreground">Aucune tâche active. Créez ou sélectionnez une tâche ci-dessous.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ===== COLONNE DROITE : Pesage & Confirmation manuelle ===== */}
          <Card>
            <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Scale className="w-5 h-5" />
                Pesage
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 space-y-4">
              {/* Weight display */}
              <div className={`flex items-center justify-between rounded-lg border p-3 sm:p-4 transition-all duration-300 ${
                sensor.weight.status === 'stable' ? 'border-green-500/50 bg-green-500/5' :
                sensor.weight.status === 'unstable' ? 'border-orange-500/50 bg-orange-500/5' :
                sensor.weight.status === 'error' ? 'border-red-500/50 bg-red-500/5' :
                'border-border'
              }`}>
                <div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Poids actuel</div>
                  <div className={`text-2xl sm:text-3xl md:text-4xl font-bold font-mono transition-colors duration-300 ${
                    sensor.weight.status === 'stable' ? 'text-green-400' :
                    sensor.weight.status === 'unstable' ? 'text-orange-400 animate-pulse' :
                    sensor.weight.status === 'error' ? 'text-red-400' :
                    'text-muted-foreground'
                  }`}>
                    {sensor.weight.value.toFixed(3)}
                  </div>
                </div>
                <Badge 
                  className={`text-xs sm:text-sm font-medium ${
                    sensor.weight.status === 'stable' ? 'bg-green-600 hover:bg-green-700 text-white' :
                    sensor.weight.status === 'unstable' ? 'bg-orange-500 hover:bg-orange-600 text-white animate-pulse' :
                    sensor.weight.status === 'error' ? 'bg-red-600 hover:bg-red-700 text-white' :
                    'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                >
                  {sensor.weight.status === 'stable' ? 'Stable' : 
                   sensor.weight.status === 'unstable' ? 'Instable' : 
                   sensor.weight.status === 'error' ? 'Erreur' : 'Hors ligne'}
                </Badge>
              </div>

              {/* Warning message when unstable */}
              {sensor.weight.status === 'unstable' && (
                <div className="text-xs sm:text-sm text-orange-400 text-center font-medium animate-pulse">
                  Balance instable — veuillez attendre la stabilisation avant de confirmer.
                </div>
              )}

              {/* Target weight info */}
              {activeTask && activeTask.target_weight && (
                <div className="text-xs sm:text-sm text-muted-foreground text-center">
                  Cible: {activeTask.target_weight} (min: {activeTask.tolerance_min} / max: {activeTask.tolerance_max})
                </div>
              )}

              {/* Manual confirmation buttons - only when task is in_progress */}
              {isTaskRunning ? (
                <div className="space-y-2">
                  <div className="text-xs sm:text-sm font-medium text-center text-muted-foreground">
                    Confirmez le pesage et l'état du produit
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={() => confirmWeighing('conforme')} 
                      disabled={sensor.weight.status !== 'stable'}
                      className="h-14 sm:h-16 text-base sm:text-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-40"
                    >
                      <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                      Conforme
                    </Button>
                    <Button 
                      onClick={() => confirmWeighing('non_conforme')} 
                      disabled={sensor.weight.status !== 'stable'}
                      variant="destructive"
                      className="h-14 sm:h-16 text-base sm:text-lg disabled:opacity-40"
                    >
                      <XCircle className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                      Non conforme
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    {sensor.weight.status === 'stable' 
                      ? "L'opérateur confirme manuellement le poids lu et l'état de conformité du produit."
                      : sensor.weight.status === 'unstable'
                        ? 'Les boutons sont désactivés tant que la balance est instable.'
                        : 'Connectez une balance pour activer le pesage.'
                    }
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground">
                    {!isTaskActive 
                      ? "Sélectionnez ou créez une tâche pour commencer le pesage."
                      : activeTask?.status === 'paused' 
                        ? "La tâche est en pause. Cliquez sur Démarrer pour reprendre le pesage."
                        : "Démarrez la tâche pour activer le pesage."
                    }
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ===== SECTION STATISTIQUES + HISTORIQUE ===== */}
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
          {/* Statistiques */}
          <Card>
            <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Statistiques
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {stats.total > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-green-600/10 border border-green-600/20 p-2">
                      <div className="text-lg sm:text-xl font-bold text-green-400">{stats.conformes}</div>
                      <div className="text-xs text-green-400/70">Conformes</div>
                    </div>
                    <div className="rounded-lg bg-red-600/10 border border-red-600/20 p-2">
                      <div className="text-lg sm:text-xl font-bold text-red-400">{stats.nonConformes}</div>
                      <div className="text-xs text-red-400/70">Non conf.</div>
                    </div>
                    <div className="rounded-lg bg-blue-600/10 border border-blue-600/20 p-2">
                      <div className="text-lg sm:text-xl font-bold text-blue-400">{stats.total}</div>
                      <div className="text-xs text-blue-400/70">Total</div>
                    </div>
                  </div>
                  {/* Taux de conformité */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Taux de conformité</span>
                      <span className={stats.tauxConformite >= 90 ? 'text-green-400' : stats.tauxConformite >= 70 ? 'text-yellow-400' : 'text-red-400'}>
                        {stats.tauxConformite}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          stats.tauxConformite >= 90 ? 'bg-green-500' : stats.tauxConformite >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${stats.tauxConformite}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs sm:text-sm text-muted-foreground text-center py-4">
                  Aucune donnée de pesage pour cette tâche.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historique des derniers pesages */}
          <Card className="lg:col-span-2">
            <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Derniers pesages
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {recentItems.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {recentItems.map((item, idx) => (
                    <div key={item.id} className={`flex items-center justify-between rounded-md border p-2 text-sm ${
                      item.status === 'conforme' ? 'border-green-600/20 bg-green-600/5' : 'border-red-600/20 bg-red-600/5'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-6">#{recentItems.length - idx}</span>
                        <span className="font-mono font-medium">{Number(item.weight).toFixed(3)}</span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          item.status === 'conforme' ? 'border-green-600/50 text-green-400' : 'border-red-600/50 text-red-400'
                        }`}
                      >
                        {item.status === 'conforme' ? 'Conforme' : 'Non conforme'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs sm:text-sm text-muted-foreground text-center py-4">
                  Aucun pesage enregistré pour cette tâche.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dernières tâches */}
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Dernières tâches</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {tasks.length === 0 ? (
              <div className="text-xs sm:text-sm text-muted-foreground">Aucune tâche pour cette ligne.</div>
            ) : (
              <div className="space-y-2">
                {tasks.slice(0, 10).map(t => (
                  <div key={t.id} className={`flex items-center justify-between rounded-lg border p-2 sm:p-3 gap-2 ${
                    t.id === activeTaskId ? 'border-blue-500/50 bg-blue-500/5' : ''
                  }`}>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm sm:text-base truncate">
                        {t.product_name || ''} {t.product_reference ? `(${t.product_reference})` : ''}
                      </div>
                      <div className="text-xs text-muted-foreground">{t.produced_quantity}/{t.target_quantity}</div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          t.status === 'in_progress' ? 'border-green-600/50 text-green-400' :
                          t.status === 'paused' ? 'border-yellow-600/50 text-yellow-400' :
                          t.status === 'completed' ? 'border-blue-600/50 text-blue-400' :
                          t.status === 'pending' ? 'border-gray-600/50 text-gray-400' :
                          ''
                        }`}
                      >
                        {t.status === 'in_progress' ? 'En cours' :
                         t.status === 'paused' ? 'En pause' :
                         t.status === 'completed' ? 'Terminée' :
                         t.status === 'pending' ? 'En attente' :
                         t.status}
                      </Badge>
                      {t.id !== activeTaskId && t.status !== 'completed' && t.status !== 'cancelled' && (
                        <Button size="sm" variant="outline" onClick={()=>setActiveTaskId(t.id)} className="h-8 text-xs sm:text-sm">
                          Activer
                        </Button>
                      )}
                      {t.id === activeTaskId && (
                        <Badge className="bg-blue-600 text-white text-xs">Active</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
