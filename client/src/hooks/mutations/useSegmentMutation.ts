import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
      const response = await apiRequest("PATCH", `/api/segments/${data.id}`, {
        target: data.target,
        status: data.status,
        origin: data.origin
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update segment: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch - using both key formats for consistency
      queryClient.invalidateQueries({
        queryKey: [`/api/segments/${variables.fileId}`],
      });
      queryClient.invalidateQueries({
        queryKey: ["segments", variables.fileId],
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
        queryKey: ["segments", variables.fileId],
      });
    },
  });
}