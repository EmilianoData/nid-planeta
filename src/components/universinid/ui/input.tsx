import * as React from 'react';
import { cn } from '@/lib/utils';

const inputBase = [
  'w-full rounded-[10px] border-[1.5px] border-[var(--line)] bg-[var(--card)]',
  'px-[12px] py-[10px] text-[.9rem] text-[var(--ink)] placeholder:text-[var(--muted)]',
  'transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--navy)] focus-visible:border-[var(--navy)]',
  'disabled:opacity-60 disabled:cursor-not-allowed',
].join(' ');

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input ref={ref} className={cn(inputBase, className)} {...props} />
    );
  }
);

Input.displayName = 'Input';

export { Input };
