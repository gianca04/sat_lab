import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[2px] text-xs font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#3274d9] text-white hover:bg-[#2761b8]",
        secondary:
          "bg-[#22252b] text-[#d8d9da] border border-[#2c3235] hover:bg-[#2c3235]",
        outline:
          "border border-[#2c3235] bg-transparent text-[#d8d9da] hover:bg-[#22252b]",
        ghost:
          "text-[#d8d9da] hover:bg-[#22252b]",
        destructive:
          "bg-[#f2495c] text-white hover:bg-[#d4374a]",
      },
      size: {
        default: "h-7 px-2.5 py-1",
        sm: "h-6 px-2 text-[11px]",
        icon: "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
