"use client";

import { useState } from "react";
import { t } from "@/i18n";
import type { Locale } from "@/i18n";
import type { TagId } from "@/data/tags";
import { getTagLabel, getTagAliases } from "@/data/tags";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";

interface TagListProps {
	tags: TagId[];
	lang: Locale;
	maxVisible?: number;
}

function openSearchWithTag(label: string, e: React.MouseEvent) {
	e.preventDefault();
	e.stopPropagation();
	window.dispatchEvent(
		new CustomEvent("open-search", { detail: { search: label } }),
	);
}

function TagButton({
	tagId,
	lang,
}: {
	tagId: TagId;
	lang: Locale;
}) {
	const label = getTagLabel(tagId);
	const aliases = getTagAliases(tagId);
	const hasAliases = aliases.length > 0;

	const button = (
		<button
			type="button"
			onClick={(e) => openSearchWithTag(label, e)}
			className="tag"
		>
			<span className="tag-hash">#</span>
			<span className="tag-label">{label}</span>
		</button>
	);

	if (hasAliases) {
		const aliasesText = t("tagsSearchableAs", lang).replace(
			"{aliases}",
			aliases.join(", "),
		);
		return (
			<HoverCard openDelay={200} closeDelay={100}>
				<HoverCardTrigger asChild>{button}</HoverCardTrigger>
				<HoverCardContent
					align="start"
					side="top"
					className="w-auto max-w-xs p-2 text-sm text-muted-foreground"
				>
					{aliasesText}
				</HoverCardContent>
			</HoverCard>
		);
	}

	return button;
}

export function TagList({ tags, lang, maxVisible = 3 }: TagListProps) {
	const [expanded, setExpanded] = useState(false);

	if (tags.length === 0) return null;

	const visibleTags = expanded ? tags : tags.slice(0, maxVisible);
	const hiddenCount = tags.length - maxVisible;
	const showMoreButton = !expanded && hiddenCount > 0;

	return (
		<div className="tag-list-wrapper" data-expanded={expanded}>
			<ul className="tag-list">
				{visibleTags.map((tagId, i) => (
					<li key={`${tagId}-${i}`}>
						<TagButton tagId={tagId} lang={lang} />
					</li>
				))}
			</ul>
			{showMoreButton && (
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						setExpanded(true);
					}}
					className="tag tag-more"
				>
					{t("tagsMore", lang).replace("{count}", String(hiddenCount))}
				</button>
			)}
		</div>
	);
}
