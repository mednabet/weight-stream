import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { useSensorData } from '@/hooks/useSensorData';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  CheckCircle, XCircle, Scale, Package, ArrowLeft,
  Printer, AlertTriangle, Info
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

export function PalletKiosk({ lineId, lines, onSwitchToUnit }: PalletKioskProps) {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string>('');
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [summary, setSummary] = useState<PalletSummary | null>(null);
  const [unitsCount, setUnitsCount] = useState<number>(0);
  const [showTicket, setShowTicket] = useState<Pallet | null>(null);

  const selectedLine = useMemo(() => lines.find(l => l.id === lineId) || null, [lines, lineId]);
  const palletScaleUrl = selectedLine?.pallet_scale_url || selectedLine?.scale_url || null;
  const sensor = useSensorData({ scaleUrl: palletScaleUrl, pollingInterval: 800 });

  const activeTask = useMemo(() => tasks.find(t => t.id === activeTaskId) || null, [tasks, activeTaskId]);
  const defaultUnitsPerPallet = activeTask?.units_per_pallet || 30;

  // Auto-set units count to default
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
    // Chercher les tâches in_progress ou paused (pour le conditionnement)
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
      // Permettre de conditionner même une tâche terminée
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
      // Map API nested structure to flat PalletSummary
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

  const confirmPallet = async (conformityStatus: 'conforme' | 'non_conforme') => {
    if (!activeTaskId) return;
    const weight = sensor.weight.value || 0;
    if (!weight) {
      toast({ title: 'Poids invalide', description: 'Aucun poids détecté sur la balance palettes.', variant: 'destructive' });
      return;
    }
    if (!unitsCount || unitsCount <= 0) {
      toast({ title: 'Quantité invalide', description: 'Indiquez le nombre d\'unités dans la palette.', variant: 'destructive' });
      return;
    }
    try {
      const result = await apiClient.addPallet({
        task_id: activeTaskId,
        units_count: unitsCount,
        weight,
        status: conformityStatus,
      });
      await loadPallets(activeTaskId);
      const label = conformityStatus === 'conforme' ? 'Conforme' : 'Non conforme';
      toast({ title: `Palette ${label}`, description: `Poids: ${weight.toFixed(3)} — ${unitsCount} unités` });
      // Afficher le ticket automatiquement
      if (result && (result as any).id) {
        try {
          const ticket = await apiClient.getPalletTicket((result as any).id);
          setShowTicket(ticket as any);
        } catch {}
      }
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || "Impossible d'enregistrer la palette", variant: 'destructive' });
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
          .status { text-align: center; padding: 8px; margin: 10px 0; font-size: 16px; font-weight: bold; border: 2px solid; }
          .conforme { border-color: green; color: green; }
          .non_conforme { border-color: red; color: red; }
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
        <div class="status ${pallet.status}">${pallet.status === 'conforme' ? 'CONFORME' : 'NON CONFORME'}</div>
        <div class="divider"></div>
        <div class="row"><span class="label">Opérateur:</span><span>${pallet.operator_name || user?.name || '-'}</span></div>
        <div class="footer">
          <p>Weight Stream — Production Manager</p>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    ticketWindow.document.close();
  };

  // Weight status colors
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

  // === Indicateur automatique de l'état du poids palette par rapport aux tolérances ===
  const palletWeightState = useMemo(() => {
    if (!activeTask?.pallet_target_weight || !activeTask?.pallet_tolerance_min || !activeTask?.pallet_tolerance_max) return null;
    const w = sensor.weight.value;
    if (w === 0) return null;
    if (w < activeTask.pallet_tolerance_min) return { label: 'Sous-poids', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/50', icon: '▼' };
    if (w > activeTask.pallet_tolerance_max) return { label: 'Surpoids', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/50', icon: '▲' };
    return { label: 'Dans la tolérance', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/50', icon: '●' };
  }, [sensor.weight.value, activeTask?.pallet_target_weight, activeTask?.pallet_tolerance_min, activeTask?.pallet_tolerance_max]);

  return (
    <div className="flex-1 flex flex-col min-h-0 p-2 gap-2">

      {/* === TOP BAR: Back button + Task info + Rapprochement === */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            onClick={onSwitchToUnit}
            variant="outline"
            size="sm"
            className="h-9 touch-manipulation"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Pesage unitaire
          </Button>

          {activeTask && (
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium truncate max-w-[200px]">
                {activeTask.product_name} ({activeTask.product_reference})
              </span>
              <Badge className="bg-purple-600 text-white text-xs">Palettes</Badge>
            </div>
          )}
        </div>

        {/* Rapprochement summary */}
        {summary && (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Produit:</span>
              <span className="font-mono font-bold text-blue-400">{summary.total_conformes_produced}</span>
              <span className="text-muted-foreground">conformes</span>
            </div>
            <span className="text-muted-foreground">|</span>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Conditionné:</span>
              <span className="font-mono font-bold text-purple-400">{summary.total_units_packed}</span>
              <span className="text-muted-foreground">unités</span>
            </div>
            <span className="text-muted-foreground">|</span>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Reste:</span>
              <span className={`font-mono font-bold ${summary.remaining_units > 0 ? 'text-yellow-400' : summary.remaining_units === 0 ? 'text-green-400' : 'text-red-400'}`}>
                {summary.remaining_units}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* === MAIN: Weight + Action Buttons === */}
      <div className="flex-1 flex gap-2 min-h-0">

        {/* LEFT: Weight Display */}
        <div className={`flex-1 rounded-xl border-2 p-2 flex flex-col items-center justify-center transition-all duration-300 ${weightBorderColor}`}>
          <div className="flex items-center gap-2 mb-1">
            <Scale className={`w-5 h-5 ${weightColor}`} />
            <span className="text-sm text-muted-foreground">Poids palette</span>
            <Badge className={`${badgeColor} text-xs`}>{badgeLabel}</Badge>
          </div>

          <div className={`text-5xl sm:text-6xl md:text-7xl font-bold font-mono leading-none tracking-tight transition-colors duration-300 ${weightColor} ${sensor.weight.status === 'unstable' ? 'animate-pulse' : ''}`}>
            {sensor.weight.value.toFixed(3)}
          </div>

          {/* Pallet target info */}
          {activeTask?.pallet_target_weight && (
            <div className="mt-1 text-sm text-muted-foreground">
              Cible palette: <span className="font-mono font-medium text-foreground">{activeTask.pallet_target_weight}</span>
              {activeTask.pallet_tolerance_min && (
                <>
                  <span className="mx-1">|</span>
                  Min: <span className="font-mono">{activeTask.pallet_tolerance_min}</span>
                  <span className="mx-1">—</span>
                  Max: <span className="font-mono">{activeTask.pallet_tolerance_max}</span>
                </>
              )}
            </div>
          )}

          {palletWeightState && (
            <div className={`mt-1 px-4 py-1 rounded-lg border text-sm font-semibold ${palletWeightState.bg} ${palletWeightState.color}`}>
              {palletWeightState.icon} {palletWeightState.label}
            </div>
          )}

          {/* Units count input */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Unités dans la palette:</span>
            <Input
              type="number"
              value={unitsCount}
              onChange={(e) => setUnitsCount(parseInt(e.target.value || '0', 10))}
              className="w-24 h-10 text-center text-lg font-mono touch-manipulation"
              inputMode="numeric"
              min={1}
            />
          </div>

          {sensor.weight.status === 'unstable' && (
            <div className="mt-2 text-sm text-orange-400 font-medium animate-pulse">
              Stabilisation en cours...
            </div>
          )}
        </div>

        {/* RIGHT: Action buttons */}
        <div className="w-48 sm:w-56 md:w-64 flex flex-col gap-2">
          {activeTask ? (
            <>
              <Button
                onClick={() => confirmPallet('conforme')}
                disabled={sensor.weight.status !== 'stable'}
                className="flex-1 min-h-[80px] text-xl sm:text-2xl font-bold bg-green-600 hover:bg-green-500 active:bg-green-700 text-white disabled:opacity-30 rounded-xl touch-manipulation transition-all duration-150 active:scale-95"
              >
                <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 mr-2 flex-shrink-0" />
                Conforme
              </Button>
              <Button
                onClick={() => confirmPallet('non_conforme')}
                disabled={sensor.weight.status !== 'stable'}
                className="flex-1 min-h-[80px] text-xl sm:text-2xl font-bold bg-red-600 hover:bg-red-500 active:bg-red-700 text-white disabled:opacity-30 rounded-xl touch-manipulation transition-all duration-150 active:scale-95"
              >
                <XCircle className="w-7 h-7 sm:w-8 sm:h-8 mr-2 flex-shrink-0" />
                Non conforme
              </Button>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-sm text-muted-foreground px-2">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                Aucune tâche active.<br />
                Revenez au pesage unitaire pour créer une tâche.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === BOTTOM: Rapprochement + Recent pallets === */}
      <div className="flex-shrink-0 flex gap-2 h-40 sm:h-44">

        {/* Rapprochement card */}
        <div className="w-56 sm:w-64 md:w-72 rounded-xl border border-border bg-card p-3 flex flex-col justify-center">
          {summary ? (
            <>
              <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Info className="w-3 h-3" /> Rapprochement
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-center mb-2">
                <div className="rounded-lg bg-blue-600/10 py-1.5">
                  <div className="text-xl font-bold text-blue-400">{summary.total_conformes_produced}</div>
                  <div className="text-[10px] text-blue-400/70">Produits conformes</div>
                </div>
                <div className="rounded-lg bg-purple-600/10 py-1.5">
                  <div className="text-xl font-bold text-purple-400">{summary.total_units_packed}</div>
                  <div className="text-[10px] text-purple-400/70">Unités conditionnées</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center">
                <div className="rounded bg-green-600/10 py-1">
                  <div className="text-sm font-bold text-green-400">{summary.total_conformes}</div>
                  <div className="text-[9px] text-green-400/70">Palettes OK</div>
                </div>
                <div className="rounded bg-red-600/10 py-1">
                  <div className="text-sm font-bold text-red-400">{summary.total_non_conformes}</div>
                  <div className="text-[9px] text-red-400/70">Palettes NOK</div>
                </div>
                <div className={`rounded py-1 ${summary.remaining_units === 0 ? 'bg-green-600/10' : summary.remaining_units > 0 ? 'bg-yellow-600/10' : 'bg-red-600/10'}`}>
                  <div className={`text-sm font-bold ${summary.remaining_units === 0 ? 'text-green-400' : summary.remaining_units > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {summary.remaining_units}
                  </div>
                  <div className="text-[9px] text-muted-foreground">Reste</div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground text-center">Aucune donnée de conditionnement</div>
          )}
        </div>

        {/* Recent pallets list */}
        <div className="flex-1 rounded-xl border border-border bg-card p-2 overflow-hidden">
          <div className="text-xs text-muted-foreground mb-1.5 px-1 font-medium">Dernières palettes</div>
          {pallets.length > 0 ? (
            <div className="flex flex-col gap-1 overflow-y-auto h-[calc(100%-24px)] pr-1">
              {pallets.slice(0, 15).map((pallet) => (
                <div key={pallet.id} className={`flex items-center justify-between rounded-md border px-2 py-1 text-xs ${
                  pallet.status === 'conforme' ? 'border-green-600/20 bg-green-600/5' : 'border-red-600/20 bg-red-600/5'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-6">P{pallet.pallet_number}</span>
                    <span className="font-mono font-medium text-sm">{Number(pallet.weight).toFixed(3)}</span>
                    <span className="text-[10px] text-muted-foreground">{pallet.units_count}u</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-medium ${
                      pallet.status === 'conforme' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {pallet.status === 'conforme' ? 'OK' : 'NOK'}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 touch-manipulation"
                      onClick={() => printTicket(pallet)}
                    >
                      <Printer className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-4">Aucune palette enregistrée</div>
          )}
        </div>
      </div>

      {/* === TICKET MODAL === */}
      {showTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowTicket(null)}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <Package className="w-10 h-10 mx-auto text-purple-400 mb-2" />
              <h2 className="text-xl font-bold">Palette enregistrée</h2>
              <p className="text-sm text-muted-foreground">{showTicket.ticket_number}</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Palette N°</span>
                <span className="font-bold">{showTicket.pallet_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unités</span>
                <span className="font-bold">{showTicket.units_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Poids</span>
                <span className="font-mono font-bold text-lg">{Number(showTicket.weight).toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Statut</span>
                <Badge className={showTicket.status === 'conforme' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>
                  {showTicket.status === 'conforme' ? 'CONFORME' : 'NON CONFORME'}
                </Badge>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowTicket(null)}
                className="flex-1 h-12 touch-manipulation"
              >
                Fermer
              </Button>
              <Button
                onClick={() => { printTicket(showTicket); setShowTicket(null); }}
                className="flex-1 h-12 bg-purple-600 hover:bg-purple-700 text-white touch-manipulation"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
