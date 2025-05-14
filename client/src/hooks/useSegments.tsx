
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TranslationUnit } from '@/types';

const queryKeys = {
  segments: (fileId: number) => ['segments', fileId] as const,
};

export function useSegments(fileId: number) {
  return useQuery({
    queryKey: queryKeys.segments(fileId),
    queryFn: () => api.get(`/api/segments?fileId=${fileId}`),
  });
}

export function useSegmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: number; target: string; status: string }) =>
      api.patch(`/api/segments/${data.id}`, data),
    onSuccess: (_, variables) => {
      // 성공 시 segments 쿼리 무효화
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.segments(variables.fileId) 
      });
    },
  });
}
