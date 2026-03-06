"use client";

import { useState } from "react";
import { t } from "@/i18n";
import type { Locale } from "@/i18n";

interface TagListProps {
	tags: string[];
	lang: Locale;
	maxVisible?: number;
}

function openSearchWithTag(tag: string, e: React.MouseEvent) {
	e.preventDefault();
	e.stopPropagation();
	window.dispatchEvent(
		new CustomEvent("open-search", { detail: { search: tag } }),
	);
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
				{visibleTags.map((tag) => (
					<li key={tag}>
						<button
							type="button"
							onClick={(e) => openSearchWithTag(tag, e)}
							className="tag"
						>
							#{tag}
						</button>
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
