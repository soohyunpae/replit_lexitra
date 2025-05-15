
import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    style?: React.CSSProperties;
  }
>(({ className, value, style, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-full w-full overflow-hidden bg-secondary rounded-full",
      className
    )}
    {...props}
  >
    <div className="h-full w-full flex overflow-hidden">
      <div className="h-full bg-green-500/70" style={{ width: 'var(--reviewed-percent, 0%)' }} />
      <div className="h-full bg-blue-500/70" style={{ width: 'var(--match-100-percent, 0%)' }} />
      <div className="h-full bg-yellow-500/70" style={{ width: 'var(--fuzzy-percent, 0%)' }} />
      <div className="h-full bg-gray-500/70" style={{ width: 'var(--mt-percent, 0%)' }} />
      <div className="h-full bg-purple-500/70" style={{ width: 'var(--edited-percent, 0%)' }} />
      <div className="h-full bg-red-500/70" style={{ width: 'var(--rejected-percent, 0%)' }} />
    </div>
  </ProgressPrimitive.Root>
))
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
