import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { UserRole } from '@/types/production';

export interface UserWithRole {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export function useUsers() {
  const { data: users = [], isLoading, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const data = await apiClient.getUsers();
      return (data as any[]).map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        is_active: !!u.is_active,
        created_at: u.created_at,
      })) as UserWithRole[];
    },
  });

  return { users, loading: isLoading, error, refetch };
}
