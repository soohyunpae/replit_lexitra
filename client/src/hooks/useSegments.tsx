
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSegments, updateSegment } from "@/lib/api";
import type { TranslationUnit } from "@/types";

export const useSegments = (fileId: number) => {
  const queryClient = useQueryClient();

  const { data: segments = [], ...rest } = useQuery({
    queryKey: ["segments", fileId],
    queryFn: () => fetchSegments(fileId),
    enabled: !!fileId,
  });

  const { mutate: updateSegmentMutation } = useMutation({
    mutationFn: async ({
      id,
      target,
      status,
      origin = "HT"
    }: {
      id: number;
      target: string;
      status: string;
      origin?: string;
    }) => {
      return updateSegment(id, target, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["segments", fileId] });
    },
  });

  const debouncedUpdateSegment = async (
    id: number,
    target: string,
    status: string
  ) => {
    updateSegmentMutation({ id, target, status });
  };

  return {
    segments,
    ...rest,
    updateSegment: updateSegmentMutation,
    debouncedUpdateSegment,
  };
};
