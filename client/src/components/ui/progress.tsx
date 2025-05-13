import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
      className
    )}
    {...props}
  >
    <div className="h-full w-full flex overflow-hidden">
      {/* Reviewed segments (green) */}
      <div className="h-full bg-green-300" style={{ width: 'var(--reviewed-percent, 0%)' }} />
      {/* 100% segments (blue) */}
      <div className="h-full bg-blue-300" style={{ width: 'var(--match-100-percent, 0%)' }} />
      {/* Fuzzy segments (yellow) */}
      <div className="h-full bg-yellow-300" style={{ width: 'var(--fuzzy-percent, 0%)' }} />
      {/* MT segments (gray) */}
      <div className="h-full bg-gray-300" style={{ width: 'var(--mt-percent, 0%)' }} />
      {/* Edited segments (purple) */}
      <div className="h-full bg-purple-300" style={{ width: 'var(--edited-percent, 0%)' }} />
      {/* Rejected segments (red) */}
      <div className="h-full bg-red-300" style={{ width: 'var(--rejected-percent, 0%)' }} />
    </div>
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
