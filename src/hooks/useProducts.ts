import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Product } from '@/types/production';

interface ApiProduct {
  id: string;
  name: string;
  reference: string;
  target_weight: string | number;
  tolerance_min: string | number;
  tolerance_max: string | number;
  is_active: number | boolean;
  weight_unit_symbol?: string | null;
}

function toNumber(v: any): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function mapApiProduct(p: ApiProduct): Product {
  const targetWeight = toNumber(p.target_weight);
  const minWeight = toNumber(p.tolerance_min);
  const maxWeight = toNumber(p.tolerance_max);
  const tolerancePercent = targetWeight > 0 ? ((maxWeight - minWeight) / targetWeight) * 100 : 0;

  return {
    id: p.id,
    name: p.name,
    code: p.reference,
    targetWeight,
    minWeight,
    maxWeight,
    unit: p.weight_unit_symbol || 'kg',
    tolerancePercent: Math.round(tolerancePercent * 10) / 10,
  };
}

export function useProducts(onlyActive: boolean = true) {
  const { data: products = [], isLoading, error, refetch } = useQuery({
    queryKey: ['products', onlyActive],
    queryFn: async () => {
      const data = await apiClient.getProducts();
      const mapped = (data as ApiProduct[]).map(mapApiProduct);
      return onlyActive ? mapped.filter(p => (p as any).is_active !== false) : mapped;
    },
  });

  return { products, loading: isLoading, error, refetch };
}
