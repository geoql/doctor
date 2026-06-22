import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';

export { default as Button } from './Button.vue';

export const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-accent text-ink-on-accent hover:opacity-90',
        destructive: 'bg-error text-white hover:opacity-90',
        outline:
          'border border-border bg-bg text-ink hover:bg-surface-2 hover:border-ink-muted',
        accentSoft:
          'border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 hover:border-accent',
        secondary: 'bg-surface-2 text-ink hover:bg-border',
        ghost: 'text-ink-muted hover:bg-surface-2 hover:text-ink',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2.5',
        sm: 'h-8 px-3',
        lg: 'h-11 px-6',
        icon: 'size-8',
        'icon-sm': 'size-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
