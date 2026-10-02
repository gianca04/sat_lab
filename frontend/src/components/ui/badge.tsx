import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.2 text-[11px] font-medium border",
  {
    variants: {
      variant: {
        default:
          "border-[#2c3235] bg-[#22252b] text-[#d8d9da]",
        secondary:
          "border-transparent bg-[#1e2228] text-[#8e8e93]",
        outline:
          "border-[#2c3235] text-[#8e8e93]",
        online:
          "border-[#73bf69]/30 bg-[#73bf69]/10 text-[#73bf69]",
        offline:
          "border-[#8e8e93]/30 bg-[#8e8e93]/10 text-[#8e8e93]",
        warning:
          "border-[#fade2a]/30 bg-[#fade2a]/10 text-[#fade2a]",
        destructive:
          "border-[#f2495c]/30 bg-[#f2495c]/10 text-[#f2495c]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
