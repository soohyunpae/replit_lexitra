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
      <div className="h-full bg-green-500" style={{ width: 'var(--reviewed-percent, 0%)' }} />
      <div className="h-full bg-gray-200 dark:bg-gray-700" style={{ width: 'calc(100% - var(--reviewed-percent, 0%))' }} />
    </div>
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
