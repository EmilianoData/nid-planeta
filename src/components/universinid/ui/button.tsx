import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  // Base styles — hardcoded hex, no var() references
  [
    'inline-flex items-center justify-center font-bold rounded-[10px] transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#534AB7]',
    'disabled:opacity-60 disabled:cursor-default',
  ],
  {
    variants: {
      variant: {
        default: 'bg-[#3C3489] text-white hover:bg-[#534AB7]',
        success: 'bg-[#0B861D] text-white hover:bg-[#096e18]',
        danger: 'bg-[#cc0f10] text-white hover:bg-[#a80d0e]',
        ghost: 'bg-transparent text-[#3C3489] hover:bg-[#f0eeff]',
        outline:
          'border border-[#ececf6] bg-transparent text-[#1d1840] hover:bg-[#faf9ff]',
      },
      size: {
        md: 'px-4 py-[9px] text-[.82rem]',
        sm: 'px-3 py-[6px] text-[.75rem]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
