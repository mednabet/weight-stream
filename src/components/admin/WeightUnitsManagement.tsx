import { useState } from 'react';
import { useWeightUnits, WeightUnit } from '@/hooks/useWeightUnits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { toast } from '@/hooks/use-toast';
import { Scale, Plus, Pencil, Trash2, Star, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WeightUnitsManagement() {
  const { units, loading, fetchUnits, createUnit, updateUnit, deleteUnit, setDefaultUnit } = useWeightUnits();
  const [showDialog, setShowDialog] = useState(false);
  const [editingUnit, setEditingUnit] = useState<WeightUnit | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<WeightUnit | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    symbol: '',
    decimal_precision: 3,
  });

  const handleOpenCreate = () => {
    setEditingUnit(null);
    setFormData({ code: '', name: '', symbol: '', decimal_precision: 3 });
    setShowDialog(true);
  };

  const handleOpenEdit = (unit: WeightUnit) => {
    setEditingUnit(unit);
    setFormData({ code: unit.code, name: unit.name, symbol: unit.symbol, decimal_precision: unit.decimal_precision });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.name || !formData.symbol) {
      toast({
        title: 'Erreur',
        description: 'Tous les champs sont obligatoires',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    let success: boolean;

    if (editingUnit) {
      success = await updateUnit(editingUnit.id, formData);
    } else {
      success = await createUnit({ ...formData, is_default: false });
    }

    if (success) {
      toast({
        title: editingUnit ? 'Unité modifiée' : 'Unité créée',
        description: `L'unité ${formData.name} a été ${editingUnit ? 'modifiée' : 'créée'}`,
      });
      setShowDialog(false);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    if (deleteConfirm.is_default) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'unité par défaut',
        variant: 'destructive',
      });
      setDeleteConfirm(null);
      return;
    }

    setIsSubmitting(true);
    const success = await deleteUnit(deleteConfirm.id);
    if (success) {
      toast({
        title: 'Unité supprimée',
        description: `L'unité ${deleteConfirm.name} a été supprimée`,
      });
    }
    setDeleteConfirm(null);
    setIsSubmitting(false);
  };

  const handleSetDefault = async (unit: WeightUnit) => {
    const success = await setDefaultUnit(unit.id);
    if (success) {
      toast({
        title: 'Unité par défaut',
        description: `${unit.name} est maintenant l'unité par défaut`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Scale className="w-7 h-7 text-primary" />
          Unités de poids
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchUnits} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Ajouter une unité
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : units.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Scale className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucune unité de poids configurée</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {units.map(unit => (
            <div
              key={unit.id}
              className={cn(
                "industrial-card flex items-center justify-between",
                unit.is_default && "ring-2 ring-primary"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold",
                  unit.is_default ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                )}>
                  {unit.symbol}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{unit.name}</span>
                    {unit.is_default && (
                      <Star className="w-4 h-4 text-primary fill-primary" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-mono">{unit.code}</span>
                    <span>•</span>
                    <span>{unit.decimal_precision} décimales</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {!unit.is_default && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSetDefault(unit)}
                    title="Définir par défaut"
                  >
                    <Star className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenEdit(unit)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteConfirm(unit)}
                  className="text-destructive hover:text-destructive"
                  disabled={unit.is_default}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUnit ? 'Modifier l\'unité' : 'Nouvelle unité'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="kg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Kilogramme"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbole</Label>
              <Input
                id="symbol"
                value={formData.symbol}
                onChange={e => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
                placeholder="kg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="decimal_precision">Décimales affichées</Label>
              <Input
                id="decimal_precision"
                type="number"
                min={0}
                max={6}
                value={formData.decimal_precision}
                onChange={e => setFormData(prev => ({ ...prev, decimal_precision: parseInt(e.target.value) || 0 }))}
                placeholder="3"
              />
              <p className="text-xs text-muted-foreground">Nombre de chiffres après la virgule (0-6)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingUnit ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'unité{' '}
              <strong>{deleteConfirm?.name}</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
