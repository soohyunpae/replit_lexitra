
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Project } from "@/types";

export function useProjectQuery(projectId: number) {
  return useQuery({
    queryKey: ["projects", projectId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/projects/${projectId}`);
      return response.json() as Promise<Project>;
    },
    enabled: !!projectId,
  });
}
