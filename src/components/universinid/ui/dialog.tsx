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
      // scrim marinho translúcido (rgb 33,61,117 = #213D75)
      'fixed inset-0 z-40 bg-[rgba(33,61,117,0.4)] backdrop-blur-[2px]',
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
        // Card — cor via token; sombra navy-tinted (--shadow-hero)
        'w-full max-w-[480px] rounded-[12px] bg-[var(--card)] border border-[var(--line)]',
        'p-[22px] shadow-[var(--shadow-hero)]',
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
          'absolute right-4 top-4 rounded-[6px] text-[var(--muted)] text-lg leading-none',
          'hover:text-[var(--ink)] hover:bg-[var(--navy-l)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--navy)]',
          // Alvo de toque 44×44 (WCAG 2.5.5); o × segue centrado pelo flex. Token em
          // :root → resolve mesmo no conteúdo portalizado (RadixDialog.Portal → body).
          'min-h-[var(--touch-min)] min-w-[var(--touch-min)] flex items-center justify-center transition-colors'
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
      // pr-16: clearance p/ a área de toque 44×44 do DialogClose (canto sup. dir.) não
      // sobrepor o título (gate D4). Ajustar se a medição no portal mostrar folga/aperto.
      'text-[1rem] font-bold text-[var(--ink)] mb-1 pr-16',
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
    className={cn('text-[.85rem] text-[var(--muted)] mb-4', className)}
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
