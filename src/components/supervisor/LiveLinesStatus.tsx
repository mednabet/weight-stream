import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Line { id: string; name: string; status?: string; is_active?: boolean }
const label = (s?: string) => {
  if (s === 'running') return <Badge>En production</Badge>;
  if (s === 'paused') return <Badge variant="secondary">Pause</Badge>;
  if (s === 'stopped') return <Badge variant="outline">Arrêt</Badge>;
  return <Badge variant="outline">{s || '—'}</Badge>;
};

export function LiveLinesStatus() {
  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['lines'],
    queryFn: async () => (await apiClient.getLines()) as any[],
    refetchInterval: 3000,
  });

  const sorted = useMemo(() => (lines as Line[]).slice().sort((a,b)=>a.name.localeCompare(b.name)), [lines]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>État des lignes</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : sorted.length === 0 ? (
          <div className="text-sm text-muted-foreground">Aucune ligne.</div>
        ) : (
          <div className="space-y-2">
            {sorted.map(l => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="font-medium">{l.name}</div>
                <div>{label(l.status)}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
