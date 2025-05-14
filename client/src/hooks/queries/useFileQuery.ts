
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { File } from "@/types";

export function useFileQuery(fileId: number) {
  return useQuery({
    queryKey: ["files", fileId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/files/${fileId}`);
      return response.json() as Promise<File>;
    },
    enabled: !!fileId,
  });
}
