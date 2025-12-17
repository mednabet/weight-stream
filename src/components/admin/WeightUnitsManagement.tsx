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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
          <Scale className="w-5 h-5 sm:w-7 sm:h-7 text-primary" />
          Unités de poids
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchUnits} disabled={loading} className="w-8 h-8 sm:w-10 sm:h-10">
            <RefreshCw className={cn("w-3 h-3 sm:w-4 sm:h-4", loading && "animate-spin")} />
          </Button>
          <Button onClick={handleOpenCreate} className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-10">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Ajouter une unité</span>
            <span className="xs:hidden">Ajouter</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 sm:py-12">
          <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-muted-foreground" />
        </div>
      ) : units.length === 0 ? (
        <div className="text-center py-8 sm:py-12 text-muted-foreground">
          <Scale className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
          <p className="text-sm sm:text-base">Aucune unité de poids configurée</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {units.map(unit => (
            <div
              key={unit.id}
              className={cn(
                "industrial-card flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                unit.is_default && "ring-2 ring-primary"
              )}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-base sm:text-lg font-bold flex-shrink-0",
                  unit.is_default ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                )}>
                  {unit.symbol}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm sm:text-base truncate">{unit.name}</span>
                    {unit.is_default && (
                      <Star className="w-3 h-3 sm:w-4 sm:h-4 text-primary fill-primary flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                    <span className="font-mono">{unit.code}</span>
                    <span>•</span>
                    <span>{unit.decimal_precision} déc.</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 justify-end">
                {!unit.is_default && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSetDefault(unit)}
                    title="Définir par défaut"
                    className="w-8 h-8 sm:w-10 sm:h-10"
                  >
                    <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenEdit(unit)}
                  className="w-8 h-8 sm:w-10 sm:h-10"
                >
                  <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteConfirm(unit)}
                  className="text-destructive hover:text-destructive w-8 h-8 sm:w-10 sm:h-10"
                  disabled={unit.is_default}
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editingUnit ? 'Modifier l\'unité' : 'Nouvelle unité'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="code" className="text-xs sm:text-sm">Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="kg"
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="symbol" className="text-xs sm:text-sm">Symbole</Label>
                <Input
                  id="symbol"
                  value={formData.symbol}
                  onChange={e => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
                  placeholder="kg"
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="name" className="text-xs sm:text-sm">Nom</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Kilogramme"
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="decimal_precision" className="text-xs sm:text-sm">Décimales affichées</Label>
              <Input
                id="decimal_precision"
                type="number"
                min={0}
                max={6}
                value={formData.decimal_precision}
                onChange={e => setFormData(prev => ({ ...prev, decimal_precision: parseInt(e.target.value) || 0 }))}
                placeholder="3"
                className="h-9 sm:h-10 text-sm"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">Nombre de chiffres après la virgule (0-6)</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="text-xs sm:text-sm h-8 sm:h-10">
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="text-xs sm:text-sm h-8 sm:h-10">
              {isSubmitting && <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />}
              {editingUnit ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Êtes-vous sûr de vouloir supprimer l'unité{' '}
              <strong>{deleteConfirm?.name}</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isSubmitting} className="text-xs sm:text-sm h-8 sm:h-10">Annuler</AlertDialogCancel>
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
