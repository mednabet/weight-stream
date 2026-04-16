import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { useProducts } from '@/hooks/useProductionData';
import { useSensorData } from '@/hooks/useSensorData';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, CheckCircle, XCircle, LogOut, Scale, Maximize, Minimize, Square, PlusCircle, Package, Activity, TrendingUp, Clock, ChevronRight, Undo2, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
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

/* ─── Panel message type ─── */
interface PanelMessage {
  text: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

/* ─────────────── Panel wrapper component ─────────────── */
function Panel({ title, icon, children, className = '', headerRight }: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl bg-[#111827]/80 border border-slate-700/50 flex flex-col overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/40 bg-slate-800/30">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{title}</span>
        </div>
        {headerRight}
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
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

  // Panel message state (replaces toast)
  const [panelMessage, setPanelMessage] = useState<PanelMessage | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const showMessage = useCallback((text: string, type: PanelMessage['type'] = 'info') => {
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    setPanelMessage({ text, type });
    messageTimerRef.current = setTimeout(() => {
      setPanelMessage(null);
      messageTimerRef.current = null;
    }, 3000);
  }, []);

  const selectedLine = useMemo(() => lines.find(l => l.id === lineId) || null, [lines, lineId]);
  const sensor = useSensorData({
    scaleUrl: selectedLine?.scale_url,
    pollingInterval: 800,
    stableReadingsRequired: 3,  // 3 lectures stables concordantes requises (~2.4s à 800ms)
    stableDeviation: 0.5,       // écart max 0.5 entre les lectures
  });
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
      showMessage('Tâche créée avec succès', 'success');
    } catch (e: any) {
      showMessage(e?.message || 'Impossible de créer la tâche', 'error');
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
      const labels: Record<string, string> = {
        in_progress: 'Tâche démarrée',
        paused: 'Tâche en pause',
        completed: 'Tâche terminée',
        cancelled: 'Tâche annulée',
      };
      showMessage(labels[status] || 'Statut mis à jour', status === 'completed' ? 'info' : 'success');
    } catch (e: any) {
      showMessage(e?.message || 'Impossible de changer le statut', 'error');
    }
  };

  const confirmWeighing = async (conformityStatus: 'conforme' | 'non_conforme') => {
    if (!activeTaskId) return;
    // Use confirmed weight if available, otherwise use raw sensor weight
    const weight = sensor.confirmedWeight.isConfirmed
      ? sensor.confirmedWeight.value
      : (sensor.weight.value || 0);
    if (!weight) {
      showMessage('Aucun poids détecté (ou 0)', 'error');
      return;
    }
    try {
      await apiClient.addProductionItem(activeTaskId, weight, conformityStatus);
      await loadTasks(lineId);
      await loadRecentItems(activeTaskId);
      sensor.resetConfirmation(); // Reset for next product
      const label = conformityStatus === 'conforme' ? 'Conforme' : 'Non conforme';
      showMessage(`${label} — ${weight.toFixed(3)} kg`, conformityStatus === 'conforme' ? 'success' : 'warning');
    } catch (e: any) {
      showMessage(e?.message || "Impossible d'enregistrer", 'error');
    }
  };

  // Reopen last completed task
  const lastCompletedTask = useMemo(() => {
    return tasks.find(t => t.status === 'completed');
  }, [tasks]);

  const reopenLastTask = async () => {
    if (!lastCompletedTask) return;
    try {
      await apiClient.reopenTask(lastCompletedTask.id);
      await loadTasks(lineId);
      showMessage(`Tâche "${lastCompletedTask.product_name}" réouverte`, 'success');
    } catch (e: any) {
      showMessage(e?.message || 'Impossible de réouvrir la tâche', 'error');
    }
  };

  // Delete last production item (with confirmation)
  const deleteLastItem = async () => {
    if (!activeTaskId || recentItems.length === 0) return;
    try {
      await apiClient.deleteLastProductionItem(activeTaskId);
      await loadTasks(lineId);
      await loadRecentItems(activeTaskId);
      setShowDeleteConfirm(false);
      showMessage('Dernier pesage supprimé', 'info');
    } catch (e: any) {
      setShowDeleteConfirm(false);
      showMessage(e?.message || 'Impossible de supprimer le pesage', 'error');
    }
  };

