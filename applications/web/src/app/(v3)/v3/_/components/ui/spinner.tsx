import { IconLoader } from "@tabler/icons-react"

import { cn } from "@v3/_/lib/utils"

function Spinner({ className, stroke, ...props }: React.ComponentProps<"svg">) {
  // otherwise weird type error
  const Icon = IconLoader as React.FC<React.ComponentProps<"svg">>

  return (
    <Icon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
      {...(stroke ? { stroke } : {})}
    />
  )
}

export { Spinner }
