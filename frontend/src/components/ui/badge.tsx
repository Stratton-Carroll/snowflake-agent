/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

// eslint-disable-next-line react-refresh/only-export-components
const badgeVariants = cva(
  "inline-flex items-center border rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-sky-500/20 text-sky-200",
        outline: "border border-slate-600/60 text-slate-200",
        accent: "border-transparent bg-gradient-to-r from-sky-500/40 to-purple-500/40 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
);

export { Badge, badgeVariants };
