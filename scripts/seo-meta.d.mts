interface SeoMeta {
  id: string;
  name: string;
  shortDescription: string;
}

interface BreadcrumbListItem {
  '@type': 'ListItem';
  position: number;
  name: string;
  item?: string;
}

interface BreadcrumbListLd {
  '@context': string;
  '@type': 'BreadcrumbList';
  itemListElement: BreadcrumbListItem[];
}

export const DESCRIPTION_HOOK: string;
export const SEO_TITLE_MAX: number;
export const SEO_DESCRIPTION_MAX: number;

export function seoName(name: string): string;
export function seoTitle(meta: { name: string }, maxLen?: number): string;
export function seoDescription(meta: { shortDescription: string }, maxLen?: number): string;
export function breadcrumbList(
  meta: SeoMeta,
  categoryLabel: string | undefined,
  origin: string,
): BreadcrumbListLd;
