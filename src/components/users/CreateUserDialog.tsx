import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, UserPlus } from 'lucide-react';
import { z } from 'zod';
import { UserRole } from '@/types/production';

const createUserSchema = z.object({
  login: z.string().min(2, 'L\'identifiant doit contenir au moins 2 caractères'),
  password: z.string().min(3, 'Le mot de passe doit contenir au moins 3 caractères'),
  role: z.enum(['operator', 'supervisor'] as const),
});

// Messages d'erreur en français
const USER_ERROR_MESSAGES: Record<string, string> = {
  'Identifiant déjà utilisé': 'Cet identifiant est déjà utilisé.',
  'Email déjà utilisé': 'Cet identifiant est déjà utilisé.',
  'Email already exists': 'Cet identifiant est déjà utilisé.',
  'Unauthorized': 'Vous n\'êtes pas autorisé à effectuer cette action.',
  'Failed to fetch': 'Impossible de contacter le serveur. Vérifiez votre connexion.',
};

function formatUserError(error: any): string {
  const message = error?.message || error?.toString() || '';
  
  for (const [key, value] of Object.entries(USER_ERROR_MESSAGES)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return message || 'Une erreur est survenue lors de la création de l\'utilisateur.';
}

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated?: () => void;
  defaultRole?: 'operator' | 'supervisor';
}

export function CreateUserDialog({ open, onOpenChange, onUserCreated, defaultRole = 'operator' }: CreateUserDialogProps) {
  const { role: currentUserRole } = useAuth();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'operator' | 'supervisor'>(defaultRole);

  // Update role when defaultRole changes
  useEffect(() => {
    setRole(defaultRole);
  }, [defaultRole]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreateSupervisor = currentUserRole === 'admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = createUserSchema.safeParse({ login, password, role });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    // Check permission
    if (role === 'supervisor' && !canCreateSupervisor) {
      setError('Vous n\'avez pas la permission de créer des superviseurs');
      return;
    }

    setIsLoading(true);

    try {
      // Create user via API client (sends as "email" field for backward compat)
      await apiClient.createUser({ email: login, password, role });

      toast({
        title: 'Utilisateur créé',
        description: `${login} a été créé avec le rôle ${role === 'operator' ? 'opérateur' : 'superviseur'}`,
      });

      // Reset form
      setLogin('');
      setPassword('');
      setRole('operator');
      onOpenChange(false);
      onUserCreated?.();
    } catch (err: any) {
      setError(formatUserError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setLogin('');
    setPassword('');
    setRole('operator');
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Créer un {defaultRole === 'supervisor' ? 'superviseur' : 'opérateur'}
          </DialogTitle>
          <DialogDescription>
            {canCreateSupervisor 
              ? `Créez un nouvel ${defaultRole === 'supervisor' ? 'superviseur' : 'opérateur'}`
              : 'Créez un nouvel opérateur'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-login">Identifiant</Label>
            <Input
              id="new-login"
              type="text"
              placeholder="ex: ahmed, op1, superviseur1..."
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">Mot de passe</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Minimum 3 caractères"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'operator' | 'supervisor')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operator">Opérateur</SelectItem>
                {canCreateSupervisor && (
                  <SelectItem value="supervisor">Superviseur</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || !login || !password}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
