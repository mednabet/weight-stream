import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Product, ProductionLine, ProductionTask } from '@/types/production';

// Fonction utilitaire pour formater les messages d'erreur
function formatErrorMessage(error: any, defaultMessage: string): string {
  const message = error?.message || '';
  
  // Si le message est déjà formaté par api-client, le retourner tel quel
  if (message.includes('serveur') || message.includes('connexion') || message.includes('réseau')) {
    return message;
  }
  
  // Messages par défaut
  if (message.toLowerCase().includes('fetch')) {
    return 'Impossible de contacter le serveur. Vérifiez votre connexion réseau.';
  }
  
  return message || defaultMessage;
}

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
      const data = await apiClient.getProducts();
      setProducts(data as any);
    } catch (e: any) {
      toast({ 
        title: 'Erreur de chargement', 
        description: formatErrorMessage(e, 'Impossible de charger les produits. Veuillez réessayer.'), 
        variant: 'destructive' 
      });
    }
  };

  const fetchLines = async () => {
    try {
      const data = await apiClient.getLines();
      setLines(data as any);
    } catch (e: any) {
      toast({ 
        title: 'Erreur de chargement', 
        description: formatErrorMessage(e, 'Impossible de charger les lignes de production. Veuillez réessayer.'), 
        variant: 'destructive' 
      });
    }
  };

  const fetchTasks = async () => {
    try {
      const data = await apiClient.getTasks();
      setTasks(data as any);
    } catch (e: any) {
      toast({ 
        title: 'Erreur de chargement', 
        description: formatErrorMessage(e, 'Impossible de charger les tâches. Veuillez réessayer.'), 
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
      await apiClient.createProduct(product);
      toast({ title: 'Succès', description: 'Le produit a été créé avec succès.' });
      await fetchProducts();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de création', 
        description: formatErrorMessage(e, 'Impossible de créer le produit. Veuillez réessayer.'), 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const updateProduct = async (id: string, updates: any) => {
    try {
      await apiClient.updateProduct(id, updates);
      toast({ title: 'Succès', description: 'Le produit a été modifié avec succès.' });
      await fetchProducts();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de modification', 
        description: formatErrorMessage(e, 'Impossible de modifier le produit. Veuillez réessayer.'), 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const createLine = async (line: any) => {
    try {
      await apiClient.createLine(line);
      toast({ title: 'Succès', description: 'La ligne de production a été créée avec succès.' });
      await fetchLines();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de création', 
        description: formatErrorMessage(e, 'Impossible de créer la ligne. Veuillez réessayer.'), 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const updateLine = async (id: string, updates: any) => {
    try {
      await apiClient.updateLine(id, updates);
      toast({ title: 'Succès', description: 'La ligne de production a été modifiée avec succès.' });
      await fetchLines();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de modification', 
        description: formatErrorMessage(e, 'Impossible de modifier la ligne. Veuillez réessayer.'), 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const createTask = async (task: any) => {
    try {
      await apiClient.createTask(task);
      toast({ title: 'Succès', description: 'La tâche de production a été créée avec succès.' });
      await fetchTasks();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de création', 
        description: formatErrorMessage(e, 'Impossible de créer la tâche. Veuillez réessayer.'), 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const updateTask = async (id: string, updates: any) => {
    try {
      await apiClient.updateTask(id, updates);
      toast({ title: 'Succès', description: 'La tâche de production a été modifiée avec succès.' });
      await fetchTasks();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de modification', 
        description: formatErrorMessage(e, 'Impossible de modifier la tâche. Veuillez réessayer.'), 
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
      const data = await apiClient.getProducts();
      setProducts(data as any);
      setError(null);
    } catch (e: any) {
      setError(e);
      toast({ 
        title: 'Erreur de chargement', 
        description: formatErrorMessage(e, 'Impossible de charger les produits. Veuillez réessayer.'), 
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
      await apiClient.createProduct(product);
      toast({ title: 'Succès', description: 'Le produit a été créé avec succès.' });
      await fetchProducts();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de création', 
        description: formatErrorMessage(e, 'Impossible de créer le produit. Veuillez réessayer.'), 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const updateProduct = async (id: string, updates: any) => {
    try {
      await apiClient.updateProduct(id, updates);
      toast({ title: 'Succès', description: 'Le produit a été modifié avec succès.' });
      await fetchProducts();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de modification', 
        description: formatErrorMessage(e, 'Impossible de modifier le produit. Veuillez réessayer.'), 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await apiClient.deleteProduct(id);
      toast({ title: 'Succès', description: 'Le produit a été supprimé avec succès.' });
      await fetchProducts();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de suppression', 
        description: formatErrorMessage(e, 'Impossible de supprimer le produit. Veuillez réessayer.'), 
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
      const data = await apiClient.getLines();
      setLines(data as any);
    } catch (e: any) {
      toast({ 
        title: 'Erreur de chargement', 
        description: formatErrorMessage(e, 'Impossible de charger les lignes de production. Veuillez réessayer.'), 
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
      await apiClient.createLine(line);
      toast({ title: 'Succès', description: 'La ligne de production a été créée avec succès.' });
      await fetchLines();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de création', 
        description: formatErrorMessage(e, 'Impossible de créer la ligne. Veuillez réessayer.'), 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const updateLine = async (id: string, updates: any) => {
    try {
      await apiClient.updateLine(id, updates);
      toast({ title: 'Succès', description: 'La ligne de production a été modifiée avec succès.' });
      await fetchLines();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de modification', 
        description: formatErrorMessage(e, 'Impossible de modifier la ligne. Veuillez réessayer.'), 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const deleteLine = async (id: string) => {
    try {
      await apiClient.deleteLine(id);
      toast({ title: 'Succès', description: 'La ligne de production a été supprimée avec succès.' });
      await fetchLines();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de suppression', 
        description: formatErrorMessage(e, 'Impossible de supprimer la ligne. Veuillez réessayer.'), 
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
      const data = await apiClient.getTasks();
      setTasks(data as any);
    } catch (e: any) {
      toast({ 
        title: 'Erreur de chargement', 
        description: formatErrorMessage(e, 'Impossible de charger les tâches. Veuillez réessayer.'), 
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
      await apiClient.createTask(task);
      toast({ title: 'Succès', description: 'La tâche de production a été créée avec succès.' });
      await fetchTasks();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de création', 
        description: formatErrorMessage(e, 'Impossible de créer la tâche. Veuillez réessayer.'), 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const updateTask = async (id: string, updates: any) => {
    try {
      await apiClient.updateTask(id, updates);
      toast({ title: 'Succès', description: 'La tâche de production a été modifiée avec succès.' });
      await fetchTasks();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de modification', 
        description: formatErrorMessage(e, 'Impossible de modifier la tâche. Veuillez réessayer.'), 
        variant: 'destructive' 
      });
      return false;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await apiClient.deleteTask(id);
      toast({ title: 'Succès', description: 'La tâche de production a été supprimée avec succès.' });
      await fetchTasks();
      return true;
    } catch (e: any) {
      toast({ 
        title: 'Erreur de suppression', 
        description: formatErrorMessage(e, 'Impossible de supprimer la tâche. Veuillez réessayer.'), 
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
