/**
 * Icon — Material Symbols (M3) icon component.
 *
 * Renders a Google Material Symbols Outlined glyph via ligature. The font is
 * loaded once from Google Fonts in `index.html`; this component just controls
 * size, weight, optical size, and fill state via `font-variation-settings`.
 *
 * Names are M3 ligature identifiers, e.g. `play_arrow`, `bar_chart`, `tune`.
 * Browse the catalog at https://fonts.google.com/icons.
 *
 * Default size is 20px which matches our 14px (text-sm) inline use; bump to
 * 18/24 for button-only icons or hero affordances.
 *
 * IMPORTANT: The font is SUBSETTED in `index.html` via the `icon_names=`
 * query parameter for performance (~8KB vs ~600KB unsubset). When adding a
 * new icon here, you MUST also add its name to the alphabetically-sorted
 * `icon_names` list in `index.html`, otherwise it'll render as the literal
 * text ligature name instead of a glyph.
 */

import { cn } from '@/lib/cn';

export interface IconProps {
  name: string;
  /** Pixel size of the glyph. Drives both `font-size` and the M3 `opsz` axis. */
  size?: number;
  /** Stroke weight (M3 `wght` axis). 300 is hairline; 700 is heavy. Default 400. */
  weight?: 200 | 300 | 400 | 500 | 600 | 700;
  /** Filled vs outlined variant (M3 `FILL` axis). */
  fill?: boolean;
  /** Optical density (M3 `GRAD` axis). Useful for dark themes — -25 reduces visual weight slightly. */
  grade?: -25 | 0 | 200;
  className?: string;
  /** Override default decorative behavior — pass a label to make the icon meaningful to screen readers. */
  label?: string;
}

export function Icon({
  name,
  size = 20,
  weight = 400,
  fill = false,
  grade = 0,
  className,
  label,
}: IconProps) {
  // Clamp opsz to the font's supported axis (20..48).
  const opsz = Math.min(48, Math.max(20, size));
  return (
    <span
      className={cn('material-symbols-outlined select-none leading-none', className)}
      style={{
        fontSize: `${size}px`,
        width: `${size}px`,
        height: `${size}px`,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opsz}`,
      }}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
    >
      {name}
    </span>
  );
}
