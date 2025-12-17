import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ApiTask {
  id: string;
  status: string;
  created_at: string;
  completed_at?: string | null;
  product_name?: string | null;
  product_reference?: string | null;
  line_name?: string | null;
  operator_email?: string | null;
  weight_target?: number | string | null;
  weight_actual?: number | string | null;
}

function statusBadge(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'completed') return <Badge>Terminée</Badge>;
  if (s === 'in_progress') return <Badge variant="secondary">En cours</Badge>;
  if (s === 'paused') return <Badge variant="outline">Pause</Badge>;
  if (s === 'cancelled') return <Badge variant="destructive">Annulée</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export function TaskHistory() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => (await apiClient.getTasks()) as ApiTask[],
    refetchInterval: 4000,
  });

  const tasks = useMemo(() => data.slice(0, 30), [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des tâches</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : tasks.length === 0 ? (
          <div className="text-sm text-muted-foreground">Aucune tâche.</div>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {t.product_name || 'Produit'} {t.product_reference ? `(${t.product_reference})` : ''}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.line_name ? `Ligne: ${t.line_name} • ` : ''}
                    {t.operator_email ? `Opérateur: ${t.operator_email} • ` : ''}
                    {t.created_at ? format(new Date(t.created_at), 'Pp', { locale: fr }) : ''}
                  </div>
                </div>
                <div className="shrink-0">{statusBadge(t.status)}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
