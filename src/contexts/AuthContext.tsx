import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';
import { UserRole } from '@/types/production';

interface AuthState {
  user: { id: string; email: string } | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (login: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (login: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// Messages d'erreur d'authentification en français
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Identifiant ou mot de passe incorrect': 'Identifiants incorrects. Vérifiez votre identifiant et mot de passe.',
  'Email ou mot de passe incorrect': 'Identifiants incorrects. Vérifiez votre identifiant et mot de passe.',
  'Compte désactivé': 'Votre compte a été désactivé. Contactez votre administrateur.',
  'Identifiant déjà utilisé': 'Cet identifiant est déjà utilisé.',
  'Email déjà utilisé': 'Cet identifiant est déjà utilisé.',
  'Invalid login credentials': 'Identifiants incorrects. Vérifiez votre identifiant et mot de passe.',
  'Failed to fetch': 'Impossible de contacter le serveur. Vérifiez votre connexion réseau.',
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

  const refreshUser = useCallback(async () => {
    try {
      // Check if we have a stored token
      if (!apiClient.isAuthenticated()) {
        setState(prev => ({ ...prev, user: null, role: null, isAuthenticated: false, isLoading: false }));
        return;
      }

      // Validate token by fetching current user
      const result = await apiClient.getCurrentUser();
      
      setState(prev => ({
        ...prev,
        user: { id: result.user.id, email: result.user.email },
        role: result.user.role as UserRole,
        isAuthenticated: true,
        isLoading: false,
      }));
    } catch (e) {
      // Token invalid or expired
      apiClient.logout();
      setState(prev => ({ ...prev, user: null, role: null, isAuthenticated: false, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (loginId: string, password: string) => {
    try {
      const result = await apiClient.login(loginId, password);
      
      setState(prev => ({
        ...prev,
        user: { id: result.user.id, email: result.user.email },
        role: result.user.role as UserRole,
        isAuthenticated: true,
        isLoading: false,
      }));

      return { success: true };
    } catch (e: any) {
      return { success: false, error: formatAuthError(e) };
    }
  }, []);

  const signUp = useCallback(async (loginId: string, password: string) => {
    try {
      const result = await apiClient.signUp(loginId, password);

      setState(prev => ({
        ...prev,
        user: { id: result.user.id, email: result.user.email },
        role: result.user.role as UserRole,
        isAuthenticated: true,
        isLoading: false,
      }));

      return { success: true };
    } catch (e: any) {
      return { success: false, error: formatAuthError(e) };
    }
  }, []);

  const logout = useCallback(() => {
    apiClient.logout();
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
