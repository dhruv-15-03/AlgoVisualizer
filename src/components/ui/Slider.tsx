import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (v: number) => void;
}

export function Slider({ value, min, max, step = 1, onValueChange, className, ...props }: SliderProps) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onValueChange(Number(e.target.value))}
      className={cn(
        'h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-700 accent-accent-400',
        '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5',
        '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-400 [&::-webkit-slider-thumb]:shadow-md',
        className,
      )}
      {...props}
    />
  );
}
