import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-accent-500 hover:bg-accent-400 text-white disabled:bg-ink-700 disabled:text-ink-400',
  secondary:
    'bg-ink-700 hover:bg-ink-600 text-ink-100 border border-ink-600 disabled:opacity-50',
  ghost:
    'bg-transparent hover:bg-ink-700 text-ink-200 disabled:opacity-50',
  danger:
    'bg-rose-500 hover:bg-rose-400 text-white disabled:opacity-50',
};

const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-9 px-3 text-sm',
  lg: 'h-10 px-4 text-sm',
  icon: 'h-9 w-9 p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900',
        'disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
