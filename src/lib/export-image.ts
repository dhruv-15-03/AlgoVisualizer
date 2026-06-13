/**
 * export-image — serialize an on-screen SVG visualization to a downloadable PNG.
 *
 * The DOM/canvas rasterization steps can't run under jsdom, so the testable
 * logic (size math + SVG serialization + data-url encoding) is split into pure
 * functions, while the orchestration that touches `Image`/`<canvas>`/`<a>` is
 * kept thin and side-effect-only.
 */

const DEFAULT_BACKGROUND = '#0f172a';
const DEFAULT_SCALE = 2;
const DEFAULT_MAX_DIMENSION = 4096;

export interface Size {
  width: number;
  height: number;
}

export interface ExportSizeOptions {
  /** Pixel-density multiplier applied before clamping. */
  scale?: number;
  /** Longest output side is clamped to this many pixels (aspect preserved). */
  maxDimension?: number;
}

export interface ExportPngOptions extends ExportSizeOptions {
  /** Solid background painted under the artwork (PNG has no transparency by default here). */
  background?: string;
  /** Download file name (without extension). */
  fileName?: string;
}

/**
 * Read an SVG's intrinsic pixel size, preferring explicit width/height
 * attributes, then the viewBox, then the live bounding box. Falls back to a
 * sane default so a measurement never yields zero.
 */
export function readSvgSize(svg: SVGSVGElement): Size {
  const attrW = parseLength(svg.getAttribute('width'));
  const attrH = parseLength(svg.getAttribute('height'));
  if (attrW && attrH) return { width: attrW, height: attrH };

  const viewBox = svg.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }

  const box = typeof svg.getBoundingClientRect === 'function' ? svg.getBoundingClientRect() : null;
  if (box && box.width > 0 && box.height > 0) {
    return { width: box.width, height: box.height };
  }
  return { width: 640, height: 480 };
}

/**
 * Scale a base size by `scale`, then clamp the longest side to `maxDimension`
 * while preserving aspect ratio. Always returns positive integers.
 */
export function computeExportSize(base: Size, options: ExportSizeOptions = {}): Size {
  const scale = options.scale && options.scale > 0 ? options.scale : DEFAULT_SCALE;
  const maxDimension =
    options.maxDimension && options.maxDimension > 0 ? options.maxDimension : DEFAULT_MAX_DIMENSION;

  let width = Math.max(1, base.width) * scale;
  let height = Math.max(1, base.height) * scale;

  const longest = Math.max(width, height);
  if (longest > maxDimension) {
    const k = maxDimension / longest;
    width *= k;
    height *= k;
  }
  return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
}

/**
 * Serialize an SVG element to a standalone XML string: namespaces and explicit
 * width/height are ensured, and an optional solid background rect is inserted
 * as the first child so the rasterized PNG isn't transparent.
 */
export function serializeSvg(svg: SVGSVGElement, options: { background?: string } = {}): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const { width, height } = readSvgSize(svg);

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  if (options.background) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '0');
    rect.setAttribute('y', '0');
    rect.setAttribute('width', String(width));
    rect.setAttribute('height', String(height));
    rect.setAttribute('fill', options.background);
    clone.insertBefore(rect, clone.firstChild);
  }

  return new XMLSerializer().serializeToString(clone);
}

/** Encode an SVG string as a `data:` URL safe for an `<img>` src. */
export function svgStringToDataUrl(svgString: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}

/** Build a timestamped PNG file name from a prefix. */
export function pngFileName(prefix = 'visualization'): string {
  const slug = prefix.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return `${slug || 'visualization'}.png`;
}

function parseLength(value: string | null): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* ----------------------------------------------------------- side effects -- */

/** Rasterize a serialized SVG string into a PNG data URL via an offscreen canvas. */
export function rasterizeSvgToPng(
  svgString: string,
  size: Size,
  background: string = DEFAULT_BACKGROUND,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size.width;
        canvas.height = size.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }
        if (background) {
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, size.width, size.height);
        }
        ctx.drawImage(img, 0, 0, size.width, size.height);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    img.onerror = () => reject(new Error('Failed to rasterize SVG'));
    img.src = svgStringToDataUrl(svgString);
  });
}

/** Trigger a browser download for a data URL. */
export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Full pipeline: serialize → size → rasterize → download. Returns the PNG data
 * URL. Throws if the canvas can't rasterize (callers should surface a message).
 */
export async function exportSvgElementAsPng(
  svg: SVGSVGElement,
  options: ExportPngOptions = {},
): Promise<string> {
  const background = options.background ?? DEFAULT_BACKGROUND;
  const svgString = serializeSvg(svg, { background });
  const size = computeExportSize(readSvgSize(svg), options);
  const pngUrl = await rasterizeSvgToPng(svgString, size, background);
  downloadDataUrl(pngUrl, pngFileName(options.fileName));
  return pngUrl;
}
