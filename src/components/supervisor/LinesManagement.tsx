import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useWeightUnits } from '@/hooks/useWeightUnits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { 
  Factory, Plus, Pencil, Trash2, Loader2, RefreshCw, 
  Scale, Eye, Power, PowerOff, Settings2, Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Line { 
  id: string; 
  name: string; 
  description?: string;
  scale_url?: string;
  photocell_url?: string;
  weight_unit_id?: string;
  weight_unit_code?: string;
  weight_unit_symbol?: string;
  status?: string; 
  is_active?: boolean;
}

interface LineFormData {
  name: string;
  description: string;
  scale_url: string;
  photocell_url: string;
  weight_unit_id: string;
  is_active: boolean;
}

const defaultFormData: LineFormData = {
  name: '',
  description: '',
  scale_url: '',
  photocell_url: '',
  weight_unit_id: '',
  is_active: true,
};

export function LinesManagement() {
  const { data: lines = [], refetch, isLoading } = useQuery({
    queryKey: ['lines'],
    queryFn: async () => (await apiClient.getLines()) as Line[],
  });

  const { units: weightUnits } = useWeightUnits();

  const [showDialog, setShowDialog] = useState(false);
  const [editingLine, setEditingLine] = useState<Line | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Line | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<LineFormData>(defaultFormData);

  const handleOpenCreate = () => {
    setEditingLine(null);
    setFormData(defaultFormData);
    setShowDialog(true);
  };

  const handleOpenEdit = (line: Line) => {
    setEditingLine(line);
    setFormData({
      name: line.name || '',
      description: line.description || '',
      scale_url: line.scale_url || '',
      photocell_url: line.photocell_url || '',
      weight_unit_id: line.weight_unit_id || '',
      is_active: line.is_active !== false,
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Champ requis',
        description: 'Veuillez entrer un nom pour la ligne de production.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingLine) {
        await apiClient.updateLine(editingLine.id, formData);
        toast({ title: 'Ligne modifiée', description: `La ligne "${formData.name}" a été mise à jour.` });
      } else {
        await apiClient.createLine(formData);
        toast({ title: 'Ligne créée', description: `La ligne "${formData.name}" a été créée avec succès.` });
      }
      setShowDialog(false);
      await refetch();
    } catch (e: any) {
      toast({
        title: 'Erreur',
        description: e?.message || 'Une erreur est survenue.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setIsSubmitting(true);
    try {
      await apiClient.deleteLine(deleteConfirm.id);
      toast({ title: 'Ligne supprimée', description: `La ligne "${deleteConfirm.name}" a été supprimée.` });
      setDeleteConfirm(null);
      await refetch();
    } catch (e: any) {
      toast({
        title: 'Erreur',
        description: e?.message || 'Impossible de supprimer la ligne.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (line: Line) => {
    try {
      await apiClient.updateLine(line.id, { ...line, is_active: !line.is_active });
      toast({ 
        title: line.is_active ? 'Ligne désactivée' : 'Ligne activée', 
        description: `La ligne "${line.name}" a été ${line.is_active ? 'désactivée' : 'activée'}.` 
      });
      await refetch();
    } catch (e: any) {
      toast({
        title: 'Erreur',
        description: e?.message || 'Impossible de modifier le statut.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (line: Line) => {
    if (line.is_active === false) {
      return <Badge variant="secondary" className="text-xs">Inactive</Badge>;
    }
    switch (line.status) {
      case 'running':
        return <Badge className="bg-green-500 text-xs">En cours</Badge>;
      case 'paused':
        return <Badge variant="secondary" className="text-xs">En pause</Badge>;
      case 'stopped':
      default:
        return <Badge variant="outline" className="text-xs">Arrêtée</Badge>;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
          <Factory className="w-5 h-5 sm:w-7 sm:h-7 text-primary" />
          Lignes de production
          <span className="text-sm font-normal text-muted-foreground">({lines.length})</span>
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading} className="w-8 h-8 sm:w-10 sm:h-10">
            <RefreshCw className={cn("w-3 h-3 sm:w-4 sm:h-4", isLoading && "animate-spin")} />
          </Button>
          <Button onClick={handleOpenCreate} className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-10">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Nouvelle ligne</span>
            <span className="xs:hidden">Ajouter</span>
          </Button>
        </div>
      </div>

      {/* Lines List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 sm:py-12">
          <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-muted-foreground" />
        </div>
      ) : lines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 text-muted-foreground">
            <Factory className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 opacity-50" />
            <p className="text-sm sm:text-base mb-4">Aucune ligne de production configurée</p>
            <Button onClick={handleOpenCreate} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Créer une ligne
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
          {lines.map(line => (
            <Card key={line.id} className={cn(
              "transition-all",
              line.is_active === false && "opacity-60"
            )}>
              <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className={cn(
                      "w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0",
                      line.is_active !== false ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <Factory className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm sm:text-base truncate">{line.name}</CardTitle>
                      {line.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{line.description}</p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(line)}
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-3">
                {/* Configuration info */}
                <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Scale className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="truncate">{line.scale_url ? 'Balance configurée' : 'Pas de balance'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="truncate">{line.photocell_url ? 'Photocellule configurée' : 'Pas de photocellule'}</span>
                  </div>
                  {line.weight_unit_symbol && (
                    <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                      <Link2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Unité: {line.weight_unit_symbol} ({line.weight_unit_code})</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <Button
                    variant={line.is_active !== false ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleToggleActive(line)}
                    className="gap-1 h-8 text-xs"
                  >
                    {line.is_active !== false ? (
                      <>
                        <PowerOff className="w-3 h-3" />
                        <span className="hidden sm:inline">Désactiver</span>
                      </>
                    ) : (
                      <>
                        <Power className="w-3 h-3" />
                        <span className="hidden sm:inline">Activer</span>
                      </>
                    )}
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(line)}
                      className="w-8 h-8"
                    >
                      <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirm(line)}
                      className="w-8 h-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Settings2 className="w-5 h-5" />
              {editingLine ? 'Modifier la ligne' : 'Nouvelle ligne de production'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {editingLine 
                ? 'Modifiez les paramètres de cette ligne de production.'
                : 'Configurez une nouvelle ligne de production avec ses capteurs.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Nom et Description */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs sm:text-sm">Nom de la ligne *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Ligne d'emballage A"
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs sm:text-sm">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description optionnelle de la ligne"
                  className="text-sm min-h-[60px]"
                />
              </div>
            </div>

            {/* Configuration des capteurs */}
            <div className="space-y-3 pt-2 border-t">
              <h4 className="text-xs sm:text-sm font-medium text-muted-foreground">Configuration des capteurs</h4>
              
              <div className="space-y-1.5">
                <Label htmlFor="scale_url" className="text-xs sm:text-sm flex items-center gap-1.5">
                  <Scale className="w-3 h-3" />
                  URL de la balance
                </Label>
                <Input
                  id="scale_url"
                  value={formData.scale_url}
                  onChange={e => setFormData(prev => ({ ...prev, scale_url: e.target.value }))}
                  placeholder="http://192.168.1.100:8080/weight"
                  className="h-9 sm:h-10 text-sm font-mono"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="photocell_url" className="text-xs sm:text-sm flex items-center gap-1.5">
                  <Eye className="w-3 h-3" />
                  URL de la photocellule
                </Label>
                <Input
                  id="photocell_url"
                  value={formData.photocell_url}
                  onChange={e => setFormData(prev => ({ ...prev, photocell_url: e.target.value }))}
                  placeholder="http://192.168.1.100:8080/photocell"
                  className="h-9 sm:h-10 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="weight_unit" className="text-xs sm:text-sm">Unité de poids</Label>
                <Select 
                  value={formData.weight_unit_id} 
                  onValueChange={value => setFormData(prev => ({ ...prev, weight_unit_id: value }))}
                >
                  <SelectTrigger className="h-9 sm:h-10 text-sm">
                    <SelectValue placeholder="Sélectionner une unité" />
                  </SelectTrigger>
                  <SelectContent>
                    {weightUnits.map(unit => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name} ({unit.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Statut actif */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label className="text-xs sm:text-sm">Ligne active</Label>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Une ligne inactive ne peut pas être utilisée pour la production
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="text-xs sm:text-sm h-8 sm:h-10">
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="text-xs sm:text-sm h-8 sm:h-10">
              {isSubmitting && <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />}
              {editingLine ? 'Enregistrer' : 'Créer la ligne'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Supprimer la ligne</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Êtes-vous sûr de vouloir supprimer la ligne{' '}
              <strong>"{deleteConfirm?.name}"</strong> ? 
              Cette action supprimera également toutes les tâches et données associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isSubmitting} className="text-xs sm:text-sm h-8 sm:h-10">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs sm:text-sm h-8 sm:h-10"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
