import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { useProducts } from '@/hooks/useProducts';
import { useSensorData } from '@/hooks/useSensorData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Play, Pause, CheckCircle, Plus, ArrowLeft, LogOut } from 'lucide-react';

interface Line { id: string; name: string; status?: string }
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

interface OperatorKioskProps {
  embedded?: boolean;
}

export function OperatorKiosk({ embedded = false }: OperatorKioskProps) {
  const { user, logout } = useAuth();
  const { products } = useProducts(true);

  const [lines, setLines] = useState<Line[]>([]);
  const [lineId, setLineId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [targetQty, setTargetQty] = useState<number>(50);

  // Sensor (optional): URLs are managed per terminal in DB; for now leave empty (manual entry still works)
  const sensor = useSensorData({ pollingInterval: 800 });

  const activeTask = useMemo(() => tasks.find(t => t.id === activeTaskId) || null, [tasks, activeTaskId]);

  const loadLines = async () => {
    const data = await apiClient.getLines();
    setLines(data as any);
    if (!lineId && (data as any[]).length) setLineId((data as any[])[0].id);
  };

  const loadTasks = async (lId: string) => {
    if (!lId) return;
    const data = await apiClient.getTasksForLine(lId);
    setTasks(data as any);
    const inProgress = (data as any[]).find(t => t.status === 'in_progress')?.id;
    if (inProgress) setActiveTaskId(inProgress);
  };

  useEffect(() => {
    loadLines().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!lineId) return;
    loadTasks(lineId).catch(() => {});
    const t = setInterval(() => loadTasks(lineId).catch(() => {}), 2000);
    return () => clearInterval(t);
  }, [lineId]);

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
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || 'Impossible de changer le statut', variant: 'destructive' });
    }
  };

  const addItem = async () => {
    if (!activeTaskId) return;
    const weight = sensor.weight.value || 0;
    if (!weight) {
      toast({ title: 'Poids invalide', description: 'Aucun poids détecté (ou 0).' , variant: 'destructive' });
      return;
    }
    try {
      await apiClient.addProductionItem(activeTaskId, { weight, status: sensor.weight.status });
      await loadTasks(lineId);
      toast({ title: 'Ajouté', description: `Poids: ${weight}` });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || 'Impossible d\'ajouter l\'item', variant: 'destructive' });
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
            <Button variant="ghost" size="icon" onClick={logout} className="w-8 h-8 sm:w-10 sm:h-10">
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
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
          {/* Choix ligne / tâche */}
          <Card>
            <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Choix ligne / tâche</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="text-xs sm:text-sm font-medium">Ligne</div>
                  <Select value={lineId} onValueChange={setLineId}>
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

                <div className="space-y-1.5">
                  <div className="text-xs sm:text-sm font-medium">Produit</div>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger className="h-10 sm:h-11">
                      <SelectValue placeholder="Choisir un produit" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

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

              <div className="pt-2 border-t space-y-2">
                <div className="text-xs sm:text-sm font-medium">Tâche active</div>
                {activeTask ? (
                  <div className="rounded-lg border p-2 sm:p-3 space-y-2">
                    <div className="font-medium text-sm sm:text-base truncate">
                      {activeTask.product_name || ''} {activeTask.product_reference ? `(${activeTask.product_reference})` : ''}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Produit: {activeTask.produced_quantity}/{activeTask.target_quantity}
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Badge variant="secondary" className="text-xs">{activeTask.status}</Badge>
                      <div className="flex gap-1 sm:gap-2">
                        <Button size="sm" variant="outline" onClick={()=>setStatus('in_progress')} className="h-8 px-2 sm:px-3">
                          <Play className="w-3 h-3 sm:mr-1" />
                          <span className="hidden sm:inline">Démarrer</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={()=>setStatus('paused')} className="h-8 px-2 sm:px-3">
                          <Pause className="w-3 h-3 sm:mr-1" />
                          <span className="hidden sm:inline">Pause</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={()=>setStatus('completed')} className="h-8 px-2 sm:px-3">
                          <CheckCircle className="w-3 h-3 sm:mr-1" />
                          <span className="hidden sm:inline">Terminer</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs sm:text-sm text-muted-foreground">Aucune tâche active.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pesage */}
          <Card>
            <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Pesage</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3 sm:p-4">
                <div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Poids</div>
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold">{sensor.weight.value.toFixed(3)}</div>
                </div>
                <Badge 
                  variant={sensor.weight.status === 'stable' ? 'default' : sensor.weight.status === 'unstable' ? 'secondary' : 'destructive'}
                  className="text-xs sm:text-sm"
                >
                  {sensor.weight.status}
                </Badge>
              </div>

              <Button 
                onClick={addItem} 
                disabled={!activeTaskId} 
                className="w-full h-12 sm:h-14 text-base sm:text-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Ajouter item
              </Button>

              <div className="text-xs text-muted-foreground">
                Astuce: configurez les URLs de la balance/photocellule par terminal (à intégrer si besoin).
              </div>
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
                  <div key={t.id} className="flex items-center justify-between rounded-lg border p-2 sm:p-3 gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm sm:text-base truncate">
                        {t.product_name || ''} {t.product_reference ? `(${t.product_reference})` : ''}
                      </div>
                      <div className="text-xs text-muted-foreground">{t.produced_quantity}/{t.target_quantity}</div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-xs hidden sm:inline-flex">{t.status}</Badge>
                      <Button size="sm" variant="outline" onClick={()=>setActiveTaskId(t.id)} className="h-8 text-xs sm:text-sm">
                        Activer
                      </Button>
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
