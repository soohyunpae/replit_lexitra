import * as React from "react"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"

export type SortDirection = "asc" | "desc" | null

interface SortButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  direction: SortDirection
  onSort: () => void
}

export function SortButton({ direction, onSort, children, className, ...props }: SortButtonProps) {
  return (
    <Button
      variant="ghost"
      onClick={onSort}
      className={`flex items-center gap-1 hover:bg-transparent ${className}`}
      {...props}
    >
      {children}
      {direction === "asc" ? (
        <ArrowUp className="h-4 w-4" />
      ) : direction === "desc" ? (
        <ArrowDown className="h-4 w-4" />
      ) : (
        <ArrowUpDown className="h-4 w-4 opacity-50" />
      )}
    </Button>
  )
}
