import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Product, ProductionLine, ProductionTask } from '@/types/production';

// Re-export types for backward compatibility
export type { Product, ProductionLine, ProductionTask };

export const useProductionData = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<ProductionLine[]>([]);
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, weight_unit:weight_units(*)');
      if (error) throw new Error(error.message);
      setProducts(data as any);
    } catch (e: any) {
      toast({ 
        title: 'Erreur de chargement', 
        description: e.message || 'Impossible de charger les produits.', 
        variant: 'destructive' 
      });
    }
  };

  const fetchLines = async () => {
    try {
      const { data, error } = await supabase
        .from('production_lines')
        .select('*, weight_unit:weight_units(*)');
      if (error) throw new Error(error.message);
      setLines(data as any);
    } catch (e: any) {
      toast({ 
        title: 'Erreur de chargement', 
        description: e.message || 'Impossible de charger les lignes de production.', 
        variant: 'destructive' 
      });
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('production_tasks')
        .select('*, product:products(*), line:production_lines(*)');
      if (error) throw new Error(error.message);
      setTasks(data as any);
    } catch (e: any) {
      toast({ 
        title: 'Erreur de chargement', 
        description: e.message || 'Impossible de charger les tâches.', 
        variant: 'destructive' 
      });
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchLines(), fetchTasks()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createProduct = async (product: any) => {
    try {
      const { error } = await supabase.from('products').insert(product);
      if (error) throw new Error(error.message);
      toast({ title: 'Succès', description: 'Le produit a été créé avec succès.' });
      await fetchProducts();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de création', 
        description: e.message || 'Impossible de créer le produit.', 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const updateProduct = async (id: string, updates: any) => {
    try {
      const { error } = await supabase.from('products').update(updates).eq('id', id);
      if (error) throw new Error(error.message);
      toast({ title: 'Succès', description: 'Le produit a été modifié avec succès.' });
      await fetchProducts();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de modification', 
        description: e.message || 'Impossible de modifier le produit.', 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const createLine = async (line: any) => {
    try {
      const { error } = await supabase.from('production_lines').insert(line);
      if (error) throw new Error(error.message);
      toast({ title: 'Succès', description: 'La ligne de production a été créée avec succès.' });
      await fetchLines();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de création', 
        description: e.message || 'Impossible de créer la ligne.', 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const updateLine = async (id: string, updates: any) => {
    try {
      const { error } = await supabase.from('production_lines').update(updates).eq('id', id);
      if (error) throw new Error(error.message);
      toast({ title: 'Succès', description: 'La ligne de production a été modifiée avec succès.' });
      await fetchLines();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de modification', 
        description: e.message || 'Impossible de modifier la ligne.', 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const createTask = async (task: any) => {
    try {
      const { error } = await supabase.from('production_tasks').insert(task);
      if (error) throw new Error(error.message);
      toast({ title: 'Succès', description: 'La tâche de production a été créée avec succès.' });
      await fetchTasks();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de création', 
        description: e.message || 'Impossible de créer la tâche.', 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const updateTask = async (id: string, updates: any) => {
    try {
      const { error } = await supabase.from('production_tasks').update(updates).eq('id', id);
      if (error) throw new Error(error.message);
      toast({ title: 'Succès', description: 'La tâche de production a été modifiée avec succès.' });
      await fetchTasks();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de modification', 
        description: e.message || 'Impossible de modifier la tâche.', 
        variant: 'destructive' 
      });
      return false;
    }
  };

  return {
    products,
    lines,
    tasks,
    loading,
    refetch: async () => {
      await Promise.all([fetchProducts(), fetchLines(), fetchTasks()]);
    },
    createProduct,
    updateProduct,
    createLine,
    updateLine,
    createTask,
    updateTask,
  };
};


// Hook dédié pour les produits
export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchProducts = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*, weight_unit:weight_units(*)');
      if (fetchError) throw new Error(fetchError.message);
      setProducts(data as any);
      setError(null);
    } catch (e: any) {
      setError(e);
      toast({ 
        title: 'Erreur de chargement', 
        description: e.message || 'Impossible de charger les produits.', 
        variant: 'destructive' 
      });
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchProducts();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createProduct = async (product: any) => {
    try {
      const { error } = await supabase.from('products').insert(product);
      if (error) throw new Error(error.message);
      toast({ title: 'Succès', description: 'Le produit a été créé avec succès.' });
      await fetchProducts();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de création', 
        description: e.message || 'Impossible de créer le produit.', 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const updateProduct = async (id: string, updates: any) => {
    try {
      const { error } = await supabase.from('products').update(updates).eq('id', id);
      if (error) throw new Error(error.message);
      toast({ title: 'Succès', description: 'Le produit a été modifié avec succès.' });
      await fetchProducts();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de modification', 
        description: e.message || 'Impossible de modifier le produit.', 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw new Error(error.message);
      toast({ title: 'Succès', description: 'Le produit a été supprimé avec succès.' });
      await fetchProducts();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de suppression', 
        description: e.message || 'Impossible de supprimer le produit.', 
        variant: 'destructive' 
      });
      return false;
    }
  };

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
};

// Hook dédié pour les lignes de production
export const useProductionLines = () => {
  const [lines, setLines] = useState<ProductionLine[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLines = async () => {
    try {
      const { data, error } = await supabase
        .from('production_lines')
        .select('*, weight_unit:weight_units(*)');
      if (error) throw new Error(error.message);
      setLines(data as any);
    } catch (e: any) {
      toast({ 
        title: 'Erreur de chargement', 
        description: e.message || 'Impossible de charger les lignes de production.', 
        variant: 'destructive' 
      });
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchLines();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createLine = async (line: any) => {
    try {
      const { error } = await supabase.from('production_lines').insert(line);
      if (error) throw new Error(error.message);
      toast({ title: 'Succès', description: 'La ligne de production a été créée avec succès.' });
      await fetchLines();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de création', 
        description: e.message || 'Impossible de créer la ligne.', 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const updateLine = async (id: string, updates: any) => {
    try {
      const { error } = await supabase.from('production_lines').update(updates).eq('id', id);
      if (error) throw new Error(error.message);
      toast({ title: 'Succès', description: 'La ligne de production a été modifiée avec succès.' });
      await fetchLines();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de modification', 
        description: e.message || 'Impossible de modifier la ligne.', 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const deleteLine = async (id: string) => {
    try {
      const { error } = await supabase.from('production_lines').delete().eq('id', id);
      if (error) throw new Error(error.message);
      toast({ title: 'Succès', description: 'La ligne de production a été supprimée avec succès.' });
      await fetchLines();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de suppression', 
        description: e.message || 'Impossible de supprimer la ligne.', 
        variant: 'destructive' 
      });
      return false;
    }
  };

  return {
    lines,
    loading,
    refetch: fetchLines,
    createLine,
    updateLine,
    deleteLine,
  };
};

// Hook dédié pour les tâches de production
export const useProductionTasks = () => {
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('production_tasks')
        .select('*, product:products(*), line:production_lines(*)');
      if (error) throw new Error(error.message);
      setTasks(data as any);
    } catch (e: any) {
      toast({ 
        title: 'Erreur de chargement', 
        description: e.message || 'Impossible de charger les tâches.', 
        variant: 'destructive' 
      });
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchTasks();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createTask = async (task: any) => {
    try {
      const { error } = await supabase.from('production_tasks').insert(task);
      if (error) throw new Error(error.message);
      toast({ title: 'Succès', description: 'La tâche de production a été créée avec succès.' });
      await fetchTasks();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de création', 
        description: e.message || 'Impossible de créer la tâche.', 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const updateTask = async (id: string, updates: any) => {
    try {
      const { error } = await supabase.from('production_tasks').update(updates).eq('id', id);
      if (error) throw new Error(error.message);
      toast({ title: 'Succès', description: 'La tâche de production a été modifiée avec succès.' });
      await fetchTasks();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de modification', 
        description: e.message || 'Impossible de modifier la tâche.', 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from('production_tasks').delete().eq('id', id);
      if (error) throw new Error(error.message);
      toast({ title: 'Succès', description: 'La tâche de production a été supprimée avec succès.' });
      await fetchTasks();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de suppression', 
        description: e.message || 'Impossible de supprimer la tâche.', 
        variant: 'destructive' 
      });
      return false;
    }
  };

  return {
    tasks,
    loading,
    refetch: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
  };
};