  // === Weight status styling ===
  const sensorStatus = sensor.weight.status;
  const isStable = sensorStatus === 'stable';
  const isUnstable = sensorStatus === 'unstable';
  const isError = sensorStatus === 'error';

  const weightColor = isStable ? 'text-emerald-400' :
    isUnstable ? 'text-amber-400' :
    isError ? 'text-red-400' : 'text-slate-500';

  const statusDotColor = isStable ? 'bg-emerald-400' :
    isUnstable ? 'bg-amber-400' :
    isError ? 'bg-red-400' : 'bg-slate-500';

  const statusLabel = isStable ? 'Stable' :
    isUnstable ? 'Instable' :
    isError ? 'Erreur' : 'Hors ligne';

  // === Weight state indicator (tolerance) ===
  // tolerance_min/max are DEVIATIONS from target (e.g. target=38, tol_min=2, tol_max=2 → range [36, 40])
  const toleranceBounds = useMemo(() => {
    if (!activeTask?.target_weight || !activeTask?.tolerance_min || !activeTask?.tolerance_max) return null;
    return {
      min: activeTask.target_weight - activeTask.tolerance_min,
      max: activeTask.target_weight + activeTask.tolerance_max,
    };
  }, [activeTask?.target_weight, activeTask?.tolerance_min, activeTask?.tolerance_max]);

