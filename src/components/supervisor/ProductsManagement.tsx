import { useState, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProducts, Product } from '@/hooks/useProductionData';
import { useWeightUnits } from '@/hooks/useWeightUnits';
import { Plus, Pencil, Trash2, Package, Scale, Layers } from 'lucide-react';

export function ProductsManagement() {
  const { products, loading, createProduct, updateProduct, deleteProduct } = useProducts();
  const { units, loading: unitsLoading, getDefaultUnit } = useWeightUnits();
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    reference: '',
    target_weight: '',
    tolerance_min: '',
    tolerance_max: '',
    weight_unit_id: '',
    units_per_pallet: '',
    pallet_target_weight: '',
    pallet_tolerance_min: '',
    pallet_tolerance_max: '',
  });

  const resetForm = () => {
    const defaultUnit = getDefaultUnit();
    setFormData({
      name: '',
      reference: '',
      target_weight: '',
      tolerance_min: '',
      tolerance_max: '',
      weight_unit_id: defaultUnit?.id || '',
      units_per_pallet: '',
      pallet_target_weight: '',
      pallet_tolerance_min: '',
      pallet_tolerance_max: '',
    });
    setEditingProduct(null);
  };

  // Set default unit when units load
  useEffect(() => {
    if (!formData.weight_unit_id && units.length > 0) {
      const defaultUnit = getDefaultUnit();
      if (defaultUnit) {
        setFormData(prev => ({ ...prev, weight_unit_id: defaultUnit.id }));
      }
    }
  }, [units, formData.weight_unit_id, getDefaultUnit]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) resetForm();
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      reference: product.reference,
      target_weight: product.target_weight.toString(),
      tolerance_min: product.tolerance_min.toString(),
      tolerance_max: product.tolerance_max.toString(),
      weight_unit_id: (product as any).weight_unit_id || getDefaultUnit()?.id || '',
      units_per_pallet: (product as any).units_per_pallet?.toString() || '',
      pallet_target_weight: (product as any).pallet_target_weight?.toString() || '',
      pallet_tolerance_min: (product as any).pallet_tolerance_min?.toString() || '',
      pallet_tolerance_max: (product as any).pallet_tolerance_max?.toString() || '',
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const productData: any = {
      name: formData.name,
      reference: formData.reference,
      target_weight: parseFloat(formData.target_weight),
      tolerance_min: parseFloat(formData.tolerance_min),
      tolerance_max: parseFloat(formData.tolerance_max),
      weight_unit_id: formData.weight_unit_id || null,
      units_per_pallet: formData.units_per_pallet ? parseInt(formData.units_per_pallet, 10) : null,
      pallet_target_weight: formData.pallet_target_weight ? parseFloat(formData.pallet_target_weight) : null,
      pallet_tolerance_min: formData.pallet_tolerance_min ? parseFloat(formData.pallet_tolerance_min) : null,
      pallet_tolerance_max: formData.pallet_tolerance_max ? parseFloat(formData.pallet_tolerance_max) : null,
    };

    let success: boolean;
    if (editingProduct) {
      success = await updateProduct(editingProduct.id, productData);
    } else {
      success = await createProduct(productData);
    }

    if (success) {
      handleOpenChange(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer ce produit ?')) {
      await deleteProduct(id);
    }
  };

  // Get unit symbol for display
  const getUnitSymbol = (unitId: string | null) => {
    if (!unitId) return 'g';
    const unit = units.find(u => u.id === unitId);
    return unit?.symbol || 'g';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Package className="w-7 h-7 text-primary" />
          Produits
        </h2>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouveau produit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* === Informations générales === */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name">Nom</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="reference">Référence</Label>
                  <Input
                    id="reference"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="weight_unit_id">Unité de poids</Label>
                  <Select
                    value={formData.weight_unit_id}
                    onValueChange={(value) => setFormData({ ...formData, weight_unit_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une unité" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          <div className="flex items-center gap-2">
                            <Scale className="w-3 h-3" />
                            {unit.name} ({unit.symbol})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* === Pesage unitaire === */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Scale className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-semibold text-foreground">Pesage unitaire</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="target_weight">Poids cible</Label>
                    <Input
                      id="target_weight"
                      type="number"
                      step="0.01"
                      value={formData.target_weight}
                      onChange={(e) => setFormData({ ...formData, target_weight: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="tolerance_min">Tolérance min</Label>
                    <Input
                      id="tolerance_min"
                      type="number"
                      step="0.01"
                      value={formData.tolerance_min}
                      onChange={(e) => setFormData({ ...formData, tolerance_min: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="tolerance_max">Tolérance max</Label>
                    <Input
                      id="tolerance_max"
                      type="number"
                      step="0.01"
                      value={formData.tolerance_max}
                      onChange={(e) => setFormData({ ...formData, tolerance_max: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* === Pesage palette === */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Layers className="w-4 h-4 text-violet-500" />
                  <span className="text-sm font-semibold text-foreground">Pesage palette</span>
                  <span className="text-xs text-muted-foreground">(optionnel)</span>
                </div>
                <div>
                  <Label htmlFor="units_per_pallet">Unités par palette</Label>
                  <Input
                    id="units_per_pallet"
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Ex: 30"
                    value={formData.units_per_pallet}
                    onChange={(e) => setFormData({ ...formData, units_per_pallet: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="pallet_target_weight">Poids cible</Label>
                    <Input
                      id="pallet_target_weight"
                      type="number"
                      step="0.01"
                      placeholder="Ex: 600"
                      value={formData.pallet_target_weight}
                      onChange={(e) => setFormData({ ...formData, pallet_target_weight: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pallet_tolerance_min">Tolérance min</Label>
                    <Input
                      id="pallet_tolerance_min"
                      type="number"
                      step="0.01"
                      placeholder="Ex: 590"
                      value={formData.pallet_tolerance_min}
                      onChange={(e) => setFormData({ ...formData, pallet_tolerance_min: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pallet_tolerance_max">Tolérance max</Label>
                    <Input
                      id="pallet_tolerance_max"
                      type="number"
                      step="0.01"
                      placeholder="Ex: 610"
                      value={formData.pallet_tolerance_max}
                      onChange={(e) => setFormData({ ...formData, pallet_tolerance_max: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  {editingProduct ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="industrial-card">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Aucun produit</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead className="text-right">Poids cible</TableHead>
                <TableHead className="text-right">Tolérance</TableHead>
                <TableHead className="text-center">Palette</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const p = product as any;
                const unitSymbol = getUnitSymbol(p.weight_unit_id);
                const hasPallet = p.units_per_pallet || p.pallet_target_weight;
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="font-mono">{product.reference}</TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{unitSymbol}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {product.target_weight} {unitSymbol}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.tolerance_min} - {product.tolerance_max} {unitSymbol}
                    </TableCell>
                    <TableCell className="text-center">
                      {hasPallet ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500 text-xs font-medium">
                            <Layers className="w-3 h-3" />
                            {p.units_per_pallet || '-'} u/pal
                          </span>
                          {p.pallet_target_weight && (
                            <span className="text-[10px] text-muted-foreground">
                              {p.pallet_tolerance_min || '?'} - {p.pallet_target_weight} - {p.pallet_tolerance_max || '?'}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(product)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(product.id)}>
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
