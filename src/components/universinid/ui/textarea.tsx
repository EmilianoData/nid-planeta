import * as React from 'react';
import { cn } from '@/lib/utils';

const textareaBase = [
  'w-full rounded-[10px] border-[1.5px] border-[var(--line)] bg-[var(--card)]',
  'px-[12px] py-[10px] text-[.9rem] text-[var(--ink)] placeholder:text-[var(--muted)]',
  'resize-y min-h-[80px] transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--navy)] focus-visible:border-[var(--navy)]',
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
