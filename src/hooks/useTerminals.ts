import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Terminal } from '@/types/production';

export type { Terminal };

export function useTerminals() {
  const queryClient = useQueryClient();

  const { data: terminals = [], isLoading, error, refetch } = useQuery({
    queryKey: ['terminals'],
    queryFn: async () => {
      const data = await apiClient.getTerminals();
      return (data as any[]).map((t) => ({
        id: t.id,
        device_uid: t.device_uid,
        deviceUid: t.device_uid,
        name: t.name,
        line_id: t.line_id,
        lineId: t.line_id,
        ip_address: t.ip_address,
        last_ping: t.last_ping,
        lastPing: t.last_ping,
        is_online: !!t.is_online,
        isOnline: !!t.is_online,
      })) as Terminal[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Terminal>) => {
      return apiClient.createTerminal({
        device_uid: data.device_uid || data.deviceUid,
        name: data.name,
        line_id: data.line_id || data.lineId,
        ip_address: data.ip_address,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminals'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Terminal> }) => {
      return apiClient.updateTerminal(id, {
        device_uid: data.device_uid || data.deviceUid,
        name: data.name,
        line_id: data.line_id || data.lineId,
        ip_address: data.ip_address,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminals'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.deleteTerminal(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminals'] });
    },
  });

  const createTerminal = async (data: Partial<Terminal>): Promise<boolean> => {
    try {
      await createMutation.mutateAsync(data);
      return true;
    } catch {
      return false;
    }
  };

  const updateTerminal = async (id: string, data: Partial<Terminal>): Promise<boolean> => {
    try {
      await updateMutation.mutateAsync({ id, data });
      return true;
    } catch {
      return false;
    }
  };

  const deleteTerminal = async (id: string): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  return {
    terminals,
    loading: isLoading,
    error: error as Error | null,
    refetch,
    createTerminal,
    updateTerminal,
    deleteTerminal,
  };
}
