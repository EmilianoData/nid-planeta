import * as React from 'react';
import { cn } from '@/lib/utils';

const selectBase = [
  'w-full rounded-[10px] border border-[1.5px] border-[#e2e0f0] bg-[#faf9ff]',
  'px-[12px] py-[10px] text-[.9rem] text-[#1d1840]',
  'appearance-none',
  // Subtle chevron via inline SVG background
  'bg-no-repeat bg-[right_12px_center]',
  'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%235e5b7a%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22/%3E%3C/svg%3E")]',
  'pr-[36px]',
  'cursor-pointer transition-colors outline-none',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#534AB7] focus-visible:border-[#534AB7]',
  'disabled:opacity-60 disabled:cursor-not-allowed',
].join(' ');

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => {
    return (
      <select ref={ref} className={cn(selectBase, className)} {...props} />
    );
  }
);

Select.displayName = 'Select';

export { Select };
