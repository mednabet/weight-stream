import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { 
  Shield, LogOut, Users, ArrowLeft, UserPlus, 
  Trash2, Loader2, RefreshCw, Scale, Ban, CheckCircle, KeyRound,
  Factory, Monitor, UserCog, LayoutDashboard, Settings, ChevronDown
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { SupervisorDashboard } from '@/pages/supervisor/SupervisorDashboard';
import { OperatorKiosk } from '@/pages/operator/OperatorKiosk';

type AdminView = 'overview' | 'users' | 'weight-units' | 'production' | 'terminal';

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const { users, isLoading, error, refetch, toggleUserStatus, resetUserPassword } = useUsers();
  const [currentView, setCurrentView] = useState<AdminView>('overview');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserRole, setCreateUserRole] = useState<'supervisor' | 'operator'>('supervisor');
  const [deleteConfirm, setDeleteConfirm] = useState<UserWithRole | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserWithRole | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Filter users by role
  const supervisors = users.filter(u => u.role === 'supervisor');
  const operators = users.filter(u => u.role === 'operator');

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

  const openCreateUserDialog = (role: 'supervisor' | 'operator') => {
    setCreateUserRole(role);
    setShowCreateUser(true);
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

  const getViewTitle = () => {
    switch (currentView) {
      case 'overview': return 'Vue d\'ensemble';
      case 'users': return 'Gestion des utilisateurs';
      case 'weight-units': return 'Unités de poids';
      case 'production': return 'Production';
      case 'terminal': return 'Terminal';
      default: return 'Administration';
    }
  };

  // Composant réutilisable pour afficher un utilisateur
  const UserCard = ({ u }: { u: UserWithRole }) => (
    <div 
      key={u.id}
      className={cn(
        "industrial-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4",
        u.banned && "opacity-60 border-destructive/30"
      )}
    >
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <div className={cn(
          "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-base sm:text-lg font-bold flex-shrink-0",
          u.banned ? "bg-destructive/20 text-destructive" : 
          u.role === 'supervisor' ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary"
        )}>
          {u.email.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <span className="font-semibold text-sm sm:text-lg truncate max-w-[150px] sm:max-w-none">{u.email}</span>
            {getRoleBadge(u.role)}
            {u.banned && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">
                Désactivé
              </span>
            )}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground">
            Dernière connexion: {formatDate(u.lastSignIn)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
        <Select
          value={u.role}
          onValueChange={(value) => handleRoleChange(u.id, value as 'operator' | 'supervisor')}
          disabled={updatingRole === u.id || u.banned}
        >
          <SelectTrigger className="w-28 sm:w-36 h-8 sm:h-10 text-xs sm:text-sm">
            {updatingRole === u.id ? (
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
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
          className="w-8 h-8 sm:w-10 sm:h-10"
        >
          <KeyRound className="w-3 h-3 sm:w-4 sm:h-4" />
        </Button>
        
        <Button
          variant={u.banned ? "default" : "outline"}
          size="icon"
          onClick={() => handleToggleStatus(u)}
          disabled={togglingStatus === u.id}
          title={u.banned ? "Activer le compte" : "Désactiver le compte"}
          className={cn("w-8 h-8 sm:w-10 sm:h-10", u.banned ? "bg-primary hover:bg-primary/90" : "")}
        >
          {togglingStatus === u.id ? (
            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
          ) : u.banned ? (
            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
          ) : (
            <Ban className="w-3 h-3 sm:w-4 sm:h-4" />
          )}
        </Button>
        
        <Button
          variant="destructive"
          size="icon"
          onClick={() => setDeleteConfirm(u)}
          title="Supprimer le compte"
          className="w-8 h-8 sm:w-10 sm:h-10"
        >
          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
        </Button>
      </div>
    </div>
  );

  // Vue d'ensemble
  const OverviewContent = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Carte Superviseurs */}
        <div 
          className="industrial-card cursor-pointer hover:border-accent/50 transition-colors"
          onClick={() => setCurrentView('users')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Superviseurs</span>
            <Users className="w-5 h-5 text-accent" />
          </div>
          <div className="text-3xl font-bold">{supervisors.length}</div>
          <div className="text-sm text-muted-foreground">Comptes actifs</div>
        </div>

        {/* Carte Opérateurs */}
        <div 
          className="industrial-card cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setCurrentView('users')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Opérateurs</span>
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div className="text-3xl font-bold">{operators.length}</div>
          <div className="text-sm text-muted-foreground">Comptes actifs</div>
        </div>

        {/* Carte Production */}
        <div 
          className="industrial-card cursor-pointer hover:border-accent/50 transition-colors"
          onClick={() => setCurrentView('production')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Production</span>
            <Factory className="w-5 h-5 text-accent" />
          </div>
          <div className="text-3xl font-bold">-</div>
          <div className="text-sm text-muted-foreground">Voir les détails</div>
        </div>

        {/* Carte Terminal */}
        <div 
          className="industrial-card cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setCurrentView('terminal')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Terminal</span>
            <Monitor className="w-5 h-5 text-primary" />
          </div>
          <div className="text-3xl font-bold">-</div>
          <div className="text-sm text-muted-foreground">Accès opérateur</div>
        </div>
      </div>

      {/* Accès rapides */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Accès rapides</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => setCurrentView('users')}
          >
            <UserCog className="w-6 h-6" />
            <span>Gérer les utilisateurs</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => setCurrentView('weight-units')}
          >
            <Scale className="w-6 h-6" />
            <span>Unités de poids</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => setCurrentView('production')}
          >
            <Factory className="w-6 h-6" />
            <span>Vue production</span>
          </Button>
        </div>
      </div>
    </div>
  );

  // Gestion des utilisateurs
  const UsersContent = () => (
    <div className="space-y-8">
      {/* Supervisors Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <Users className="w-6 h-6 text-accent" />
            Superviseurs
            <span className="text-sm font-normal text-muted-foreground">({supervisors.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
            <Button onClick={() => openCreateUserDialog('supervisor')} className="gap-2" variant="outline">
              <UserPlus className="w-4 h-4" />
              Créer un superviseur
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            {error.message || 'Une erreur est survenue'}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : supervisors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Aucun superviseur</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {supervisors.map(u => <UserCard key={u.id} u={u} />)}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Operators Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <Users className="w-6 h-6 text-primary" />
            Opérateurs
            <span className="text-sm font-normal text-muted-foreground">({operators.length})</span>
          </h2>
          <Button onClick={() => openCreateUserDialog('operator')} className="gap-2" variant="outline">
            <UserPlus className="w-4 h-4" />
            Créer un opérateur
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : operators.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Aucun opérateur</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {operators.map(u => <UserCard key={u.id} u={u} />)}
          </div>
        )}
      </div>

      <CreateUserDialog
        open={showCreateUser}
        onOpenChange={setShowCreateUser}
        onUserCreated={refetch}
        defaultRole={createUserRole}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => window.location.href = '/'}
              className="w-8 h-8 sm:w-10 sm:h-10 mr-1 sm:mr-2"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <div className="flex items-center gap-2 sm:gap-3">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary hidden sm:block" />
              <div>
                <h1 className="text-base sm:text-xl font-bold">Administration</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">{getViewTitle()}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Bouton Vue d'ensemble à gauche */}
            <Button 
              variant={currentView === 'overview' ? 'default' : 'outline'}
              onClick={() => setCurrentView('overview')}
              className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4"
            >
              <LayoutDashboard className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Vue d'ensemble</span>
              <span className="xs:hidden">Vue</span>
            </Button>

            {/* Menu Paramètres à droite */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4">
                  <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Paramètres</span>
                  <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 sm:w-56">
                <DropdownMenuItem onClick={() => setCurrentView('users')} className="gap-2">
                  <UserCog className="w-4 h-4" />
                  Utilisateurs
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentView('weight-units')} className="gap-2">
                  <Scale className="w-4 h-4" />
                  Unités de poids
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCurrentView('production')} className="gap-2">
                  <Factory className="w-4 h-4" />
                  Production
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentView('terminal')} className="gap-2">
                  <Monitor className="w-4 h-4" />
                  Terminal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="hidden md:flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-secondary ml-2 sm:ml-4">
              <span className="text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-none">{user?.email}</span>
            </div>

            <Button variant="ghost" size="icon" onClick={logout} className="w-8 h-8 sm:w-10 sm:h-10">
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-3 sm:p-6 max-w-[1920px] mx-auto">
        {currentView === 'overview' && <OverviewContent />}
        
        {currentView === 'users' && <UsersContent />}
        
        {currentView === 'weight-units' && <WeightUnitsManagement />}
        
        {currentView === 'production' && (
          <div className="-mx-6 -mt-6">
            <SupervisorDashboard embedded />
          </div>
        )}
        
        {currentView === 'terminal' && (
          <div className="-mx-6 -mt-6">
            <OperatorKiosk embedded />
          </div>
        )}
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
