import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';

export interface WeightUnit {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimal_precision: number;
  is_default: boolean;
  created_at?: string;
}

export function useWeightUnits() {
  const [units, setUnits] = useState<WeightUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getWeightUnits();
      setUnits(data as WeightUnit[]);
    } catch (e: any) {
      setError(e);
      toast({
        title: 'Erreur de chargement',
        description: e.message || 'Impossible de charger les unités de poids.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const getDefaultUnit = useCallback((): WeightUnit | undefined => {
    return units.find(u => u.is_default) || units[0];
  }, [units]);

  const createUnit = async (data: Omit<WeightUnit, 'id' | 'created_at'>): Promise<boolean> => {
    try {
      await apiClient.createWeightUnit(data);
      await fetchUnits();
      return true;
    } catch (e: any) {
      toast({
        title: 'Erreur de création',
        description: e.message || 'Impossible de créer l\'unité de poids.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateUnit = async (id: string, data: Partial<WeightUnit>): Promise<boolean> => {
    try {
      await apiClient.updateWeightUnit(id, data);
      await fetchUnits();
      return true;
    } catch (e: any) {
      toast({
        title: 'Erreur de modification',
        description: e.message || 'Impossible de modifier l\'unité de poids.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteUnit = async (id: string): Promise<boolean> => {
    try {
      await apiClient.deleteWeightUnit(id);
      await fetchUnits();
      return true;
    } catch (e: any) {
      toast({
        title: 'Erreur de suppression',
        description: e.message || 'Impossible de supprimer l\'unité de poids.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const setDefaultUnit = async (id: string): Promise<boolean> => {
    try {
      // Update the unit to be default (backend should handle unsetting others)
      await apiClient.updateWeightUnit(id, { is_default: true });
      await fetchUnits();
      return true;
    } catch (e: any) {
      toast({
        title: 'Erreur',
        description: e.message || 'Impossible de définir l\'unité par défaut.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    units,
    loading,
    error,
    fetchUnits,
    createUnit,
    updateUnit,
    deleteUnit,
    setDefaultUnit,
    getDefaultUnit,
    weightUnits: units,
    refetch: fetchUnits,
  };
}
