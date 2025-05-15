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
      origin?: string;
    }) => {
      const response = await updateSegment(data.id, data.target, data.status, data.origin);
      if (!response) {
        throw new Error('No response from updateSegment');
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
        title: "Update Failed",
        description: "Failed to update segment. Please try again.",
        variant: "destructive",
      });
      // Invalidate queries to ensure we have the latest state
      queryClient.invalidateQueries({
        queryKey: [`/api/segments/${variables.fileId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/files/${variables.fileId}`],
      });
    },
  });
}