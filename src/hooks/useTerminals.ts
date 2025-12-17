import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Terminal } from '@/types/production';

export function useTerminals() {
  const { data: terminals = [], isLoading, error, refetch } = useQuery({
    queryKey: ['terminals'],
    queryFn: async () => {
      const data = await apiClient.getTerminals();
      return data as Terminal[];
    },
  });

  return { terminals, loading: isLoading, error, refetch };
}
