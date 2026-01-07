import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      const { data, error: fetchError } = await supabase
        .from('weight_units')
        .select('*')
        .order('name');
      
      if (fetchError) throw new Error(fetchError.message);
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
      const { error } = await supabase.from('weight_units').insert(data);
      if (error) throw new Error(error.message);
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
      const { error } = await supabase.from('weight_units').update(data).eq('id', id);
      if (error) throw new Error(error.message);
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
      const { error } = await supabase.from('weight_units').delete().eq('id', id);
      if (error) throw new Error(error.message);
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
      // First, unset all defaults
      await supabase.from('weight_units').update({ is_default: false }).neq('id', id);
      // Then set the new default
      const { error } = await supabase.from('weight_units').update({ is_default: true }).eq('id', id);
      if (error) throw new Error(error.message);
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
