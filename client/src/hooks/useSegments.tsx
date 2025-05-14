
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSegments, updateSegment } from "../lib/api";
import { TranslationUnit } from "@/types";

const queryKeys = {
  segments: (fileId: number) => ["segments", fileId] as const,
};

export function useSegments(fileId: number) {
  return useQuery({
    queryKey: queryKeys.segments(fileId),
    queryFn: () => fetchSegments(fileId),
  });
}

export function useSegmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: number;
      target: string;
      status: string;
      fileId: number;
    }) => updateSegment(data.id, data.target, data.status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.segments(variables.fileId),
      });
    },
  });
}
