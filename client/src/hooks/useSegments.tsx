import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { TranslationUnit } from "@/types";

export const useSegments = (fileId: number) => {
  const queryClient = useQueryClient();

  const { data: segments = [], ...rest } = useQuery({
    queryKey: ["segments", fileId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/segments/${fileId}`);
      return response.json();
    },
    enabled: !!fileId,
    staleTime: 30000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
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
      const response = await apiRequest("PATCH", `/api/segments/${id}`, {
        target,
        status,
        origin
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["segments", fileId] });
    }
  });

  // Calculate segment status counts
  const statusCounts: Record<StatusType, number> = {
    "Reviewed": 0,
    "100%": 0,
    "Fuzzy": 0,
    "MT": 0,
    "Edited": 0,
    "Rejected": 0,
  };

  segments.forEach((segment) => {
    if (segment.status) {
      statusCounts[segment.status]++;
    }
  });

  // Calculate reviewed percentage
  const totalSegments = segments.length;
  const reviewedPercentage = totalSegments > 0 
    ? (statusCounts["Reviewed"] / totalSegments) * 100 
    : 0;

  return {
    segments,
    ...rest,
    updateSegment: updateSegmentMutation
  };
};