import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/production';

interface AuthState {
  user: { id: string; email: string } | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// Messages d'erreur d'authentification en français
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Identifiants incorrects. Vérifiez votre email et mot de passe.',
  'Email already exists': 'Cette adresse email est déjà utilisée.',
  'Invalid email': 'Adresse email invalide.',
  'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères.',
  'User not found': 'Aucun compte trouvé avec cette adresse email.',
  'Email not confirmed': 'Veuillez confirmer votre email avant de vous connecter.',
};

function formatAuthError(error: any): string {
  const message = error?.message || error?.toString() || '';
  
  for (const [key, value] of Object.entries(AUTH_ERROR_MESSAGES)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return message || 'Une erreur est survenue lors de l\'authentification.';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const getUserRole = useCallback(async (userId: string): Promise<UserRole> => {
    const { data, error } = await supabase.rpc('get_user_role', { _user_id: userId });
    if (error) return 'operator';
    return (data as UserRole) || 'operator';
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setState(prev => ({ ...prev, user: null, role: null, isAuthenticated: false, isLoading: false }));
        return;
      }

      const role = await getUserRole(session.user.id);
      
      setState(prev => ({
        ...prev,
        user: { id: session.user.id, email: session.user.email || '' },
        role,
        isAuthenticated: true,
        isLoading: false,
      }));
    } catch (e) {
      setState(prev => ({ ...prev, user: null, role: null, isAuthenticated: false, isLoading: false }));
    }
  }, [getUserRole]);

  useEffect(() => {
    refreshUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const role = await getUserRole(session.user.id);
        setState(prev => ({
          ...prev,
          user: { id: session.user.id, email: session.user.email || '' },
          role,
          isAuthenticated: true,
          isLoading: false,
        }));
      } else if (event === 'SIGNED_OUT') {
        setState(prev => ({ ...prev, user: null, role: null, isAuthenticated: false, isLoading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshUser, getUserRole]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Utilisateur non trouvé');

      const role = await getUserRole(data.user.id);
      
      setState(prev => ({
        ...prev,
        user: { id: data.user.id, email: data.user.email || '' },
        role,
        isAuthenticated: true,
        isLoading: false,
      }));

      return { success: true };
    } catch (e: any) {
      return { success: false, error: formatAuthError(e) };
    }
  }, [getUserRole]);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Erreur lors de la création du compte');

      setState(prev => ({
        ...prev,
        user: { id: data.user!.id, email: data.user!.email || '' },
        role: 'operator',
        isAuthenticated: true,
        isLoading: false,
      }));

      return { success: true };
    } catch (e: any) {
      return { success: false, error: formatAuthError(e) };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setState(prev => ({ ...prev, user: null, role: null, isAuthenticated: false }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, signUp, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
