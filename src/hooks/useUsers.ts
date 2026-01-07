import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
      const { data, error } = await supabase
        .from('user_roles')
        .select('*');
      
      if (error) throw new Error(error.message);
      
      let result = (data as any[]).map((u) => ({
        id: u.user_id,
        email: u.user_id, // Note: We don't have access to auth.users email
        role: u.role as UserRole,
        is_active: true,
        banned: false,
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
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const toggleUserStatus = async (userId: string, banned: boolean): Promise<boolean> => {
    // Not available with Supabase RLS - would need edge function
    console.warn('toggleUserStatus not available in Supabase mode');
    return false;
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    // Not available with Supabase RLS - would need edge function
    console.warn('deleteUser not available in Supabase mode');
    return false;
  };

  const resetUserPassword = async (userId: string, password: string): Promise<boolean> => {
    // Not available with Supabase RLS - would need edge function
    console.warn('resetUserPassword not available in Supabase mode');
    return false;
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
