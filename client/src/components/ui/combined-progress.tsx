
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

interface CombinedProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  reviewedPercentage: number;
  statusCounts?: Record<string, number>;
  totalSegments?: number;
  height?: string;
  showPercentage?: boolean;
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
  const percentage = !isNaN(reviewedPercentage) ? Math.round(reviewedPercentage) : 0;

  return (
    <div className="w-full space-y-1.5">
      <ProgressPrimitive.Root
        className={cn(
          "relative overflow-hidden rounded-full bg-secondary",
          height,
          className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className="h-full w-full flex bg-primary transition-all"
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
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
