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
        role: u.role as UserRole,
        is_active: u.is_active ?? true,
        banned: !u.is_active,
        created_at: u.created_at,
        createdAt: u.created_at,
        lastSignIn: null,
        last_sign_in: null,
      })) as UserWithRole[];
      
      if (filterRole) {
        result = result.filter(u => u.role === filterRole);
      }
      
      return result;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      await apiClient.updateUserRole(userId, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const toggleUserStatus = async (userId: string, banned: boolean): Promise<boolean> => {
    try {
      await apiClient.toggleUserStatus(userId, !banned);
      await refetch();
      return true;
    } catch {
      return false;
    }
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    try {
      await apiClient.deleteUser(userId);
      await refetch();
      return true;
    } catch {
      return false;
    }
  };

  const resetUserPassword = async (userId: string, password: string): Promise<boolean> => {
    try {
      await apiClient.resetUserPassword(userId, password);
      return true;
    } catch {
      return false;
    }
  };

  const updateUserRole = async (userId: string, role: UserRole): Promise<boolean> => {
    try {
      await updateRoleMutation.mutateAsync({ userId, role });
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
    updateUserRole,
  };
}
