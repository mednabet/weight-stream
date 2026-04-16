import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { useSensorData } from '@/hooks/useSensorData';
import { Input } from '@/components/ui/input';
import {
  CheckCircle, XCircle, Scale, Package, ArrowLeft,
  Printer, AlertTriangle, Info, Clock, TrendingUp, Layers, BarChart3, Undo2, Activity, Save
} from 'lucide-react';

interface Line {
  id: string;
  name: string;
  pallet_scale_url?: string | null;
  scale_url?: string | null;
}
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
  units_per_pallet?: number;
  pallet_target_weight?: number;
  pallet_tolerance_min?: number;
  pallet_tolerance_max?: number;
}
interface Pallet {
  id: string;
  task_id: string;
  pallet_number: number;
  units_count: number;
  weight: number;
  status: 'conforme' | 'non_conforme';
  ticket_number: string;
  created_at: string;
  operator_name?: string;
}
interface PalletSummary {
  total_pallets: number;
  total_units_packed: number;
  total_conformes: number;
  total_non_conformes: number;
  total_produced: number;
  total_conformes_produced: number;
  units_per_pallet: number;
  expected_pallets: number;
  remaining_units: number;
}

interface PalletKioskProps {
  lineId: string;
  lines: Line[];
  onSwitchToUnit: () => void;
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

export function PalletKiosk({ lineId, lines, onSwitchToUnit }: PalletKioskProps) {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string>('');
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [summary, setSummary] = useState<PalletSummary | null>(null);
  const [unitsCount, setUnitsCount] = useState<number>(0);
  const [showTicket, setShowTicket] = useState<Pallet | null>(null);

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
  const palletScaleUrl = selectedLine?.pallet_scale_url || selectedLine?.scale_url || null;
  const sensor = useSensorData({ scaleUrl: palletScaleUrl, pollingInterval: 800 });

  const activeTask = useMemo(() => tasks.find(t => t.id === activeTaskId) || null, [tasks, activeTaskId]);
  const defaultUnitsPerPallet = activeTask?.units_per_pallet || 30;

  useEffect(() => {
    if (defaultUnitsPerPallet && unitsCount === 0) {
      setUnitsCount(defaultUnitsPerPallet);
    }
  }, [defaultUnitsPerPallet]);

  const loadTasks = useCallback(async () => {
    if (!lineId) return;
    const data = await apiClient.getTasksForLine(lineId);
    setTasks(data as any);
    const allTasks = data as any[];
    const inProgress = allTasks.find(t => t.status === 'in_progress');
    const paused = allTasks.find(t => t.status === 'paused');
    const completed = allTasks.filter(t => t.status === 'completed').sort((a, b) =>
      new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    );
    if (inProgress) {
      setActiveTaskId(inProgress.id);
    } else if (paused) {
      setActiveTaskId(paused.id);
    } else if (completed.length > 0) {
      setActiveTaskId(completed[0].id);
    } else {
      setActiveTaskId('');
    }
  }, [lineId]);

  const loadPallets = useCallback(async (taskId: string) => {
    if (!taskId) { setPallets([]); setSummary(null); return; }
    try {
      const [palletsData, summaryData] = await Promise.all([
        apiClient.getPalletsForTask(taskId),
        apiClient.getPalletSummary(taskId),
      ]);
      setPallets((palletsData as any[]).reverse());
      const sd = summaryData as any;
      setSummary({
        total_pallets: sd.conditioning?.total_pallets || 0,
        total_units_packed: sd.conditioning?.total_palletized_units || 0,
        total_conformes: sd.conditioning?.conforme_pallets || 0,
        total_non_conformes: sd.conditioning?.non_conforme_pallets || 0,
        total_produced: sd.production?.total_items || 0,
        total_conformes_produced: sd.production?.conforme_items || 0,
        units_per_pallet: sd.task?.units_per_pallet || 1,
        expected_pallets: sd.conditioning?.expected_pallets || 0,
        remaining_units: sd.conditioning?.remaining_to_condition || 0,
      });
    } catch {
      setPallets([]);
      setSummary(null);
    }
  }, []);

  useEffect(() => {
    loadTasks().catch(() => {});
    const t = setInterval(() => loadTasks().catch(() => {}), 5000);
    return () => clearInterval(t);
  }, [lineId]);

  useEffect(() => {
    if (activeTaskId) {
      loadPallets(activeTaskId).catch(() => {});
    } else {
      setPallets([]);
      setSummary(null);
    }
  }, [activeTaskId]);

  /* ── Enregistrer palette (plus de conforme/non conforme) ── */
  const registerPallet = async () => {
    if (!activeTaskId) return;
    const weight = sensor.weight.value || 0;
    if (!weight) {
      showMessage('Aucun poids détecté sur la balance palettes', 'error');
      return;
    }
    if (!unitsCount || unitsCount <= 0) {
      showMessage("Indiquez le nombre d'unités dans la palette", 'error');
      return;
    }
    try {
      const result = await apiClient.addPallet({
        task_id: activeTaskId,
        units_count: unitsCount,
        weight,
        status: 'conforme', // toujours conforme par défaut (pas de logique conforme/non conforme pour les palettes)
      });
      await loadPallets(activeTaskId);
      showMessage(`Palette enregistrée — ${weight.toFixed(3)} kg — ${unitsCount} unités`, 'success');
      if (result && (result as any).id) {
        try {
          const ticket = await apiClient.getPalletTicket((result as any).id);
          setShowTicket(ticket as any);
        } catch {}
      }
    } catch (e: any) {
      showMessage(e?.message || "Impossible d'enregistrer la palette", 'error');
    }
  };

  // Delete last pallet (with confirmation)
  const deleteLastPallet = async () => {
    if (!activeTaskId || pallets.length === 0) return;
    try {
      await apiClient.deleteLastPallet(activeTaskId);
      await loadPallets(activeTaskId);
      setShowDeleteConfirm(false);
      showMessage('Dernière palette supprimée', 'info');
    } catch (e: any) {
      setShowDeleteConfirm(false);
      showMessage(e?.message || 'Impossible de supprimer la palette', 'error');
    }
  };

  const printTicket = (pallet: Pallet) => {
    const ticketWindow = window.open('', '_blank', 'width=400,height=600');
    if (!ticketWindow) return;
    const taskInfo = activeTask;
    ticketWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket Palette ${pallet.ticket_number}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 20px; max-width: 350px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .header h1 { font-size: 18px; margin: 0; }
          .header h2 { font-size: 14px; margin: 5px 0; font-weight: normal; }
          .row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; }
          .row .label { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .big { font-size: 24px; text-align: center; font-weight: bold; margin: 10px 0; }
          .footer { text-align: center; font-size: 11px; margin-top: 15px; color: #666; }
          @media print { body { padding: 5px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>TICKET PALETTE</h1>
          <h2>${pallet.ticket_number}</h2>
        </div>
        <div class="row"><span class="label">Date:</span><span>${new Date(pallet.created_at).toLocaleString('fr-FR')}</span></div>
        <div class="row"><span class="label">Produit:</span><span>${taskInfo?.product_name || '-'}</span></div>
        <div class="row"><span class="label">Réf:</span><span>${taskInfo?.product_reference || '-'}</span></div>
        <div class="row"><span class="label">Ligne:</span><span>${selectedLine?.name || '-'}</span></div>
        <div class="divider"></div>
        <div class="row"><span class="label">Palette N°:</span><span>${pallet.pallet_number}</span></div>
        <div class="row"><span class="label">Unités:</span><span>${pallet.units_count}</span></div>
        <div class="divider"></div>
        <div class="big">${Number(pallet.weight).toFixed(3)} kg</div>
        <div class="divider"></div>
        <div class="row"><span class="label">Opérateur:</span><span>${pallet.operator_name || user?.name || '-'}</span></div>
        <div class="footer">
          <p>NETPROCESS - Production Manager</p>
          <p>${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    ticketWindow.document.close();
  };

  // === Sensor status ===
  const sensorStatus = sensor.weight.status === 'stable' ? 'stable' :
    sensor.weight.status === 'unstable' ? 'unstable' :
    sensor.weight.status === 'error' ? 'error' : 'offline';

  const isStable = sensorStatus === 'stable' && sensor.weight.value > 0;
  const isUnstable = sensorStatus === 'unstable';
  const isError = sensorStatus === 'error';

  const weightColor = isStable ? 'text-violet-400' :
    isUnstable ? 'text-amber-400' :
    isError ? 'text-red-400' : 'text-slate-500';

  const statusDotColor = isStable ? 'bg-violet-400' :
    isUnstable ? 'bg-amber-400' :
    isError ? 'bg-red-400' : 'bg-slate-500';

  const statusLabel = isStable ? 'Stable' :
    isUnstable ? 'Instable' :
    isError ? 'Erreur' : 'Hors ligne';

  // === Pallet weight state indicator ===
  // tolerance_min/max are DEVIATIONS from target (e.g. target=600, tol_min=10, tol_max=10 → range [590, 610])
  const palletToleranceBounds = useMemo(() => {
    if (!activeTask?.pallet_target_weight || !activeTask?.pallet_tolerance_min || !activeTask?.pallet_tolerance_max) return null;
    const tw = Number(activeTask.pallet_target_weight);
    const tmin = Number(activeTask.pallet_tolerance_min);
    const tmax = Number(activeTask.pallet_tolerance_max);
    if (isNaN(tw) || isNaN(tmin) || isNaN(tmax)) return null;
    return {
      min: tw - tmin,
      max: tw + tmax,
    };
  }, [activeTask?.pallet_target_weight, activeTask?.pallet_tolerance_min, activeTask?.pallet_tolerance_max]);

  const palletWeightState = useMemo(() => {
    if (!palletToleranceBounds) return null;
    const w = sensor.weight.value;
    if (w === 0) return null;
    if (w < palletToleranceBounds.min) return { label: 'Sous-poids', color: 'text-sky-400', bg: 'bg-sky-500/20 border-sky-400/40', icon: '▼', glow: 'shadow-sky-500/20' };
    if (w > palletToleranceBounds.max) return { label: 'Surpoids', color: 'text-rose-400', bg: 'bg-rose-500/20 border-rose-400/40', icon: '▲', glow: 'shadow-rose-500/20' };
    return { label: 'Dans la tolérance', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-400/40', icon: '●', glow: 'shadow-emerald-500/20' };
  }, [sensor.weight.value, palletToleranceBounds]);

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
    <div className="flex-1 flex flex-col min-h-0 p-3 gap-3">

      {/* === TOP BAR === */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onSwitchToUnit}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 text-xs font-medium hover:bg-white/[0.08] hover:text-slate-200 active:scale-[0.97] transition-all touch-manipulation"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Pesage unitaire
          </button>

          {activeTask && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/15">
                <Package className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs font-medium text-slate-300 truncate max-w-[180px]">
                  {activeTask.product_name}
                </span>
                {activeTask.product_reference && (
                  <span className="text-[10px] text-slate-500 font-mono">{activeTask.product_reference}</span>
                )}
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-violet-500/15 text-[11px] font-semibold text-violet-400">
                Palettes
              </div>
            </div>
          )}
        </div>

        {/* Rapprochement summary inline */}
        {summary && (
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/[0.06] border border-blue-500/10">
              <span className="text-slate-500">Produit:</span>
              <span className="font-mono font-bold text-blue-400">{summary.total_conformes_produced}</span>
              <span className="text-slate-500">conf.</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/[0.06] border border-violet-500/10">
              <span className="text-slate-500">Conditionné:</span>
              <span className="font-mono font-bold text-violet-400">{summary.total_units_packed}</span>
              <span className="text-slate-500">u</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
              summary.remaining_units === 0 ? 'bg-emerald-500/[0.06] border-emerald-500/10' :
              summary.remaining_units > 0 ? 'bg-amber-500/[0.06] border-amber-500/10' :
              'bg-rose-500/[0.06] border-rose-500/10'
            }`}>
              <span className="text-slate-500">Reste:</span>
              <span className={`font-mono font-bold ${
                summary.remaining_units === 0 ? 'text-emerald-400' :
                summary.remaining_units > 0 ? 'text-amber-400' : 'text-rose-400'
              }`}>{summary.remaining_units}</span>
            </div>
          </div>
        )}
      </div>

      {/* === MAIN ROW: 2 columns with panels === */}
      <div className="flex-1 flex gap-3 min-h-0">

        {/* ═══════ LEFT COLUMN: Rapprochement + Statistiques ═══════ */}
        <div className="w-48 flex flex-col gap-3">

          {/* PANEL: Rapprochement */}
          <Panel
            title="Rapprochement"
            icon={<BarChart3 className="w-3.5 h-3.5 text-blue-400" />}
            className="flex-shrink-0"
          >
            {summary ? (
              <div className="p-3">
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="rounded-xl bg-blue-500/[0.08] border border-blue-500/10 p-2 text-center">
                    <div className="text-xl font-bold text-blue-400 font-mono">{summary.total_conformes_produced}</div>
                    <div className="text-[9px] text-blue-400/60 mt-0.5">Produits conf.</div>
                  </div>
                  <div className="rounded-xl bg-violet-500/[0.08] border border-violet-500/10 p-2 text-center">
                    <div className="text-xl font-bold text-violet-400 font-mono">{summary.total_units_packed}</div>
                    <div className="text-[9px] text-violet-400/60 mt-0.5">Conditionnés</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 px-3">
                <BarChart3 className="w-7 h-7 text-slate-600 mb-2" />
                <span className="text-[11px] text-slate-500 text-center">Aucune donnée</span>
              </div>
            )}
          </Panel>

          {/* PANEL: Statistiques palettes */}
          <Panel
            title="Statistiques"
            icon={<Package className="w-3.5 h-3.5 text-violet-400" />}
            className="flex-1"
          >
            {summary ? (
              <div className="flex flex-col gap-2 p-3">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-violet-500/[0.08] border border-violet-500/10">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-violet-400" />
                    <span className="text-xs text-violet-400/80 font-medium">Palettes</span>
                  </div>
                  <span className="text-lg font-bold text-violet-400 font-mono">{summary.total_pallets}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-blue-500/[0.08] border border-blue-500/10">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-blue-400/80 font-medium">Unités cond.</span>
                  </div>
                  <span className="text-lg font-bold text-blue-400 font-mono">{summary.total_units_packed}</span>
                </div>
                <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${
                  summary.remaining_units === 0 ? 'bg-emerald-500/[0.08] border-emerald-500/10' :
                  summary.remaining_units > 0 ? 'bg-amber-500/[0.08] border-amber-500/10' :
                  'bg-rose-500/[0.08] border-rose-500/10'
                }`}>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-400 font-medium">Reste</span>
                  </div>
                  <span className={`text-lg font-bold font-mono ${
                    summary.remaining_units === 0 ? 'text-emerald-400' :
                    summary.remaining_units > 0 ? 'text-amber-400' : 'text-rose-400'
                  }`}>{summary.remaining_units}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 py-6">
                <Package className="w-7 h-7 text-slate-600 mb-2" />
                <span className="text-[11px] text-slate-500 text-center">Aucune donnée</span>
              </div>
            )}
          </Panel>
        </div>

        {/* ═══════ CENTER: Balance palette ═══════ */}
        <Panel
          title="Balance palette"
          icon={<Scale className="w-3.5 h-3.5 text-violet-400" />}
          className="flex-1"
          headerRight={
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${statusDotColor} ${isUnstable ? 'animate-pulse' : ''}`} />
              <span className="text-[11px] text-slate-400 font-medium uppercase">{statusLabel}</span>
            </div>
          }
        >
          <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Glow effect */}
            <div className={`absolute w-64 h-64 rounded-full blur-[100px] opacity-20 transition-colors duration-500 ${
              isStable ? 'bg-violet-500' : isUnstable ? 'bg-amber-500' : isError ? 'bg-red-500' : 'bg-slate-700'
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
            {activeTask?.pallet_target_weight && (
              <div className="mt-4 flex items-center gap-3 relative z-10">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                  <TrendingUp className="w-3 h-3 text-slate-500" />
                  <span className="text-[11px] text-slate-400">Cible</span>
                  <span className="text-[11px] font-mono font-semibold text-slate-200">{Number(activeTask.pallet_target_weight).toFixed(3)}</span>
                </div>
                {palletToleranceBounds && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                    <span className="text-[11px] text-slate-500">Min</span>
                    <span className="text-[11px] font-mono text-slate-300">{palletToleranceBounds.min.toFixed(3)}</span>
                    <span className="text-[11px] text-slate-600 mx-0.5">—</span>
                    <span className="text-[11px] text-slate-500">Max</span>
                    <span className="text-[11px] font-mono text-slate-300">{palletToleranceBounds.max.toFixed(3)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Weight state badge */}
            {palletWeightState && (
              <div className={`mt-3 px-5 py-2 rounded-xl border text-sm font-bold relative z-10 shadow-lg transition-all duration-300 ${palletWeightState.bg} ${palletWeightState.color} ${palletWeightState.glow}`}>
                <span className="mr-1.5">{palletWeightState.icon}</span>
                {palletWeightState.label}
              </div>
            )}

            {/* Units count input */}
            <div className="mt-4 flex items-center gap-3 relative z-10">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <Layers className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-[11px] text-slate-400">Unités</span>
                <Input
                  type="number"
                  value={unitsCount}
                  onChange={(e) => setUnitsCount(parseInt(e.target.value || '0', 10))}
                  className="w-20 h-9 text-center text-lg font-mono font-bold bg-white/[0.04] border-white/[0.08] touch-manipulation"
                  inputMode="numeric"
                  min={1}
                />
              </div>
            </div>

            {/* Unstable warning */}
            {isUnstable && (
              <div className="mt-3 flex items-center gap-2 text-amber-400/80 animate-pulse relative z-10">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Stabilisation en cours...</span>
              </div>
            )}

            {/* ── Bouton unique "Enregistrer palette" ── */}
            {activeTask && (
              <div className="mt-5 relative z-10 w-full px-6">
                <button
                  onClick={registerPallet}
                  disabled={!isStable}
                  className="w-full h-20 flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-violet-600/90 to-violet-700/90 border border-violet-500/30 text-white disabled:opacity-20 disabled:grayscale hover:from-violet-500/90 hover:to-violet-600/90 active:scale-[0.97] transition-all duration-150 touch-manipulation shadow-lg shadow-violet-900/30"
                >
                  <Save className="w-8 h-8" />
                  <span className="text-xl font-bold tracking-tight">Enregistrer palette</span>
                </button>
              </div>
            )}

            {!activeTask && (
              <div className="mt-5 flex flex-col items-center gap-3 relative z-10">
                <AlertTriangle className="w-8 h-8 text-amber-500/50" />
                <span className="text-sm text-slate-500 text-center">
                  Aucune tâche active.<br />
                  Revenez au pesage unitaire.
                </span>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* ═══════ BOTTOM: Historique palettes ═══════ */}
      <Panel
        title="Historique palettes"
        icon={<Clock className="w-3.5 h-3.5 text-slate-400" />}
        className="flex-shrink-0 h-28 sm:h-32"
        headerRight={
          <div className="flex items-center gap-2">
            {pallets.length > 0 && activeTask && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/15 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 active:scale-[0.97] transition-all touch-manipulation"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Supprimer dernière
              </button>
            )}
            {pallets.length > 0 && (
              <span className="text-[10px] text-slate-500 font-mono">{pallets.length} total</span>
            )}
          </div>
        }
      >
        {pallets.length > 0 ? (
          <div className="flex gap-1.5 overflow-x-auto px-3 py-2 flex-1">
            {pallets.slice(0, 20).map((pallet) => (
              <div
                key={pallet.id}
                className="flex-shrink-0 w-28 rounded-xl border border-violet-500/15 bg-violet-500/[0.04] hover:bg-violet-500/[0.08] px-2.5 py-2 flex flex-col items-center justify-center transition-all cursor-pointer hover:scale-[1.02]"
                onClick={() => printTicket(pallet)}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[9px] text-slate-500 font-mono">P{pallet.pallet_number}</span>
                  <span className="text-[9px] text-slate-600">{pallet.units_count}u</span>
                </div>
                <span className="text-sm font-bold font-mono text-violet-400">
                  {Number(pallet.weight).toFixed(3)}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[9px] font-semibold text-violet-500/60">kg</span>
                  <Printer className="w-2.5 h-2.5 text-slate-600" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1">
            <span className="text-xs text-slate-600">Aucune palette enregistrée</span>
          </div>
        )}
      </Panel>

      {/* ===== CONFIRMATION SUPPRESSION PALETTE MODAL ===== */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-[#141b2d] rounded-3xl border border-white/[0.08] p-8 w-full max-w-sm space-y-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-7 h-7 text-rose-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Confirmer la suppression</h2>
              <p className="text-sm text-slate-400 mt-2">
                Voulez-vous supprimer la dernière palette
                {pallets.length > 0 && (
                  <span className="font-mono font-bold text-white"> (P{pallets[0]?.pallet_number} — {Number(pallets[0]?.weight).toFixed(3)} kg)</span>
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
                onClick={deleteLastPallet}
                className="flex-1 h-14 rounded-xl bg-rose-600 border border-rose-500/30 text-white text-base font-semibold hover:bg-rose-500 active:scale-[0.97] transition-all touch-manipulation shadow-lg shadow-rose-900/30"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === TICKET MODAL === */}
      {showTicket && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowTicket(null)}>
          <div className="bg-[#141b2d] rounded-3xl border border-white/[0.08] p-8 w-full max-w-sm space-y-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
                <Package className="w-7 h-7 text-violet-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Palette enregistrée</h2>
              <p className="text-sm text-slate-500 mt-1 font-mono">{showTicket.ticket_number}</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-white/[0.03]">
                <span className="text-sm text-slate-400">Palette N°</span>
                <span className="text-sm font-bold text-white">{showTicket.pallet_number}</span>
              </div>
              <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-white/[0.03]">
                <span className="text-sm text-slate-400">Unités</span>
                <span className="text-sm font-bold text-white">{showTicket.units_count}</span>
              </div>
              <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-white/[0.03]">
                <span className="text-sm text-slate-400">Poids</span>
                <span className="text-lg font-mono font-bold text-violet-400">{Number(showTicket.weight).toFixed(3)} kg</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTicket(null)}
                className="flex-1 h-14 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-300 text-base font-medium hover:bg-white/[0.08] active:scale-[0.97] transition-all touch-manipulation"
              >
                Fermer
              </button>
              <button
                onClick={() => { printTicket(showTicket); setShowTicket(null); }}
                className="flex-1 h-14 rounded-xl bg-violet-600 border border-violet-500/30 text-white text-base font-semibold hover:bg-violet-500 active:scale-[0.97] transition-all touch-manipulation shadow-lg shadow-violet-900/30 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Imprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
