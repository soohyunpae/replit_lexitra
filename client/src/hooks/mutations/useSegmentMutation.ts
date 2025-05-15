
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SegmentUpdateData = {
  id: number;
  target: string;
  status: string;
  fileId: number;
  origin?: string;
};

export function useSegmentMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: SegmentUpdateData) => {
      const response = await apiRequest("PATCH", `/api/segments/${data.id}`, {
        target: data.target,
        status: data.status,
        origin: data.origin,
        fileId: data.fileId // Add fileId to payload
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update segment: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (response, variables) => {
      console.log('Segment update response:', response);
      
      // Get fileId either from response or from variables
      const fileId = response?.fileId || variables.fileId;
      
      // 모든 관련 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: ["segments"]
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/segments/${fileId}`]
      });
      queryClient.invalidateQueries({
        queryKey: ["files"]
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/files/${fileId}`]
      });
    },
    onError: (error) => {
      console.error("Failed to update segment:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update segment. Please try again.",
        variant: "destructive",
      });
    },
  });
}
