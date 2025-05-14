import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

interface CombinedProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  reviewedPercentage: number;
  translatedPercentage: number;
  height?: string;
  showPercentage?: boolean;
  statusCounts?: Record<string, number>;
  totalSegments?: number;
}

export function CombinedProgress({
  reviewedPercentage,
  className,
  height = "h-3",
  showPercentage = false,
  statusCounts,
  totalSegments,
  ...props
}: CombinedProgressProps) {
  // Always use reviewedPercentage for consistency
  const percentage = !isNaN(reviewedPercentage) ? Math.round(reviewedPercentage) : 0;

  return (
    <div className="w-full space-y-1.5">
      <ProgressPrimitive.Root
        className={cn(
          "relative overflow-hidden rounded-full bg-secondary",
          height,
          className,
        )}
        {...props}
      >
        <div className="h-full w-full flex">
          <div
            className="h-full bg-green-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </ProgressPrimitive.Root>

      {showPercentage && (
        <div className="flex gap-x-2 text-xs text-muted-foreground my-1">
          <div className="flex items-center">
            <span>Reviewed: {percentage}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
