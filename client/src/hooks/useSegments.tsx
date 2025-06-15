import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { TranslationUnit } from "@/types";
import { StatusTypes } from "@shared/schema";

export const useSegments = (fileId: number) => {
  const queryClient = useQueryClient();

  // Check if file is being translated to adjust refetch interval
  const { data: fileData } = useQuery({
    queryKey: [`/api/files/${fileId}`],
    enabled: !!fileId,
  });

  const isTranslating = fileData?.processingStatus === "translating" || 
                       (fileData?.processingStatus === "processing" && (fileData?.processingProgress || 0) >= 70);

  const { data: segments = [], ...rest } = useQuery({
    queryKey: ["segments", fileId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/segments/${fileId}`);
      return response.json();
    },
    enabled: !!fileId,
    staleTime: isTranslating ? 2000 : 30000, // Shorter cache time when translating
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchInterval: isTranslating ? 3000 : false, // Auto-refresh every 3 seconds when translating
  });

  const { mutate: updateSegmentMutation } = useMutation({
    mutationFn: async ({
      id,
      target,
      status,
      origin = "HT",
      fileId: segmentFileId = fileId
    }: {
      id: number;
      target: string;
      status: string;
      origin?: string;
      fileId?: number;
    }) => {
      const response = await apiRequest("PATCH", `/api/segments/${id}`, {
        target,
        status,
        origin,
        fileId: segmentFileId
      });
      return response.json();
    },
    onSuccess: (response) => {
      console.log('Segment update in useSegments:', response);
      
      // Extract fileId from response if available
      const updatedFileId = response?.fileId || fileId;
      
      // Invalidate queries with the correct fileId
      queryClient.invalidateQueries({ queryKey: ["segments", updatedFileId] });
      
      // Also invalidate the general segments query
      queryClient.invalidateQueries({ queryKey: ["segments"] });
    }
  });

  // Calculate segment status counts
  const statusCounts: Record<string, number> = {
    "Reviewed": 0,
    "100%": 0,
    "Fuzzy": 0,
    "MT": 0,
    "Edited": 0,
    "Rejected": 0,
  };

  (segments as TranslationUnit[]).forEach((segment: TranslationUnit) => {
    if (segment.status) {
      statusCounts[segment.status]++;
    }
  });

  // Calculate reviewed percentage
  const totalSegments = Array.isArray(segments) ? segments.length : 0;
  const reviewedPercentage = totalSegments > 0 
    ? (statusCounts["Reviewed"] / totalSegments) * 100 
    : 0;

  // 디바운스된 업데이트 함수
  const debouncedUpdateSegment = (params: {
    id: number;
    target: string;
    status: string;
    origin?: string;
    fileId: number;
  }, options?: any) => {
    setTimeout(() => {
      updateSegmentMutation({
        ...params,
        fileId: params.fileId || fileId
      }, options);
    }, 300);
  };

  return {
    segments,
    ...rest,
    updateSegment: updateSegmentMutation,
    debouncedUpdateSegment,
    isMutating: false // 간단하게 추가
  };
};