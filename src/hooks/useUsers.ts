import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { UserRole } from '@/types/production';

export interface UserWithRole {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  banned?: boolean;
  created_at: string;
  createdAt?: string;
  lastSignIn?: string | null;
  last_sign_in?: string | null;
}

export function useUsers(filterRole?: string) {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error, refetch } = useQuery({
    queryKey: ['users', filterRole],
    queryFn: async () => {
      const data = await apiClient.getUsers();
      let result = (data as any[]).map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        is_active: !!u.is_active,
        banned: !u.is_active,
        created_at: u.created_at,
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in || null,
        last_sign_in: u.last_sign_in || null,
      })) as UserWithRole[];
      
      if (filterRole) {
        result = result.filter(u => u.role === filterRole);
      }
      
      return result;
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, banned }: { userId: string; banned: boolean }) => {
      await apiClient.toggleUserStatus(userId, !banned);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.deleteUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      await apiClient.resetUserPassword(userId, password);
    },
  });

  const toggleUserStatus = async (userId: string, banned: boolean): Promise<boolean> => {
    try {
      await toggleStatusMutation.mutateAsync({ userId, banned });
      return true;
    } catch {
      return false;
    }
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    try {
      await deleteUserMutation.mutateAsync(userId);
      return true;
    } catch {
      return false;
    }
  };

  const resetUserPassword = async (userId: string, password: string): Promise<boolean> => {
    try {
      await resetPasswordMutation.mutateAsync({ userId, password });
      return true;
    } catch {
      return false;
    }
  };

  return {
    users,
    loading: isLoading,
    isLoading,
    error: error as Error | null,
    refetch,
    toggleUserStatus,
    deleteUser,
    resetUserPassword,
  };
}
