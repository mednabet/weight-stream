import { useState } from 'react';
import { Product } from '@/types/production';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package, Check, Scale, Loader2, AlertCircle } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';

interface ProductSelectorProps {
  selectedProduct?: Product;
  onSelect: (product: Product) => void;
  onCancel?: () => void;
  className?: string;
}

export function ProductSelector({ selectedProduct, onSelect, onCancel, className }: ProductSelectorProps) {
  const { products, loading, error } = useProducts();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Product | undefined>(selectedProduct);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Package className="w-6 h-6 text-accent" />
          Sélectionner un produit
        </h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher par nom ou référence..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>
      </div>

      {/* Product list */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <span>Chargement des produits...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-destructive">
            <AlertCircle className="w-8 h-8 mb-3" />
            <span>Erreur de chargement</span>
            <span className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'Erreur inconnue'}
            </span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="w-8 h-8 mb-3 opacity-50" />
            <span>{search ? 'Aucun produit trouvé' : 'Aucun produit disponible'}</span>
            {search && (
              <Button variant="link" onClick={() => setSearch('')} className="mt-2">
                Effacer la recherche
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => setSelected(product)}
                className={cn(
                  'w-full p-4 rounded-xl border text-left transition-all active:scale-[0.99]',
                  selected?.id === product.id 
                    ? 'border-accent bg-accent/10 ring-2 ring-accent/30' 
                    : 'border-border bg-card hover:bg-secondary'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{product.name}</span>
                      {selected?.id === product.id && (
                        <Check className="w-5 h-5 text-accent" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground font-mono mt-1">
                      {product.code}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Scale className="w-4 h-4" />
                      <span className="font-mono font-semibold text-foreground">
                        {product.targetWeight.toLocaleString()}{product.unit}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      ±{product.tolerancePercent}%
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span>Min: {product.minWeight.toLocaleString()}{product.unit}</span>
                  <span>Max: {product.maxWeight.toLocaleString()}{product.unit}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="p-4 border-t border-border flex gap-3 bg-background/80 backdrop-blur-sm">
        {onCancel && (
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="flex-1 h-12"
          >
            Annuler
          </Button>
        )}
        <Button 
          onClick={handleConfirm}
          disabled={!selected}
          className="flex-1 h-12"
        >
          Confirmer
        </Button>
      </div>
    </div>
  );
}
