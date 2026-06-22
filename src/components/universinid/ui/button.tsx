import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  // Cor SEMPRE via token (var(--...)). Foco = anel marinho (--navy) em :focus-visible.
  [
    'inline-flex items-center justify-center font-bold rounded-[10px] transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--navy)]',
    'disabled:opacity-60 disabled:cursor-default',
  ],
  {
    variants: {
      variant: {
        // primary = Delp Red (CTA)
        default: 'bg-[var(--red)] text-white hover:opacity-90',
        // sucesso / conclusão = verde
        success: 'bg-[var(--green)] text-white hover:opacity-90',
        // destrutivo = Delp Red
        danger: 'bg-[var(--red)] text-white hover:opacity-90',
        // ghost = tint marinho
        ghost: 'bg-transparent text-[var(--navy)] hover:bg-[var(--navy-l)]',
        // secondary = outline-navy
        outline:
          'border border-[var(--navy)] bg-transparent text-[var(--navy)] hover:bg-[var(--navy-l)]',
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
