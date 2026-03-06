"use client";

import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import { t } from "@/i18n";
import type { Locale } from "@/i18n";
import { supportedLocales } from "@/i18n";

interface SearchProject {
	slug: string;
	shortTitle: string;
	shortDescription: string;
	searchKeywords: string[];
}

interface SearchCommandProps {
	projects: SearchProject[];
	lang: Locale;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function SearchCommandButton({
	projects,
	lang,
}: {
	projects: SearchProject[];
	lang: Locale;
}) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="inline-flex items-center justify-center p-2 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:shadow-[var(--shadow-hover)] transition-shadow"
				aria-label={t("searchPlaceholder", lang)}
			>
				<SearchIcon className="size-4" />
			</button>
			<SearchCommand
				projects={projects}
				lang={lang}
				open={open}
				onOpenChange={setOpen}
			/>
		</>
	);
}

const STORAGE_KEY = "portfolio-theme";

function setTheme(theme: "light" | "dark" | "system") {
	document.documentElement.setAttribute("data-theme", theme);
	try {
		localStorage.setItem(STORAGE_KEY, theme);
	} catch {}
}

function matchProject(project: SearchProject, query: string): boolean {
	const q = query.toLowerCase().trim();
	if (!q) return true;
	const title = project.shortTitle.toLowerCase();
	const desc = project.shortDescription.toLowerCase();
	const keywords = project.searchKeywords.join(" ").toLowerCase();
	return title.includes(q) || desc.includes(q) || keywords.includes(q);
}

function SearchCommand({
	projects,
	lang,
	open = false,
	onOpenChange = () => {},
}: SearchCommandProps) {
	const [search, setSearch] = useState("");

	const filtered = useMemo(
		() => projects.filter((p) => matchProject(p, search)),
		[projects, search],
	);

	const handleSelectProject = useCallback(
		(slug: string) => {
			onOpenChange(false);
			window.location.href = `/projects/${slug}?lan=${lang}`;
		},
		[lang, onOpenChange],
	);

	const handleSelectLang = useCallback(
		(newLang: Locale) => {
			onOpenChange(false);
			const path = window.location.pathname;
			window.location.href = `${path}?lan=${newLang}`;
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
		>
			<CommandInput
				placeholder={t("searchPlaceholder", lang)}
				value={search}
				onValueChange={setSearch}
			/>
			<CommandList>
				<CommandEmpty>{t("noResults", lang)}</CommandEmpty>
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
				<CommandGroup heading={t("settings", lang)}>
					<CommandItem>
						<span>{t("language", lang)}</span>
					</CommandItem>
					{supportedLocales.map((l) => (
						<CommandItem
							key={l}
							onSelect={() => handleSelectLang(l)}
							className={lang === l ? "bg-accent" : ""}
						>
							{l === "en" ? "English" : l === "no" ? "Norsk" : "Español"}
						</CommandItem>
					))}
					<CommandItem>
						<span>{t("theme", lang)}</span>
					</CommandItem>
					<CommandItem onSelect={() => handleSelectTheme("light")}>
						{t("themeLight", lang)}
					</CommandItem>
					<CommandItem onSelect={() => handleSelectTheme("dark")}>
						{t("themeDark", lang)}
					</CommandItem>
					<CommandItem onSelect={() => handleSelectTheme("system")}>
						{t("themeSystem", lang)}
					</CommandItem>
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	);
}
