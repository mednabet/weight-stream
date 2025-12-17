import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Factory, Package, CheckCircle2, Clock } from 'lucide-react';

interface Line { id: string; name: string; status?: string }
interface Task { id: string; status: string }

export function DashboardOverview() {
  const { data: lines = [] } = useQuery({ queryKey: ['lines'], queryFn: () => apiClient.getLines() as any, refetchInterval: 4000 });
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => apiClient.getTasks() as any, refetchInterval: 4000 });

  const stats = useMemo(() => {
    const t = tasks as Task[];
    const totalTasks = t.length;
    const inProgress = t.filter(x => x.status === 'in_progress').length;
    const completed = t.filter(x => x.status === 'completed').length;
    const totalLines = (lines as Line[]).length;
    return { totalLines, totalTasks, inProgress, completed };
  }, [lines, tasks]);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lignes</CardTitle>
          <Factory className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalLines}</div>
          <p className="text-xs text-muted-foreground">Total lignes configurées</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tâches</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalTasks}</div>
          <p className="text-xs text-muted-foreground">Historique</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En cours</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.inProgress}</div>
          <Badge variant="secondary">In progress</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Terminées</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.completed}</div>
          <Badge>Completed</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
