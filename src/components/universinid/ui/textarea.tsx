import * as React from 'react';
import { cn } from '@/lib/utils';

const textareaBase = [
  'w-full rounded-[10px] border border-[1.5px] border-[#e2e0f0] bg-[#faf9ff]',
  'px-[12px] py-[10px] text-[.9rem] text-[#1d1840] placeholder:text-[#5e5b7a]',
  'resize-y min-h-[80px] transition-colors outline-none',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#534AB7] focus-visible:border-[#534AB7]',
  'disabled:opacity-60 disabled:cursor-not-allowed',
].join(' ');

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea ref={ref} className={cn(textareaBase, className)} {...props} />
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
