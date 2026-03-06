"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import { TerminalIcon } from "@/components/TerminalIcon";
import { t } from "@/i18n";
import type { Locale } from "@/i18n";
import { getProjectContent, supportedLocales, withLang, getPathWithoutLocale } from "@/i18n";
import { projectData } from "@/data/projectData";
import { getSearchTerms } from "@/data/tags";
import type { TagId } from "@/data/tags";

const STORAGE_KEY = "portfolio-theme";

interface SearchProject {
	slug: string;
	shortTitle: string;
	shortDescription: string;
	tags: TagId[];
}

interface SearchCommandProps {
	projects: SearchProject[];
	lang: Locale;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialSearch?: string;
}

function setTheme(theme: "light" | "dark" | "system") {
	document.documentElement.setAttribute("data-theme", theme);
	try {
		localStorage.setItem(STORAGE_KEY, theme);
	} catch {}
}

function getCurrentTheme(): "light" | "dark" | "system" {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === "light" || stored === "dark" || stored === "system") return stored;
	} catch {}
	return "system";
}

/** Score for prioritization: exact tag > exact title word > exact desc word > partial tag > partial title > partial desc */
function scoreProject(project: SearchProject, query: string): number {
	const q = query.toLowerCase().trim();
	if (!q) return 0;

	const title = project.shortTitle.toLowerCase();
	const desc = project.shortDescription.toLowerCase();
	const titleWords = title.split(/\s+/);
	const descWords = desc.split(/\s+/);

	// Exact tag match (label or alias)
	const tagTerms = project.tags.flatMap((id) => getSearchTerms(id).map((t) => t.toLowerCase()));
	if (tagTerms.some((term) => term === q)) return 100;
	// Exact title word match
	if (titleWords.some((w) => w === q)) return 80;
	// Exact description word match
	if (descWords.some((w) => w === q)) return 60;
	// Partial tag match
	if (tagTerms.some((term) => term.includes(q))) return 40;
	// Partial title match
	if (title.includes(q)) return 30;
	// Partial description match
	if (desc.includes(q)) return 20;

	return 0;
}

function matchProject(project: SearchProject, query: string): boolean {
	return scoreProject(project, query) > 0;
}

const localeLabels: Record<Locale, string> = {
	en: "English",
	no: "Norsk",
	es: "Español",
};

