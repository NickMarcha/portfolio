import { projectData } from "../data/projectData";
import { getTagLabel } from "../data/tags";

export type TextCase = "upper" | "lower" | "original";

/** Deterministic shuffle (Fisher-Yates) seeded by index for compile-time stability. */
function shuffleWords(words: string[], seed: number): string[] {
	const result = [...words];
	for (let i = result.length - 1; i > 0; i--) {
		const t = Math.sin(seed * (i + 1) * 12.9898) * 43758.5453;
		const frac = t - Math.floor(t);
		const j = Math.floor(frac * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

export function buildWatermarkLines(text: string, textCase: TextCase): string[] {
	const rawWords = text.split(/\s+/).filter(Boolean);
	const words = Array.from(new Set(rawWords));
	if (words.length === 0) return [];
	const transform =
		textCase === "upper"
			? (s: string) => s.toUpperCase()
			: textCase === "lower"
				? (s: string) => s.toLowerCase()
				: (s: string) => s;
	return Array.from({ length: 50 }, (_, i) => {
		const shuffled = shuffleWords(words, i + 1);
		const line = shuffled.join(" ");
		return (transform(line) + " ").repeat(5);
	});
}

export function getLineAnimationDuration(
	index: number,
	min: number,
	max: number,
): number {
	const t = Math.sin(index * 12.9898) * 43758.5453;
	const frac = t - Math.floor(t);
	return min + frac * (max - min);
}

export function getAllTagLabels(): string {
	const tagIds = new Set<number>();
	for (const project of projectData) {
		for (const id of project.tags) {
			tagIds.add(id);
		}
	}
	const labels = [...tagIds]
		.map((id) => getTagLabel(id))
		.filter(Boolean)
		.sort();
	return labels.join(" ");
}
