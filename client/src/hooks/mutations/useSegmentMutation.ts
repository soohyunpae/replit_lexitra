
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSegment } from "@/lib/api";

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
        queryKey: ["segments", variables.fileId],
      });
    },
  });
}
