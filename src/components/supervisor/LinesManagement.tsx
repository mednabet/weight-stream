import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface Line { id: string; name: string; status?: string; is_active?: boolean }

// Fonction utilitaire pour formater les messages d'erreur
function formatErrorMessage(error: any, defaultMessage: string): string {
  const message = error?.message || '';
  
  if (message.includes('serveur') || message.includes('connexion') || message.includes('réseau')) {
    return message;
  }
  
  if (message.toLowerCase().includes('fetch')) {
    return 'Impossible de contacter le serveur. Vérifiez votre connexion réseau.';
  }
  
  return message || defaultMessage;
}

export function LinesManagement() {
  const { data: lines = [], refetch, isLoading } = useQuery({
    queryKey: ['lines'],
    queryFn: async () => (await apiClient.getLines()) as any[],
  });

  const [newName, setNewName] = useState('');

  const createLine = async () => {
    if (!newName.trim()) {
      toast({ 
        title: 'Champ requis', 
        description: 'Veuillez entrer un nom pour la ligne de production.', 
        variant: 'destructive' 
      });
      return;
    }
    try {
      await apiClient.createLine({ name: newName.trim(), status: 'stopped', is_active: true });
      setNewName('');
      await refetch();
      toast({ title: 'Succès', description: 'La ligne de production a été créée avec succès.' });
    } catch (e: any) {
      toast({ 
        title: 'Erreur de création', 
        description: formatErrorMessage(e, 'Impossible de créer la ligne. Veuillez réessayer.'), 
        variant: 'destructive' 
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestion des lignes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input placeholder="Nom de la ligne" value={newName} onChange={(e)=>setNewName(e.target.value)} />
          <Button onClick={createLine}>Ajouter</Button>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : (
          <div className="space-y-2">
            {(lines as Line[]).map(l => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="font-medium">{l.name}</div>
                <div className="text-xs text-muted-foreground">{l.status || ''}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
