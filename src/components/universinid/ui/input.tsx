import * as React from 'react';
import { cn } from '@/lib/utils';

const inputBase = [
  'w-full rounded-[10px] border border-[1.5px] border-[#e2e0f0] bg-[#faf9ff]',
  'px-[12px] py-[10px] text-[.9rem] text-[#1d1840] placeholder:text-[#5e5b7a]',
  'transition-colors outline-none',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#534AB7] focus-visible:border-[#534AB7]',
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
