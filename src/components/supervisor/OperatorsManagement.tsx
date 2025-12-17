import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers } from '@/hooks/useUsers';
import { CreateUserDialog } from '@/components/users/CreateUserDialog';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Power, 
  PowerOff,
  Mail,
  Calendar,
  Clock,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  KeyRound
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function OperatorsManagement() {
  const { role } = useAuth();
  const { users: operators, isLoading, refetch, toggleUserStatus, deleteUser, resetUserPassword } = useUsers('operator');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    action: 'ban' | 'unban' | 'delete';
    email: string;
  } | null>(null);
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{
    open: boolean;
    userId: string;
    email: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleToggleStatus = async (userId: string, currentlyBanned: boolean, email: string) => {
    setConfirmDialog({
      open: true,
      userId,
      action: currentlyBanned ? 'unban' : 'ban',
      email,
    });
  };

  const handleResetPassword = (userId: string, email: string) => {
    setResetPasswordDialog({ open: true, userId, email });
    setNewPassword('');
  };

  const confirmResetPassword = async () => {
    if (!resetPasswordDialog || newPassword.length < 6) {
      toast({
        title: 'Mot de passe invalide',
        description: 'Le mot de passe doit contenir au moins 6 caractères.',
        variant: 'destructive',
      });
      return;
    }

    setIsResettingPassword(true);
    const success = await resetUserPassword(resetPasswordDialog.userId, newPassword);
    
    if (success) {
      toast({
        title: 'Mot de passe réinitialisé',
        description: `Le mot de passe de ${resetPasswordDialog.email} a été modifié`,
      });
      setResetPasswordDialog(null);
      setNewPassword('');
    } else {
      toast({
        title: 'Erreur de réinitialisation',
        description: 'Impossible de réinitialiser le mot de passe. Vérifiez votre connexion et réessayez.',
        variant: 'destructive',
      });
    }
    setIsResettingPassword(false);
  };

  const handleDelete = async (userId: string, email: string) => {
    setConfirmDialog({
      open: true,
      userId,
      action: 'delete',
      email,
    });
  };

  const confirmAction = async () => {
    if (!confirmDialog) return;

    if (confirmDialog.action === 'delete') {
      setDeletingUserId(confirmDialog.userId);
      const success = await deleteUser(confirmDialog.userId);
      
      if (success) {
        toast({
          title: 'Opérateur supprimé',
          description: `${confirmDialog.email} a été supprimé`,
        });
      } else {
        toast({
          title: 'Erreur de suppression',
          description: 'Impossible de supprimer l\'opérateur. Vérifiez votre connexion et réessayez.',
          variant: 'destructive',
        });
      }
      setDeletingUserId(null);
    } else {
      setTogglingUserId(confirmDialog.userId);
      const newBannedStatus = confirmDialog.action === 'ban';
      
      const success = await toggleUserStatus(confirmDialog.userId, newBannedStatus);
      
      if (success) {
        toast({
          title: newBannedStatus ? 'Compte désactivé' : 'Compte activé',
          description: newBannedStatus 
            ? `${confirmDialog.email} ne peut plus se connecter` 
            : `${confirmDialog.email} peut maintenant se connecter`,
        });
      } else {
        toast({
          title: 'Erreur de modification',
          description: 'Impossible de modifier le statut du compte. Vérifiez votre connexion et réessayez.',
          variant: 'destructive',
        });
      }
      setTogglingUserId(null);
    }
    
    setConfirmDialog(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Jamais';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Users className="w-7 h-7 text-primary" />
          Opérateurs
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </Button>
          <Button onClick={() => setShowCreateUser(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Créer un opérateur
          </Button>
        </div>
      </div>

      <CreateUserDialog
        open={showCreateUser}
        onOpenChange={(open) => {
          setShowCreateUser(open);
          if (!open) refetch();
        }}
        onUserCreated={refetch}
      />

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog?.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.action === 'delete' 
                ? 'Supprimer l\'opérateur ?' 
                : confirmDialog?.action === 'ban' 
                  ? 'Désactiver le compte ?' 
                  : 'Réactiver le compte ?'
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.action === 'delete'
                ? `L'opérateur ${confirmDialog?.email} sera définitivement supprimé. Cette action est irréversible.`
                : confirmDialog?.action === 'ban' 
                  ? `L'opérateur ${confirmDialog?.email} ne pourra plus se connecter à l'application.`
                  : `L'opérateur ${confirmDialog?.email} pourra à nouveau se connecter à l'application.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmAction}
              className={confirmDialog?.action === 'delete' || confirmDialog?.action === 'ban' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {confirmDialog?.action === 'delete' 
                ? 'Supprimer' 
                : confirmDialog?.action === 'ban' 
                  ? 'Désactiver' 
                  : 'Réactiver'
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialog?.open} onOpenChange={(open) => !open && setResetPasswordDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription>
              Définir un nouveau mot de passe pour {resetPasswordDialog?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Minimum 6 caractères"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordDialog(null)}>
              Annuler
            </Button>
            <Button 
              onClick={confirmResetPassword} 
              disabled={isResettingPassword || newPassword.length < 6}
            >
              {isResettingPassword ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Réinitialiser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {isLoading ? (
          <div className="industrial-card text-center py-12 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            Chargement des opérateurs...
          </div>
        ) : operators.length === 0 ? (
          <div className="industrial-card text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Aucun opérateur</p>
            <p className="text-sm">Créez un opérateur pour commencer</p>
          </div>
        ) : (
          operators.map(op => (
            <div 
              key={op.id}
              className={cn(
                "industrial-card flex items-center justify-between transition-opacity",
                op.banned && "opacity-60"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold",
                  op.banned 
                    ? "bg-muted text-muted-foreground" 
                    : "bg-primary/20 text-primary"
                )}>
                  {op.email !== 'N/A' ? op.email.charAt(0).toUpperCase() : '?'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {op.email}
                    </span>
                    {op.banned ? (
                      <Badge variant="destructive" className="gap-1">
                        <ShieldX className="w-3 h-3" />
                        Désactivé
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 border-status-ok text-status-ok">
                        <ShieldCheck className="w-3 h-3" />
                        Actif
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Créé: {formatDate(op.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Dernière connexion: {formatDate(op.lastSignIn)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={op.banned ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggleStatus(op.id, op.banned, op.email)}
                        disabled={togglingUserId === op.id || deletingUserId === op.id}
                        className="gap-2"
                      >
                        {togglingUserId === op.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : op.banned ? (
                          <Power className="w-4 h-4" />
                        ) : (
                          <PowerOff className="w-4 h-4" />
                        )}
                        {op.banned ? 'Réactiver' : 'Désactiver'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {op.banned 
                        ? "Permettre à l'opérateur de se connecter" 
                        : "Empêcher l'opérateur de se connecter"
                      }
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetPassword(op.id, op.email)}
                        disabled={togglingUserId === op.id || deletingUserId === op.id}
                        className="gap-2"
                      >
                        <KeyRound className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Réinitialiser le mot de passe
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(op.id, op.email)}
                        disabled={togglingUserId === op.id || deletingUserId === op.id}
                        className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {deletingUserId === op.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Supprimer définitivement l'opérateur
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
