
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSegment } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useSegmentMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      id: number;
      target: string;
      status: string;
      fileId: number;
    }) => {
      const response = await updateSegment(data.id, data.target, data.status);
      if (!response) {
        throw new Error("Failed to update segment");
      }
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: [`/api/segments/${variables.fileId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/files/${variables.fileId}`],
      });
    },
    onError: (error) => {
      console.error("Failed to update segment:", error);
      toast({
        title: "업데이트 실패",
        description: "세그먼트 업데이트 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });
}
