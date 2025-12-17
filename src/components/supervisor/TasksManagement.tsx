import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useProductionTasks, useProducts, useProductionLines, ProductionTask } from '@/hooks/useProductionData';
import { Plus, Trash2, ClipboardList, Play, Pause, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'secondary' },
  in_progress: { label: 'En cours', variant: 'default' },
  paused: { label: 'En pause', variant: 'outline' },
  completed: { label: 'Terminée', variant: 'default' },
  cancelled: { label: 'Annulée', variant: 'destructive' },
};

export function TasksManagement() {
  const { tasks, loading, createTask, updateTask, deleteTask } = useProductionTasks();
  const { products } = useProducts();
  const { lines } = useProductionLines();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    line_id: '',
    product_id: '',
    target_quantity: '',
  });

  const resetForm = () => {
    setFormData({ line_id: '', product_id: '', target_quantity: '' });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await createTask({
      line_id: formData.line_id,
      product_id: formData.product_id,
      target_quantity: parseInt(formData.target_quantity),
    });

    if (success) {
      handleOpenChange(false);
    }
  };

  const handleStatusChange = async (task: ProductionTask, newStatus: string) => {
    const updates: Partial<ProductionTask> = { status: newStatus as ProductionTask['status'] };
    if (newStatus === 'in_progress' && !task.started_at) {
      updates.started_at = new Date().toISOString();
    }
    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString();
    }
    await updateTask(task.id, updates);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer cette tâche ?')) {
      await deleteTask(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <ClipboardList className="w-7 h-7 text-primary" />
          Tâches de production
        </h2>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouvelle tâche
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle tâche</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="line">Ligne de production</Label>
                <Select
                  value={formData.line_id}
                  onValueChange={(value) => setFormData({ ...formData, line_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une ligne" />
                  </SelectTrigger>
                  <SelectContent>
                    {lines.filter(l => l.is_active).map((line) => (
                      <SelectItem key={line.id} value={line.id}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="product">Produit</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un produit" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.reference})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="target_quantity">Quantité cible</Label>
                <Input
                  id="target_quantity"
                  type="number"
                  min="1"
                  value={formData.target_quantity}
                  onChange={(e) => setFormData({ ...formData, target_quantity: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={!formData.line_id || !formData.product_id}>
                  Créer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="industrial-card">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Aucune tâche</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ligne</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead className="text-center">Progression</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const config = statusConfig[task.status];
                const progress = task.target_quantity > 0 
                  ? Math.round((task.produced_quantity / task.target_quantity) * 100) 
                  : 0;
                return (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.line?.name || '-'}</TableCell>
                    <TableCell>
                      <div>
                        <div>{task.product?.name || '-'}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {task.product?.reference}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all",
                              progress >= 100 ? "bg-green-500" : "bg-primary"
                            )}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono">
                          {task.produced_quantity}/{task.target_quantity}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {task.status === 'pending' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleStatusChange(task, 'in_progress')}
                            title="Démarrer"
                          >
                            <Play className="w-4 h-4 text-green-500" />
                          </Button>
                        )}
                        {task.status === 'in_progress' && (
                          <>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handleStatusChange(task, 'paused')}
                              title="Pause"
                            >
                              <Pause className="w-4 h-4 text-yellow-500" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handleStatusChange(task, 'completed')}
                              title="Terminer"
                            >
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </Button>
                          </>
                        )}
                        {task.status === 'paused' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleStatusChange(task, 'in_progress')}
                            title="Reprendre"
                          >
                            <Play className="w-4 h-4 text-green-500" />
                          </Button>
                        )}
                        {['pending', 'paused'].includes(task.status) && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleStatusChange(task, 'cancelled')}
                            title="Annuler"
                          >
                            <XCircle className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(task.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
