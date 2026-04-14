import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { useProducts } from '@/hooks/useProductionData';
import { useSensorData } from '@/hooks/useSensorData';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Play, Pause, CheckCircle, XCircle, LogOut, Scale, Maximize, Minimize, Square, PlusCircle, Package } from 'lucide-react';
import { PalletKiosk } from './PalletKiosk';

interface Line { id: string; name: string; status?: string; scale_url?: string | null; pallet_scale_url?: string | null }
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
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [mode, setMode] = useState<'unit' | 'pallet'>('unit');

  const selectedLine = useMemo(() => lines.find(l => l.id === lineId) || null, [lines, lineId]);
  const sensor = useSensorData({ scaleUrl: selectedLine?.scale_url, pollingInterval: 800 });
  const activeTask = useMemo(() => tasks.find(t => t.id === activeTaskId) || null, [tasks, activeTaskId]);
  const isTaskRunning = activeTask?.status === 'in_progress';
  const isTaskActive = activeTask && activeTask.status !== 'completed' && activeTask.status !== 'cancelled';

  const stats = useMemo(() => {
    const conformes = recentItems.filter(i => i.status === 'conforme').length;
    const nonConformes = recentItems.filter(i => i.status === 'non_conforme').length;
    const total = recentItems.length;
    const tauxConformite = total > 0 ? Math.round((conformes / total) * 100) : 0;
    return { conformes, nonConformes, total, tauxConformite };
  }, [recentItems]);

  const loadLines = useCallback(async () => {
    const data = await apiClient.getLines();
    setLines(data as any);
    if (!lineId && (data as any[]).length) setLineId((data as any[])[0].id);
  }, [lineId]);

  const loadTasks = useCallback(async (lId: string) => {
    if (!lId) return;
    const data = await apiClient.getTasksForLine(lId);
    setTasks(data as any);
    const allTasks = data as any[];
    const inProgress = allTasks.find(t => t.status === 'in_progress');
    const paused = allTasks.find(t => t.status === 'paused');
    const pending = allTasks.find(t => t.status === 'pending');
    if (inProgress) {
      setActiveTaskId(inProgress.id);
    } else if (paused) {
      setActiveTaskId(paused.id);
    } else if (pending) {
      setActiveTaskId(pending.id);
    } else {
      setActiveTaskId('');
      setRecentItems([]);
    }
  }, []);

  const loadRecentItems = useCallback(async (taskId: string) => {
    if (!taskId) { setRecentItems([]); return; }
    try {
      const data = await apiClient.getProductionItems(taskId);
      setRecentItems((data as any[]).slice(0, 50));
    } catch {
      setRecentItems([]);
    }
  }, []);

  useEffect(() => { loadLines().catch(() => {}); }, []);

  useEffect(() => {
    if (!lineId) return;
    loadTasks(lineId).catch(() => {});
    const t = setInterval(() => loadTasks(lineId).catch(() => {}), 3000);
    return () => clearInterval(t);
  }, [lineId]);

  useEffect(() => {
    if (activeTaskId) {
      loadRecentItems(activeTaskId).catch(() => {});
      const itemsInterval = setInterval(() => loadRecentItems(activeTaskId).catch(() => {}), 3000);
      return () => clearInterval(itemsInterval);
    } else {
      setRecentItems([]);
    }
  }, [activeTaskId]);

  useEffect(() => {
    const enterFullscreen = () => {
      if (!document.fullscreenElement && !embedded) {
        document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      }
    };
    document.addEventListener('touchstart', enterFullscreen, { once: true });
    return () => document.removeEventListener('touchstart', enterFullscreen);
  }, [embedded]);

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
      setShowCreateTask(false);
      toast({ title: 'Tâche créée', description: 'Vous pouvez démarrer la production.' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || 'Impossible de créer la tâche', variant: 'destructive' });
    }
  };

  const setStatus = async (status: string) => {
    if (!activeTaskId) return;
    try {
      await apiClient.updateTaskStatus(activeTaskId, status);
      if (status === 'completed' || status === 'cancelled') {
        setActiveTaskId('');
        setRecentItems([]);
        setShowCreateTask(false);
      }
      await loadTasks(lineId);
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || 'Impossible de changer le statut', variant: 'destructive' });
    }
  };

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
      toast({ title: label, description: `Poids: ${weight.toFixed(3)}` });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || "Impossible d'enregistrer", variant: 'destructive' });
    }
  };

  const weightColor = sensor.weight.status === 'stable' ? 'text-green-400' :
    sensor.weight.status === 'unstable' ? 'text-orange-400' :
    sensor.weight.status === 'error' ? 'text-red-400' : 'text-gray-500';

  const weightBorderColor = sensor.weight.status === 'stable' ? 'border-green-500/60 bg-green-500/5' :
    sensor.weight.status === 'unstable' ? 'border-orange-500/60 bg-orange-500/5' :
    sensor.weight.status === 'error' ? 'border-red-500/60 bg-red-500/5' : 'border-border';

  const badgeColor = sensor.weight.status === 'stable' ? 'bg-green-600 text-white' :
    sensor.weight.status === 'unstable' ? 'bg-orange-500 text-white animate-pulse' :
    sensor.weight.status === 'error' ? 'bg-red-600 text-white' : 'bg-gray-600 text-white';

  const badgeLabel = sensor.weight.status === 'stable' ? 'Stable' :
    sensor.weight.status === 'unstable' ? 'Instable' :
    sensor.weight.status === 'error' ? 'Erreur' : 'Hors ligne';

  // === Indicateur automatique de l'état du poids par rapport aux tolérances ===
  const weightState = useMemo(() => {
    if (!activeTask?.target_weight || !activeTask?.tolerance_min || !activeTask?.tolerance_max) return null;
    const w = sensor.weight.value;
    if (w === 0) return null;
    if (w < activeTask.tolerance_min) return { label: 'Sous-poids', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/50', icon: '▼' };
    if (w > activeTask.tolerance_max) return { label: 'Surpoids', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/50', icon: '▲' };
    return { label: 'Dans la tolérance', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/50', icon: '●' };
  }, [sensor.weight.value, activeTask?.target_weight, activeTask?.tolerance_min, activeTask?.tolerance_max]);

  const progressPct = activeTask ? Math.min(100, (activeTask.produced_quantity / activeTask.target_quantity) * 100) : 0;

  return (
    <div className={`${embedded ? '' : 'h-screen'} bg-background flex flex-col overflow-hidden select-none`}>
      {/* ===== TOP BAR ===== */}
      <header className="flex-shrink-0 bg-card border-b border-border px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={lineId} onValueChange={(v) => { setLineId(v); setActiveTaskId(''); setShowCreateTask(false); }}>
            <SelectTrigger className="h-9 w-40 text-sm font-medium">
              <SelectValue placeholder="Ligne" />
            </SelectTrigger>
            <SelectContent>
              {lines.map(l => (
                <SelectItem key={l.id} value={l.id} className="text-sm">{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Mode toggle: Unit / Pallet */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <Button
              variant={mode === 'unit' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('unit')}
              className={`h-8 px-3 text-xs font-medium touch-manipulation ${mode === 'unit' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
            >
              <Scale className="w-3.5 h-3.5 mr-1" />
              Pesage
            </Button>
            <Button
              variant={mode === 'pallet' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('pallet')}
              className={`h-8 px-3 text-xs font-medium touch-manipulation ${mode === 'pallet' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
            >
              <Package className="w-3.5 h-3.5 mr-1" />
              Palettes
            </Button>
          </div>

          {/* Task info badge (unit mode only) */}
          {mode === 'unit' && isTaskActive && activeTask && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground truncate max-w-[200px]">
                {activeTask.product_name} {activeTask.product_reference ? `(${activeTask.product_reference})` : ''}
              </span>
              <Badge className={`text-xs ${
                activeTask.status === 'in_progress' ? 'bg-green-600 text-white' :
                activeTask.status === 'paused' ? 'bg-yellow-600 text-white' :
                'bg-gray-600 text-white'
              }`}>
                {activeTask.status === 'in_progress' ? 'En cours' :
                 activeTask.status === 'paused' ? 'En pause' :
                 activeTask.status === 'pending' ? 'En attente' : activeTask.status}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {activeTask.produced_quantity}/{activeTask.target_quantity}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="w-8 h-8 touch-manipulation">
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={logout} className="w-8 h-8 touch-manipulation">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      {mode === 'pallet' ? (
        <PalletKiosk
          lineId={lineId}
          lines={lines}
          onSwitchToUnit={() => setMode('unit')}
        />
      ) : (
        <div className="flex-1 flex flex-col min-h-0 p-2 gap-2">

          {/* === ROW 1: Weight + Action Buttons === */}
          <div className="flex-1 flex gap-2 min-h-0">

            {/* LEFT: Weight Display */}
            <div className={`flex-1 rounded-xl border-2 p-2 flex flex-col items-center justify-center transition-all duration-300 ${weightBorderColor}`}>
              <div className="flex items-center gap-2 mb-1">
                <Scale className={`w-5 h-5 ${weightColor}`} />
                <span className="text-sm text-muted-foreground">Poids actuel</span>
                <Badge className={`${badgeColor} text-xs`}>{badgeLabel}</Badge>
              </div>

              <div className={`text-5xl sm:text-6xl md:text-7xl font-bold font-mono leading-none tracking-tight transition-colors duration-300 ${weightColor} ${sensor.weight.status === 'unstable' ? 'animate-pulse' : ''}`}>
                {sensor.weight.value.toFixed(3)}
              </div>

              {activeTask?.target_weight && (
                <div className="mt-1 text-sm text-muted-foreground">
                  Cible: <span className="font-mono font-medium text-foreground">{activeTask.target_weight}</span>
                  <span className="mx-1">|</span>
                  Min: <span className="font-mono">{activeTask.tolerance_min}</span>
                  <span className="mx-1">—</span>
                  Max: <span className="font-mono">{activeTask.tolerance_max}</span>
                </div>
              )}

              {weightState && (
                <div className={`mt-1 px-4 py-1 rounded-lg border text-sm font-semibold ${weightState.bg} ${weightState.color}`}>
                  {weightState.icon} {weightState.label}
                </div>
              )}

              {sensor.weight.status === 'unstable' && (
                <div className="mt-2 text-sm text-orange-400 font-medium animate-pulse">
                  Stabilisation en cours...
                </div>
              )}

              {isTaskActive && activeTask && (
                <div className="w-full max-w-md mt-3">
                  <div className="w-full bg-gray-700/50 rounded-full h-2.5">
                    <div
                      className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{activeTask.produced_quantity} pesé(s)</span>
                    <span>{activeTask.target_quantity} cible</span>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Action buttons */}
            <div className="w-48 sm:w-56 md:w-64 flex flex-col gap-2">
              {isTaskActive && activeTask && (
                <div className="flex flex-col gap-1.5">
                  {activeTask.status !== 'in_progress' ? (
                    <Button
                      onClick={() => setStatus('in_progress')}
                      className="h-14 text-base font-semibold bg-green-600 hover:bg-green-700 text-white touch-manipulation"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Démarrer
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setStatus('paused')}
                      className="h-12 text-sm font-medium bg-yellow-600 hover:bg-yellow-700 text-white touch-manipulation"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </Button>
                  )}
                  <Button
                    onClick={() => setStatus('completed')}
                    variant="outline"
                    className="h-10 text-sm border-blue-600/50 text-blue-400 hover:bg-blue-600/20 touch-manipulation"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Terminer
                  </Button>
                </div>
              )}

              {isTaskRunning ? (
                <>
                  <Button
                    onClick={() => confirmWeighing('conforme')}
                    disabled={sensor.weight.status !== 'stable'}
                    className="flex-1 min-h-[80px] text-xl sm:text-2xl font-bold bg-green-600 hover:bg-green-500 active:bg-green-700 text-white disabled:opacity-30 rounded-xl touch-manipulation transition-all duration-150 active:scale-95"
                  >
                    <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 mr-2 flex-shrink-0" />
                    Conforme
                  </Button>
                  <Button
                    onClick={() => confirmWeighing('non_conforme')}
                    disabled={sensor.weight.status !== 'stable'}
                    className="flex-1 min-h-[80px] text-xl sm:text-2xl font-bold bg-red-600 hover:bg-red-500 active:bg-red-700 text-white disabled:opacity-30 rounded-xl touch-manipulation transition-all duration-150 active:scale-95"
                  >
                    <XCircle className="w-7 h-7 sm:w-8 sm:h-8 mr-2 flex-shrink-0" />
                    Non conforme
                  </Button>
                </>
              ) : !isTaskActive ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <div className="text-sm text-muted-foreground text-center">Aucune tâche active</div>
                  <Button
                    onClick={() => setShowCreateTask(!showCreateTask)}
                    variant="outline"
                    className="h-14 w-full text-base touch-manipulation"
                  >
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Nouvelle tâche
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-sm text-muted-foreground text-center px-2">
                    {activeTask?.status === 'paused'
                      ? 'Tâche en pause. Appuyez sur Démarrer.'
                      : 'Démarrez la tâche pour peser.'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* === ROW 2: Stats + Recent items === */}
          <div className="flex-shrink-0 flex gap-2 h-36 sm:h-40">
            <div className="w-48 sm:w-56 md:w-64 rounded-xl border border-border bg-card p-3 flex flex-col justify-center">
              {stats.total > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-1.5 text-center mb-2">
                    <div className="rounded-lg bg-green-600/10 py-1.5">
                      <div className="text-xl sm:text-2xl font-bold text-green-400">{stats.conformes}</div>
                      <div className="text-[10px] text-green-400/70">Conformes</div>
                    </div>
                    <div className="rounded-lg bg-red-600/10 py-1.5">
                      <div className="text-xl sm:text-2xl font-bold text-red-400">{stats.nonConformes}</div>
                      <div className="text-[10px] text-red-400/70">Non conf.</div>
                    </div>
                    <div className="rounded-lg bg-blue-600/10 py-1.5">
                      <div className="text-xl sm:text-2xl font-bold text-blue-400">{stats.total}</div>
                      <div className="text-[10px] text-blue-400/70">Total</div>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Conformité</span>
                      <span className={stats.tauxConformite >= 90 ? 'text-green-400' : stats.tauxConformite >= 70 ? 'text-yellow-400' : 'text-red-400'}>
                        {stats.tauxConformite}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          stats.tauxConformite >= 90 ? 'bg-green-500' : stats.tauxConformite >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${stats.tauxConformite}%` }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground text-center">Aucun pesage</div>
              )}
            </div>

            <div className="flex-1 rounded-xl border border-border bg-card p-2 overflow-hidden">
              <div className="text-xs text-muted-foreground mb-1.5 px-1 font-medium">Derniers pesages</div>
              {recentItems.length > 0 ? (
                <div className="flex flex-col gap-1 overflow-y-auto h-[calc(100%-24px)] pr-1">
                  {recentItems.slice(0, 15).map((item, idx) => (
                    <div key={item.id} className={`flex items-center justify-between rounded-md border px-2 py-1 text-xs ${
                      item.status === 'conforme' ? 'border-green-600/20 bg-green-600/5' : 'border-red-600/20 bg-red-600/5'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-5">#{recentItems.length - idx}</span>
                        <span className="font-mono font-medium text-sm">{Number(item.weight).toFixed(3)}</span>
                      </div>
                      <span className={`text-[10px] font-medium ${
                        item.status === 'conforme' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {item.status === 'conforme' ? 'OK' : 'NOK'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground text-center py-4">Aucun pesage</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== CREATE TASK MODAL ===== */}
      {showCreateTask && !isTaskActive && mode === 'unit' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowCreateTask(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-center">Nouvelle tâche</h2>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Produit</label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger className="h-12 text-base touch-manipulation">
                    <SelectValue placeholder="Choisir un produit" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-base py-3 touch-manipulation">
                        {p.name} {p.reference ? `(${p.reference})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Quantité cible</label>
                <Input
                  type="number"
                  value={targetQty}
                  onChange={(e) => setTargetQty(parseInt(e.target.value || '0', 10))}
                  className="h-12 text-lg text-center font-mono touch-manipulation"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCreateTask(false)}
                className="flex-1 h-14 text-base touch-manipulation"
              >
                Annuler
              </Button>
              <Button
                onClick={createTask}
                disabled={!lineId || !productId}
                className="flex-1 h-14 text-base bg-green-600 hover:bg-green-700 text-white touch-manipulation"
              >
                Créer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
