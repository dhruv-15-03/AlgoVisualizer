interface OgCardMeta {
  id: string;
  name: string;
  shortDescription: string;
}

export const OG_SUBDIR: string;
export const OG_TAGLINE: string;
export const OG_WORDMARK: string;

export function ogImageFileName(id: string): string;
export function ogImageUrl(origin: string, id: string): string;
export function ogImageAlt(meta: { name: string }): string;
export function titleFontSize(name: string): number;
export function cardText(
  meta: OgCardMeta,
  categoryLabel: string,
): { wordmark: string; category: string; title: string; description: string; footer: string };
export function buildCardModel(
  meta: OgCardMeta,
  categoryLabel: string,
): { type: string; props: Record<string, unknown> };
