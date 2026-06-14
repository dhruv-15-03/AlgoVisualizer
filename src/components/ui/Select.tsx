import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface Option {
  value: string;
  label: string;
  /** Render the option greyed-out and unselectable (still visible). */
  disabled?: boolean;
  /** Native tooltip, handy for explaining why a disabled option is unavailable. */
  title?: string;
}

interface OptionGroup {
  label: string;
  options: Option[];
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options?: Option[];
  groups?: OptionGroup[];
  placeholder?: string;
}

export function Select({ options, groups, placeholder, className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'h-9 rounded-md border border-ink-600 bg-ink-800 px-2.5 text-sm text-ink-100',
        'focus:outline-none focus:ring-2 focus:ring-accent-400',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {groups
        ? groups.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map((o) => (
                <option key={o.value} value={o.value} disabled={o.disabled} title={o.title}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))
        : options?.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled} title={o.title}>
              {o.label}
            </option>
          ))}
    </select>
  );
}
