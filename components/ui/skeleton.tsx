import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      // The travelling highlight comes from `[data-slot="skeleton"]::after`
      // in globals.css. `animate-pulse` is deliberately gone — running both
      // reads as two unrelated things breathing at different rates.
      className={cn("rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