  const weightState = useMemo(() => {
    if (!toleranceBounds) return null;
    const w = sensor.weight.value;
    if (w === 0) return null;
    if (w < toleranceBounds.min) return { label: 'Sous-poids', color: 'text-sky-400', bg: 'bg-sky-500/20 border-sky-400/40', icon: '▼', glow: 'shadow-sky-500/20', inTolerance: false };
    if (w > toleranceBounds.max) return { label: 'Surpoids', color: 'text-rose-400', bg: 'bg-rose-500/20 border-rose-400/40', icon: '▲', glow: 'shadow-rose-500/20', inTolerance: false };
    return { label: 'Dans la tolérance', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-400/40', icon: '●', glow: 'shadow-emerald-500/20', inTolerance: true };
  }, [sensor.weight.value, toleranceBounds]);

  // === Confirmed weight state (tolerance check on confirmed weight) ===
  const confirmedWeightState = useMemo(() => {
    if (!toleranceBounds) return null;
    if (!sensor.confirmedWeight.isConfirmed) return null;
    const w = sensor.confirmedWeight.value;
    if (w === 0) return null;
    if (w < toleranceBounds.min) return { label: 'Sous-poids', inTolerance: false };
    if (w > toleranceBounds.max) return { label: 'Surpoids', inTolerance: false };
    return { label: 'Dans la tolérance', inTolerance: true };
  }, [sensor.confirmedWeight.isConfirmed, sensor.confirmedWeight.value, toleranceBounds]);

  // === Auto-validation: uses CONFIRMED weight (multiple stable readings) ===
  const autoValidationRef = useRef(false);

  useEffect(() => {
    // Only auto-validate when:
    // 1. Task is running (in_progress)
    // 2. Weight is CONFIRMED (multiple concordant stable readings)
    // 3. Confirmed weight is within tolerance
    // 4. Not already auto-validating
    if (
      isTaskRunning &&
      sensor.confirmedWeight.isConfirmed &&
      confirmedWeightState?.inTolerance &&
      !autoValidationRef.current
    ) {
      autoValidationRef.current = true;

      // Use the confirmed weight (average of stable readings) for the API call
      const confirmedValue = sensor.confirmedWeight.value;
      (async () => {
        try {
          await apiClient.addProductionItem(activeTaskId, confirmedValue, 'conforme');
          await loadTasks(lineId);
          await loadRecentItems(activeTaskId);
          showMessage(`Conforme — ${confirmedValue.toFixed(3)} kg (poids confirmé)`, 'success');
          // Reset confirmation cycle for next product
          sensor.resetConfirmation();
        } catch (e: any) {
          showMessage(e?.message || "Impossible d'enregistrer", 'error');
        } finally {
          // Cooldown before allowing next auto-validation
          setTimeout(() => {
            autoValidationRef.current = false;
          }, 1500);
        }
      })();
    }

    // Reset when weight goes to zero (product removed from scale)
    if (sensor.weight.value === 0 || sensor.weight.status === 'offline') {
      autoValidationRef.current = false;
    }
  }, [sensor.confirmedWeight.isConfirmed, confirmedWeightState?.inTolerance, isTaskRunning]);

  const progressPct = activeTask ? Math.min(100, (activeTask.produced_quantity / activeTask.target_quantity) * 100) : 0;

  // === SVG arc progress ===
  const arcRadius = 44;
  const arcCircumference = 2 * Math.PI * arcRadius;
  const arcOffset = arcCircumference - (progressPct / 100) * arcCircumference;

  // === Message styling ===
  const messageStyles: Record<PanelMessage['type'], string> = {
    success: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    error: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
    warning: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
    info: 'bg-sky-500/20 border-sky-500/40 text-sky-300',
  };

  const messageIcons: Record<PanelMessage['type'], React.ReactNode> = {
    success: <CheckCircle className="w-4 h-4" />,
    error: <XCircle className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    info: <Activity className="w-4 h-4" />,
  };

  return (
    <div className={`${embedded ? '' : 'h-screen'} bg-[#0a0e1a] flex flex-col overflow-hidden select-none`}>

      {/* ===== TOP BAR ===== */}
      <header className="flex-shrink-0 bg-[#0f1525]/90 backdrop-blur-md border-b border-white/5 px-4 py-2 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {/* Line selector */}
          <Select value={lineId} onValueChange={(v) => { setLineId(v); setActiveTaskId(''); setShowCreateTask(false); }}>
            <SelectTrigger className="h-9 w-44 text-sm font-medium bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
              <SelectValue placeholder="Ligne" />
            </SelectTrigger>
            <SelectContent>
              {lines.map(l => (
                <SelectItem key={l.id} value={l.id} className="text-sm">{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Mode toggle */}
          <div className="flex items-center bg-white/5 rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setMode('unit')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 touch-manipulation ${
                mode === 'unit'
                  ? 'bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              Pesage
            </button>
            <button
              onClick={() => setMode('pallet')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 touch-manipulation ${
                mode === 'pallet'
                  ? 'bg-violet-500/20 text-violet-400 shadow-lg shadow-violet-500/10'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Palettes
            </button>
          </div>

          {/* Task info */}
          {mode === 'unit' && isTaskActive && activeTask && (
            <div className="flex items-center gap-2 ml-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5">
                <span className="text-xs font-medium text-slate-300 truncate max-w-[180px]">
                  {activeTask.product_name}
                </span>
                {activeTask.product_reference && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    {activeTask.product_reference}
                  </span>
                )}
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                activeTask.status === 'in_progress' ? 'bg-emerald-500/15 text-emerald-400' :
                activeTask.status === 'paused' ? 'bg-amber-500/15 text-amber-400' :
                'bg-slate-500/15 text-slate-400'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  activeTask.status === 'in_progress' ? 'bg-emerald-400 animate-pulse' :
                  activeTask.status === 'paused' ? 'bg-amber-400' : 'bg-slate-400'
                }`} />
                {activeTask.status === 'in_progress' ? 'En cours' :
                 activeTask.status === 'paused' ? 'En pause' :
                 activeTask.status === 'pending' ? 'En attente' : activeTask.status}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={toggleFullscreen} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors touch-manipulation">
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
          <button onClick={logout} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors touch-manipulation">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      {mode === 'pallet' ? (
        <PalletKiosk lineId={lineId} lines={lines} onSwitchToUnit={() => setMode('unit')} />
      ) : (
        <div className="flex-1 flex flex-col min-h-0 p-3 gap-3">

          {/* === TOP ROW: 3 columns === */}
          <div className="flex-1 flex gap-3 min-h-0">

            {/* ═══════ LEFT COLUMN: Progression + Statistiques ═══════ */}
            <div className="w-48 flex flex-col gap-3">

              {/* PANEL: Progression */}
              <Panel
                title="Progression"
                icon={<TrendingUp className="w-3.5 h-3.5 text-indigo-400" />}
                className="flex-shrink-0"
              >
                {isTaskActive && activeTask ? (
                  <div className="flex flex-col items-center py-3 px-2">
                    <div className="relative w-24 h-24">
                      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r={arcRadius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
                        <circle
                          cx="50" cy="50" r={arcRadius} fill="none"
                          stroke={progressPct >= 100 ? '#10b981' : progressPct >= 50 ? '#3b82f6' : '#6366f1'}
                          strokeWidth="7" strokeLinecap="round"
                          strokeDasharray={arcCircumference}
                          strokeDashoffset={arcOffset}
                          className="transition-all duration-700 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold text-white font-mono">{activeTask.produced_quantity}</span>
                        <span className="text-[10px] text-slate-500">/ {activeTask.target_quantity}</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1.5 font-semibold">{Math.round(progressPct)}% terminé</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 px-3">
                    <Activity className="w-7 h-7 text-slate-600 mb-2" />
                    <span className="text-[11px] text-slate-500 text-center">Aucune tâche</span>
                  </div>
                )}
              </Panel>

              {/* PANEL: Statistiques */}
              <Panel
                title="Statistiques"
                icon={<Activity className="w-3.5 h-3.5 text-cyan-400" />}
                className="flex-1"
              >
                {stats.total > 0 ? (
                  <div className="flex flex-col gap-2 p-3">
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/10">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs text-emerald-400/80 font-medium">Conformes</span>
                      </div>
                      <span className="text-lg font-bold text-emerald-400 font-mono">{stats.conformes}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-rose-500/[0.08] border border-rose-500/10">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-rose-400" />
                        <span className="text-xs text-rose-400/80 font-medium">Non conf.</span>
                      </div>
                      <span className="text-lg font-bold text-rose-400 font-mono">{stats.nonConformes}</span>
                    </div>
                    <div className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-slate-500 font-medium">Conformité</span>
                        <span className={`text-sm font-bold font-mono ${
                          stats.tauxConformite >= 90 ? 'text-emerald-400' : stats.tauxConformite >= 70 ? 'text-amber-400' : 'text-rose-400'
                        }`}>{stats.tauxConformite}%</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${
                            stats.tauxConformite >= 90 ? 'bg-emerald-500' : stats.tauxConformite >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${stats.tauxConformite}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 py-6">
                    <Activity className="w-7 h-7 text-slate-600 mb-2" />
                    <span className="text-[11px] text-slate-500 text-center">Aucune donnée</span>
                  </div>
                )}
              </Panel>
            </div>

            {/* ═══════ CENTER: Balance ═══════ */}
            <Panel
              title="Balance"
              icon={<Scale className="w-3.5 h-3.5 text-emerald-400" />}
              className="flex-1"
              headerRight={
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${statusDotColor} ${isUnstable ? 'animate-pulse' : ''}`} />
                  <span className="text-[11px] text-slate-400 font-medium uppercase">{statusLabel}</span>
                </div>
              }
            >
              <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
                {/* Subtle glow effect */}
                <div className={`absolute w-64 h-64 rounded-full blur-[100px] opacity-20 transition-colors duration-500 ${
                  isStable ? 'bg-emerald-500' : isUnstable ? 'bg-amber-500' : isError ? 'bg-red-500' : 'bg-slate-700'
                }`} />

                {/* ── Message temporaire dans le panel ── */}
                {panelMessage && (
                  <div className={`absolute top-3 left-4 right-4 z-20 flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${messageStyles[panelMessage.type]}`}>
                    {messageIcons[panelMessage.type]}
                    <span>{panelMessage.text}</span>
                  </div>
                )}

                {/* Weight value */}
                <div className={`relative z-10 text-6xl sm:text-7xl md:text-8xl font-bold font-mono leading-none tracking-tighter transition-all duration-300 ${weightColor} ${isUnstable ? 'animate-pulse' : ''}`}>
                  {sensor.weight.value.toFixed(3)}
                </div>
                <span className="text-sm text-slate-500 font-medium mt-1 relative z-10">kg</span>

                {/* Tolerance info */}
                {activeTask?.target_weight && (
                  <div className="mt-4 flex items-center gap-3 relative z-10">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                      <TrendingUp className="w-3 h-3 text-slate-500" />
                      <span className="text-[11px] text-slate-400">Cible</span>
                      <span className="text-[11px] font-mono font-semibold text-slate-200">{activeTask.target_weight}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                      <span className="text-[11px] text-slate-500">Min</span>
                      <span className="text-[11px] font-mono text-slate-300">{toleranceBounds ? toleranceBounds.min.toFixed(3) : '-'}</span>
                      <span className="text-[11px] text-slate-600 mx-0.5">—</span>
                      <span className="text-[11px] text-slate-500">Max</span>
                      <span className="text-[11px] font-mono text-slate-300">{toleranceBounds ? toleranceBounds.max.toFixed(3) : '-'}</span>
                    </div>
                  </div>
                )}

                {/* Weight state badge */}
                {weightState && (
                  <div className={`mt-3 px-5 py-2 rounded-xl border text-sm font-bold relative z-10 shadow-lg transition-all duration-300 ${weightState.bg} ${weightState.color} ${weightState.glow}`}>
                    <span className="mr-1.5">{weightState.icon}</span>
                    {weightState.label}
                  </div>
                )}

                {/* Unstable warning */}
                {isUnstable && (
                  <div className="mt-3 flex items-center gap-2 text-amber-400/80 animate-pulse relative z-10">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Stabilisation en cours...</span>
                  </div>
                )}

                {/* ── Boutons de pesage ── */}
                {isTaskRunning && (
                  <div className="mt-5 flex flex-col gap-3 relative z-10 w-full px-6">
                    {/* Weight confirmation progress indicator */}
                    {isStable && weightState?.inTolerance && !sensor.confirmedWeight.isConfirmed && sensor.confirmedWeight.progress > 0 && (
                      <div className="flex flex-col items-center gap-1.5 py-2 px-4 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                        <div className="flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5 animate-pulse" />
                          <span className="text-xs font-semibold">Confirmation du poids... ({sensor.confirmedWeight.stableCount}/{sensor.confirmedWeight.requiredCount})</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-400 rounded-full transition-all duration-300"
                            style={{ width: `${sensor.confirmedWeight.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {/* Auto-validation indicator (confirmed + in tolerance) */}
                    {sensor.confirmedWeight.isConfirmed && confirmedWeightState?.inTolerance && (
                      <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 animate-pulse">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-semibold">Poids confirmé {sensor.confirmedWeight.value.toFixed(3)} kg — Validation auto...</span>
                      </div>
                    )}
                    <div className="flex gap-4">
                      <button
                        onClick={() => confirmWeighing('conforme')}
                        disabled={!isStable}
                        className="flex-1 h-20 flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-emerald-600/90 to-emerald-700/90 border border-emerald-500/30 text-white disabled:opacity-20 disabled:grayscale hover:from-emerald-500/90 hover:to-emerald-600/90 active:scale-[0.97] transition-all duration-150 touch-manipulation shadow-lg shadow-emerald-900/30"
                      >
                        <CheckCircle className="w-8 h-8" />
                        <span className="text-lg font-bold tracking-tight">Conforme</span>
                      </button>
                      <button
                        onClick={() => confirmWeighing('non_conforme')}
                        disabled={!isStable}
                        className="flex-1 h-20 flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-rose-600/90 to-rose-700/90 border border-rose-500/30 text-white disabled:opacity-20 disabled:grayscale hover:from-rose-500/90 hover:to-rose-600/90 active:scale-[0.97] transition-all duration-150 touch-manipulation shadow-lg shadow-rose-900/30"
                      >
                        <XCircle className="w-8 h-8" />
                        <span className="text-lg font-bold tracking-tight">Non conforme</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Panel>

            {/* ═══════ RIGHT COLUMN: Contrôle tâche ═══════ */}
            <div className="w-52 flex flex-col gap-3">

              {/* PANEL: Contrôle tâche */}
              {isTaskActive && activeTask && (
                <Panel
                  title="Contrôle tâche"
                  icon={<Play className="w-3.5 h-3.5 text-amber-400" />}
                  className="flex-shrink-0"
                >
                  <div className="flex flex-col gap-2 p-3">
                    {activeTask.status !== 'in_progress' ? (
                      <button
                        onClick={() => setStatus('in_progress')}
                        className="h-14 flex items-center justify-center gap-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-base font-bold hover:bg-emerald-500/25 active:scale-[0.97] transition-all touch-manipulation"
                      >
                        <Play className="w-5 h-5" />
                        Démarrer
                      </button>
                    ) : (
                      <button
                        onClick={() => setStatus('paused')}
                        className="h-14 flex items-center justify-center gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/15 text-amber-400 text-base font-bold hover:bg-amber-500/20 active:scale-[0.97] transition-all touch-manipulation"
                      >
                        <Pause className="w-5 h-5" />
                        Pause
                      </button>
                    )}
                    <button
                      onClick={() => setStatus('completed')}
                      className="h-14 flex items-center justify-center gap-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-400 text-base font-semibold hover:bg-white/[0.06] hover:text-slate-200 active:scale-[0.97] transition-all touch-manipulation"
                    >
                      <Square className="w-5 h-5" />
                      Fin
                    </button>
                  </div>
                </Panel>
              )}

              {/* PANEL: Gestion (quand pas de tâche active) */}
              {!isTaskActive && (
                <Panel
                  title="Gestion"
                  icon={<Scale className="w-3.5 h-3.5 text-slate-400" />}
                  className="flex-1"
                >
                  <div className="flex-1 flex flex-col items-center justify-center gap-5 p-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                      <Scale className="w-7 h-7 text-slate-600" />
                    </div>
                    <span className="text-sm text-slate-500 text-center font-medium">Aucune tâche active</span>
                    <div className="flex flex-col gap-3 w-full">
                      <button
                        onClick={() => setShowCreateTask(!showCreateTask)}
                        className="flex items-center justify-center gap-3 w-full h-14 rounded-xl bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 text-base font-bold hover:bg-indigo-500/25 active:scale-[0.97] transition-all touch-manipulation"
                      >
                        <PlusCircle className="w-5 h-5" />
                        Nouvelle tâche
                      </button>
                      {lastCompletedTask && (
                        <button
                          onClick={reopenLastTask}
                          className="flex items-center justify-center gap-3 w-full h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-base font-bold hover:bg-amber-500/20 active:scale-[0.97] transition-all touch-manipulation"
                        >
                          <RotateCcw className="w-5 h-5" />
                          Réouvrir dernière tâche
                        </button>
                      )}
                    </div>
                  </div>
                </Panel>
              )}

              {/* PANEL: En attente (tâche active mais pas en cours) */}
              {isTaskActive && !isTaskRunning && (
                <Panel
                  title="En attente"
                  icon={<Clock className="w-3.5 h-3.5 text-amber-400" />}
                  className="flex-1"
                >
                  <div className="flex-1 flex items-center justify-center p-4">
                    <div className="text-center">
                      <div className={`w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center ${
                        activeTask?.status === 'paused' ? 'bg-amber-500/10' : 'bg-slate-500/10'
                      }`}>
                        {activeTask?.status === 'paused' ? (
                          <Pause className="w-6 h-6 text-amber-400" />
                        ) : (
                          <Play className="w-6 h-6 text-slate-500" />
                        )}
                      </div>
                      <span className="text-sm text-slate-400">
                        {activeTask?.status === 'paused'
                          ? 'Tâche en pause'
                          : 'Démarrez la tâche'}
                      </span>
                    </div>
                  </div>
                </Panel>
              )}
            </div>
          </div>

          {/* ═══════ BOTTOM: Historique ═══════ */}
          <Panel
            title="Historique pesages"
            icon={<Clock className="w-3.5 h-3.5 text-slate-400" />}
            className="flex-shrink-0 h-28 sm:h-32"
            headerRight={
              <div className="flex items-center gap-2">
                {recentItems.length > 0 && isTaskActive && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/15 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 active:scale-[0.97] transition-all touch-manipulation"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    Supprimer dernier
                  </button>
                )}
                {stats.total > 0 && (
                  <span className="text-[10px] text-slate-500 font-mono">{stats.total} total</span>
                )}
              </div>
            }
          >
            {recentItems.length > 0 ? (
              <div className="flex gap-1.5 overflow-x-auto px-3 py-2 flex-1">
                {recentItems.slice(0, 20).map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex-shrink-0 w-24 rounded-xl border px-2.5 py-2 flex flex-col items-center justify-center transition-all ${
                      item.status === 'conforme'
                        ? 'border-emerald-500/15 bg-emerald-500/[0.04]'
                        : 'border-rose-500/15 bg-rose-500/[0.04]'
                    }`}
                  >
                    <span className="text-[9px] text-slate-500 font-mono mb-0.5">#{recentItems.length - idx}</span>
                    <span className={`text-sm font-bold font-mono ${
                      item.status === 'conforme' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {Number(item.weight).toFixed(3)}
                    </span>
                    <span className={`text-[9px] font-semibold mt-0.5 ${
                      item.status === 'conforme' ? 'text-emerald-500/60' : 'text-rose-500/60'
                    }`}>
                      {item.status === 'conforme' ? 'OK' : 'NOK'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center flex-1">
                <span className="text-xs text-slate-600">Aucun pesage enregistré</span>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ===== CONFIRMATION SUPPRESSION MODAL ===== */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-[#141b2d] rounded-3xl border border-white/[0.08] p-8 w-full max-w-sm space-y-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-7 h-7 text-rose-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Confirmer la suppression</h2>
              <p className="text-sm text-slate-400 mt-2">
                Voulez-vous supprimer le dernier pesage
                {recentItems.length > 0 && (
                  <span className="font-mono font-bold text-white"> ({Number(recentItems[0]?.weight).toFixed(3)} kg)</span>
                )}
                ?
              </p>
              <p className="text-xs text-slate-500 mt-1">Cette action est irréversible.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 h-14 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-300 text-base font-medium hover:bg-white/[0.08] active:scale-[0.97] transition-all touch-manipulation"
              >
                Annuler
              </button>
              <button
                onClick={deleteLastItem}
                className="flex-1 h-14 rounded-xl bg-rose-600 border border-rose-500/30 text-white text-base font-semibold hover:bg-rose-500 active:scale-[0.97] transition-all touch-manipulation shadow-lg shadow-rose-900/30"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CREATE TASK MODAL ===== */}
      {showCreateTask && !isTaskActive && mode === 'unit' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreateTask(false)}>
          <div className="bg-[#141b2d] rounded-3xl border border-white/[0.08] p-8 w-full max-w-md space-y-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-3">
                <PlusCircle className="w-7 h-7 text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Nouvelle tâche</h2>
              <p className="text-sm text-slate-500 mt-1">Configurez la production</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Produit</label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger className="h-12 text-base bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06] transition-colors touch-manipulation">
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

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Quantité cible</label>
                <Input
                  type="number"
                  value={targetQty}
                  onChange={(e) => setTargetQty(parseInt(e.target.value || '0', 10))}
                  className="h-12 text-lg text-center font-mono bg-white/[0.04] border-white/[0.08] touch-manipulation"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateTask(false)}
                className="flex-1 h-14 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-300 text-base font-medium hover:bg-white/[0.08] active:scale-[0.97] transition-all touch-manipulation"
              >
                Annuler
              </button>
              <button
                onClick={createTask}
                disabled={!lineId || !productId}
                className="flex-1 h-14 rounded-xl bg-indigo-600 border border-indigo-500/30 text-white text-base font-semibold hover:bg-indigo-500 disabled:opacity-30 active:scale-[0.97] transition-all touch-manipulation shadow-lg shadow-indigo-900/30"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
