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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// Messages d'erreur d'authentification en français
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Invalid credentials': 'Identifiants incorrects. Vérifiez votre email et mot de passe.',
  'Email already exists': 'Cette adresse email est déjà utilisée.',
  'Invalid email': 'Adresse email invalide.',
  'Password too short': 'Le mot de passe doit contenir au moins 6 caractères.',
  'User not found': 'Aucun compte trouvé avec cette adresse email.',
  'Account disabled': 'Ce compte a été désactivé. Contactez l\'administrateur.',
  'Session expired': 'Votre session a expiré. Veuillez vous reconnecter.',
};

function formatAuthError(error: any): string {
  const message = error?.message || error?.toString() || '';
  
  // Vérifier les messages connus
  for (const [key, value] of Object.entries(AUTH_ERROR_MESSAGES)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Messages par défaut basés sur le type d'erreur
  if (message.includes('fetch') || message.includes('réseau') || message.includes('serveur')) {
    return message; // Le message est déjà formaté par api-client
  }
  
  if (message.includes('401') || message.includes('unauthorized')) {
    return 'Identifiants incorrects. Vérifiez votre email et mot de passe.';
  }
  
  if (message.includes('403')) {
    return 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
  }
  
  return message || 'Une erreur est survenue lors de l\'authentification.';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    isAuthenticated: apiClient.isAuthenticated(),
    isLoading: true,
  });

  const refreshUser = useCallback(async () => {
    if (!apiClient.isAuthenticated()) {
      setState(prev => ({ ...prev, user: null, role: null, isAuthenticated: false, isLoading: false }));
      return;
    }

    try {
      const me = await apiClient.getCurrentUser();
      setState(prev => ({
        ...prev,
        user: { id: me.user.id, email: me.user.email },
        role: me.user.role as UserRole,
        isAuthenticated: true,
        isLoading: false,
      }));
    } catch (e: any) {
      // Setup required or invalid token
      apiClient.logout();
      setState(prev => ({ ...prev, user: null, role: null, isAuthenticated: false, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiClient.login(email, password);
      setState(prev => ({
        ...prev,
        user: { id: res.user.id, email: res.user.email },
        role: res.user.role as UserRole,
        isAuthenticated: true,
        isLoading: false,
      }));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: formatAuthError(e) };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiClient.signUp(email, password);
      setState(prev => ({
        ...prev,
        user: { id: res.user.id, email: res.user.email },
        role: res.user.role as UserRole,
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
