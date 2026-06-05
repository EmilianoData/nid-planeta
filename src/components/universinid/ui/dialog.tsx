'use client';

import * as React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

// Re-export primitive roots for composability
const Dialog = RadixDialog.Root;
const DialogTrigger = RadixDialog.Trigger;

// Overlay
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Overlay>
>(({ className, ...props }, ref) => (
  <RadixDialog.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = 'DialogOverlay';

// Content
const DialogContent = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Content>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Content>
>(({ className, children, ...props }, ref) => (
  <RadixDialog.Portal>
    <DialogOverlay />
    <RadixDialog.Content
      ref={ref}
      className={cn(
        // Centering
        'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
        // Card style — all hex, no var()
        'w-full max-w-[480px] rounded-[12px] bg-white border border-[#ececf6]',
        'p-[22px] shadow-[0_12px_32px_rgba(29,24,64,0.14)]',
        // Animation
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        'data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        'focus-visible:outline-none',
        className
      )}
      {...props}
    >
      {children}
      <RadixDialog.Close
        aria-label="Fechar"
        className={cn(
          'absolute right-4 top-4 rounded-[6px] text-[#5e5b7a] text-lg leading-none',
          'hover:text-[#1d1840] hover:bg-[#f0eeff]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#534AB7]',
          'h-7 w-7 flex items-center justify-center transition-colors'
        )}
      >
        ×
      </RadixDialog.Close>
    </RadixDialog.Content>
  </RadixDialog.Portal>
));
DialogContent.displayName = 'DialogContent';

// Title
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Title>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Title>
>(({ className, ...props }, ref) => (
  <RadixDialog.Title
    ref={ref}
    className={cn(
      'text-[1rem] font-bold text-[#1d1840] mb-1 pr-8',
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

// Description
const DialogDescription = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Description>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Description>
>(({ className, ...props }, ref) => (
  <RadixDialog.Description
    ref={ref}
    className={cn('text-[.85rem] text-[#5e5b7a] mb-4', className)}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';

// Footer
interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

function DialogFooter({ className, ...props }: DialogFooterProps) {
  return (
    <div
      className={cn('flex justify-end gap-2 mt-5', className)}
      {...props}
    />
  );
}
DialogFooter.displayName = 'DialogFooter';

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
};