function SearchCommand({
	projects,
	lang,
	open,
	onOpenChange,
	initialSearch = "",
}: SearchCommandProps) {
	const [search, setSearch] = useState(initialSearch);

	useEffect(() => {
		if (open) setSearch(initialSearch);
	}, [open, initialSearch]);

	const filtered = useMemo(() => {
		if (!search.trim()) return [];
		return projects
			.filter((p) => matchProject(p, search))
			.sort((a, b) => scoreProject(b, search) - scoreProject(a, search));
	}, [projects, search]);

	const otherLocales = useMemo(() => supportedLocales.filter((l) => l !== lang), [lang]);
	const currentTheme = getCurrentTheme();
	const otherThemes = useMemo(
		() => (["light", "dark", "system"] as const).filter((t) => t !== currentTheme),
		[currentTheme],
	);

	const handleSelectProject = useCallback(
		(slug: string) => {
			onOpenChange(false);
			window.location.href = withLang(`/projects/${slug}`, lang);
		},
		[lang, onOpenChange],
	);

	const handleSelectLang = useCallback(
		(newLang: Locale) => {
			onOpenChange(false);
			const path = getPathWithoutLocale(new URL(window.location.href));
			window.location.href = withLang(path || "/", newLang);
		},
		[onOpenChange],
	);

	const handleSelectTheme = useCallback(
		(theme: "light" | "dark" | "system") => {
			setTheme(theme);
			onOpenChange(false);
		},
		[onOpenChange],
	);

	return (
		<CommandDialog
			open={open}
			onOpenChange={onOpenChange}
			title={t("searchPlaceholder", lang)}
			description={t("searchPlaceholder", lang)}
			shouldFilter={false}
		>
			<CommandInput
				placeholder={t("searchPlaceholder", lang)}
				value={search}
				onValueChange={setSearch}
			/>
			<CommandList>
				<CommandEmpty>{t("noResults", lang)}</CommandEmpty>
				{/* When there are project matches, show projects first; otherwise settings first */}
				{filtered.length > 0 ? (
					<>
						<CommandGroup heading={t("projects", lang)}>
							{filtered.map((project) => (
								<CommandItem
									key={project.slug}
									value={project.slug}
									onSelect={() => handleSelectProject(project.slug)}
								>
									<span className="font-medium">{project.shortTitle}</span>
									<span className="text-muted-foreground truncate ml-2">
										{project.shortDescription}
									</span>
								</CommandItem>
							))}
						</CommandGroup>
						<CommandSeparator />
						<CommandGroup heading={t("language", lang)}>
							{otherLocales.map((l) => (
								<CommandItem key={l} onSelect={() => handleSelectLang(l)}>
									{localeLabels[l]}
								</CommandItem>
							))}
						</CommandGroup>
						<CommandGroup heading={t("theme", lang)}>
							{otherThemes.map((theme) => (
								<CommandItem
									key={theme}
									onSelect={() => handleSelectTheme(theme)}
								>
									{theme === "light"
										? t("themeLight", lang)
										: theme === "dark"
											? t("themeDark", lang)
											: t("themeSystem", lang)}
								</CommandItem>
							))}
						</CommandGroup>
					</>
				) : (
					<>
						<CommandGroup heading={t("language", lang)}>
							{otherLocales.map((l) => (
								<CommandItem key={l} onSelect={() => handleSelectLang(l)}>
									{localeLabels[l]}
								</CommandItem>
							))}
						</CommandGroup>
						<CommandGroup heading={t("theme", lang)}>
							{otherThemes.map((theme) => (
								<CommandItem
									key={theme}
									onSelect={() => handleSelectTheme(theme)}
								>
									{theme === "light"
										? t("themeLight", lang)
										: theme === "dark"
											? t("themeDark", lang)
											: t("themeSystem", lang)}
								</CommandItem>
							))}
						</CommandGroup>
					</>
				)}
			</CommandList>
		</CommandDialog>
	);
}

function buildSearchProjects(lang: Locale): SearchProject[] {
	return projectData.map((p) => {
		const c = getProjectContent(p.slug, lang);
		return {
			slug: p.slug,
			shortTitle: c?.shortTitle ?? p.slug,
			shortDescription: c?.shortDescription ?? "",
			tags: p.tags,
		};
	});
}

export function GlobalSearch({ lang }: { lang: Locale }) {
	const [open, setOpen] = useState(false);
	const [initialSearch, setInitialSearch] = useState("");

	const projects = useMemo(() => buildSearchProjects(lang), [lang]);

	useEffect(() => {
		const handler = (e: CustomEvent<{ search?: string }>) => {
			setOpen(true);
			setInitialSearch(e.detail?.search ?? "");
		};
		window.addEventListener("open-search", handler as EventListener);
		return () => window.removeEventListener("open-search", handler as EventListener);
	}, []);

	return (
		<SearchCommand
			projects={projects}
			lang={lang}
			open={open}
			onOpenChange={setOpen}
			initialSearch={initialSearch}
		/>
	);
}

export function SearchCommandTrigger({ lang }: { lang: Locale }) {
	return (
		<button
			type="button"
			onClick={() => window.dispatchEvent(new CustomEvent("open-search", { detail: {} }))}
			className="inline-flex items-center justify-center gap-1.5 p-2 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:shadow-[var(--shadow-hover)] transition-shadow"
			aria-label={t("searchPlaceholder", lang)}
		>
			<TerminalIcon className="size-4" />
			<span className="text-muted-foreground">{t("search", lang)}</span>
		</button>
	);
}
