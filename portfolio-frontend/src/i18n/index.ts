import uiEn from './ui/en.json';
import uiNo from './ui/no.json';
import uiEs from './ui/es.json';
import projectsEn from './projects/en.json';
import projectsNo from './projects/no.json';
import projectsEs from './projects/es.json';

export type Locale = 'en' | 'no' | 'es';

export const supportedLocales: Locale[] = ['en', 'no', 'es'];
export const defaultLocale: Locale = 'en';

const ui: Record<Locale, Record<string, string>> = {
	en: uiEn as Record<string, string>,
	no: uiNo as Record<string, string>,
	es: uiEs as Record<string, string>,
};

const projects: Record<Locale, Record<string, ProjectContent>> = {
	en: projectsEn as Record<string, ProjectContent>,
	no: projectsNo as Record<string, ProjectContent>,
	es: projectsEs as Record<string, ProjectContent>,
};

export interface ProjectContent {
	shortTitle: string;
	shortDescription: string;
	longTitle: string;
	carouselCaptions?: Record<string, string>;
	body?: string;
}

export function t(key: string, lang: Locale): string {
	return ui[lang]?.[key] ?? ui[defaultLocale]?.[key] ?? key;
}

export function getProjectContent(slug: string, lang: Locale): ProjectContent | undefined {
	const content = projects[lang]?.[slug];
	const defaultContent = projects[defaultLocale]?.[slug];
	if (content) {
		// Fall back to default locale's body when current locale doesn't have it
		if (!content.body && defaultContent?.body) {
			return { ...content, body: defaultContent.body };
		}
		return content;
	}
	return defaultContent;
}

export function getLangFromUrl(url: URL): Locale {
	const segments = url.pathname.split('/').filter(Boolean);
	const first = segments[0];
	if (first && supportedLocales.includes(first as Locale)) return first as Locale;
	return defaultLocale;
}

/** Path without locale prefix (e.g. /no/projects/bio -> /projects/bio) */
export function getPathWithoutLocale(url: URL): string {
	const path = url.pathname.replace(/^\/(no|es)\//, '/').replace(/^\/(no|es)$/, '/') || '/';
	return path;
}

/** Build path for a locale. For default (en), no prefix. For no/es, prefix with /no or /es */
export function useTranslatedPath(lang: Locale) {
	return function translatePath(path: string, targetLang: Locale = lang): string {
		const clean = path === '/' ? '' : path.replace(/^\//, '');
		if (targetLang === defaultLocale) return clean ? `/${clean}` : '/';
		return `/${targetLang}${clean ? `/${clean}` : ''}`;
	};
}

/** Path for a given locale (replaces old query-param withLang) */
export function withLang(path: string, lang: Locale): string {
	return useTranslatedPath(defaultLocale)(path, lang);
}
