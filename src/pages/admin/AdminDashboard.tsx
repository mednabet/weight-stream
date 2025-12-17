import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { 
  Shield, LogOut, Users, ArrowLeft, UserPlus, 
  Trash2, Loader2, RefreshCw, Scale, Ban, CheckCircle, KeyRound
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CreateUserDialog } from '@/components/users/CreateUserDialog';
import { useUsers, UserWithRole } from '@/hooks/useUsers';
import { apiClient } from '@/lib/api-client';
import { WeightUnitsManagement } from '@/components/admin/WeightUnitsManagement';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const { users, isLoading, error, refetch, toggleUserStatus, resetUserPassword } = useUsers();
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<UserWithRole | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserWithRole | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Filter to show only supervisors (admin manages supervisors)
  const supervisors = users.filter(u => u.role === 'supervisor');

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    try {
            try {
        await apiClient.deleteUser(deleteConfirm.id);
      } catch (e: any) {
        toast({
          title: 'Erreur',
          description: e?.message || 'Erreur lors de la suppression',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Utilisateur supprimé',
        description: `${deleteConfirm.email} a été supprimé`,
      });
      refetch();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Erreur de connexion au serveur',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'operator' | 'supervisor') => {
    setUpdatingRole(userId);
    try {
            try {
        await apiClient.updateUserRole(userId, newRole);
      } catch (e: any) {
        toast({
          title: 'Erreur',
          description: e?.message || 'Erreur lors de la mise à jour',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Rôle mis à jour',
        description: `Le rôle a été changé en ${newRole === 'supervisor' ? 'superviseur' : 'opérateur'}`,
      });
      refetch();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Erreur de connexion au serveur',
        variant: 'destructive',
      });
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleToggleStatus = async (userToToggle: UserWithRole) => {
    setTogglingStatus(userToToggle.id);
    try {
      const success = await toggleUserStatus(userToToggle.id, !userToToggle.banned);
      if (success) {
        toast({
          title: userToToggle.banned ? 'Compte activé' : 'Compte désactivé',
          description: `${userToToggle.email} a été ${userToToggle.banned ? 'activé' : 'désactivé'}`,
        });
      } else {
        toast({
          title: 'Erreur',
          description: 'Erreur lors de la modification du statut',
          variant: 'destructive',
        });
      }
    } finally {
      setTogglingStatus(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || newPassword.length < 6 || newPassword.length > 128) return;

    setIsResettingPassword(true);
    try {
      const success = await resetUserPassword(resetPasswordUser.id, newPassword);
      if (success) {
        toast({
          title: 'Mot de passe réinitialisé',
          description: `Le mot de passe de ${resetPasswordUser.email} a été changé`,
        });
        setResetPasswordUser(null);
        setNewPassword('');
      } else {
        toast({
          title: 'Erreur',
          description: 'Erreur lors de la réinitialisation du mot de passe',
          variant: 'destructive',
        });
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">Admin</span>;
      case 'supervisor':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">Superviseur</span>;
      default:
        return <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Opérateur</span>;
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Jamais';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => window.location.href = '/'}
              className="mr-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">Administration</h1>
                <p className="text-sm text-muted-foreground">Gestion des superviseurs</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary">
              <span className="text-sm font-medium">{user?.email}</span>
            </div>

            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-[1920px] mx-auto">
        <Tabs defaultValue="supervisors" className="space-y-6">
          <TabsList>
            <TabsTrigger value="supervisors" className="gap-2">
              <Users className="w-4 h-4" />
              Superviseurs
            </TabsTrigger>
            <TabsTrigger value="weight-units" className="gap-2">
              <Scale className="w-4 h-4" />
              Unités de poids
            </TabsTrigger>
          </TabsList>

          <TabsContent value="supervisors">
            {/* Supervisor Management */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <Users className="w-7 h-7 text-accent" />
                  Gestion des superviseurs
                </h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={refetch} disabled={isLoading}>
                    <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                  </Button>
                  <Button onClick={() => setShowCreateUser(true)} className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Créer un superviseur
                  </Button>
                </div>
              </div>

              <CreateUserDialog
                open={showCreateUser}
                onOpenChange={setShowCreateUser}
                onUserCreated={refetch}
              />

              {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                  {error}
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : supervisors.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun superviseur trouvé</p>
                  <p className="text-sm">Créez un superviseur pour commencer</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {supervisors.map(u => (
                    <div 
                      key={u.id}
                      className={cn(
                        "industrial-card flex items-center justify-between",
                        u.banned && "opacity-60 border-destructive/30"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold",
                          u.banned ? "bg-destructive/20 text-destructive" : "bg-accent/20 text-accent"
                        )}>
                          {u.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">{u.email}</span>
                            {getRoleBadge(u.role)}
                            {u.banned && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">
                                Désactivé
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Dernière connexion: {formatDate(u.lastSignIn)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={u.role}
                          onValueChange={(value) => handleRoleChange(u.id, value as 'operator' | 'supervisor')}
                          disabled={updatingRole === u.id || u.banned}
                        >
                          <SelectTrigger className="w-36">
                            {updatingRole === u.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <SelectValue />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="operator">Opérateur</SelectItem>
                            <SelectItem value="supervisor">Superviseur</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setResetPasswordUser(u)}
                          title="Réinitialiser le mot de passe"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant={u.banned ? "default" : "outline"}
                          size="icon"
                          onClick={() => handleToggleStatus(u)}
                          disabled={togglingStatus === u.id}
                          title={u.banned ? "Activer le compte" : "Désactiver le compte"}
                          className={u.banned ? "bg-primary hover:bg-primary/90" : ""}
                        >
                          {togglingStatus === u.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : u.banned ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Ban className="w-4 h-4" />
                          )}
                        </Button>
                        
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => setDeleteConfirm(u)}
                          title="Supprimer le compte"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="weight-units">
            <WeightUnitsManagement />
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'utilisateur{' '}
              <strong>{deleteConfirm?.email}</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={() => { setResetPasswordUser(null); setNewPassword(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Réinitialiser le mot de passe
            </DialogTitle>
            <DialogDescription>
              Définir un nouveau mot de passe pour <strong>{resetPasswordUser?.email}</strong>
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
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => { setResetPasswordUser(null); setNewPassword(''); }}
              disabled={isResettingPassword}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleResetPassword}
              disabled={isResettingPassword || newPassword.length < 6 || newPassword.length > 128}
            >
              {isResettingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Réinitialisation...
                </>
              ) : (
                'Réinitialiser'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
