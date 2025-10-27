/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

// eslint-disable-next-line react-refresh/only-export-components
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-sky-500 to-purple-600 text-white shadow-lg shadow-sky-500/25 hover:from-sky-400 hover:to-purple-500 focus-visible:ring-sky-400/60",
        outline:
          "border border-slate-600/60 bg-slate-900/40 text-slate-100 shadow-sm hover:bg-slate-800/50 focus-visible:ring-slate-400/50",
        ghost: "text-slate-200 hover:bg-slate-800/70 focus-visible:ring-slate-500/50",
        secondary:
          "bg-slate-800 text-slate-100 hover:bg-slate-700 focus-visible:ring-slate-400/50 shadow shadow-slate-900/30",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
