"use client";

import * as React from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { t } from "@/i18n";
import type { Locale } from "@/i18n";

interface ExternalLinkProps {
	liveHref?: string;
	archivedHref?: string;
	label: string;
	lang?: Locale;
}

const linkClass =
	"text-primary underline underline-offset-2 hover:opacity-80";

export function ExternalLink({
	liveHref,
	archivedHref,
	label,
	lang = "en",
}: ExternalLinkProps) {
	const openLive = t("openLive", lang);
	const openArchived = t("openArchived", lang);
	const archivedLabel = t("archived", lang);

	if (liveHref && !archivedHref) {
		return (
			<a href={liveHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
				{label}
			</a>
		);
	}
	if (archivedHref && !liveHref) {
		return (
			<a href={archivedHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
				{label} {archivedLabel}
			</a>
		);
	}
	if (liveHref && archivedHref) {
		return (
			<span className="inline">
				{/* Desktop: popover */}
				<span className="hidden md:inline">
					<Popover>
						<PopoverTrigger asChild>
							<button type="button" className={`${linkClass} cursor-pointer bg-transparent border-none p-0 font-inherit`}>
								{label}
							</button>
						</PopoverTrigger>
						<PopoverContent align="start" className="w-auto p-2">
							<div className="flex flex-col gap-1">
								<a
									href={liveHref}
									target="_blank"
									rel="noopener noreferrer"
									className={linkClass}
								>
									{openLive}
								</a>
								<a
									href={archivedHref}
									target="_blank"
									rel="noopener noreferrer"
									className={linkClass}
								>
									{openArchived}
								</a>
							</div>
						</PopoverContent>
					</Popover>
				</span>
				{/* Mobile: inline links */}
				<span className="md:hidden">
					<a href={liveHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
						{label}
					</a>
					{" "}
					<a href={archivedHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
						{archivedLabel}
					</a>
				</span>
			</span>
		);
	}
	return <span>{label}</span>;
}
