
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { File } from "@/types";

export function useFileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { projectId: number; file: FormData }) => {
      const response = await apiRequest("POST", `/api/projects/${data.projectId}/files`, data.file);
      return response.json() as Promise<File>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["projects", variables.projectId, "files"]
      });
    },
  });
}
