// Kept out of lib.ts so the page loader can use it without pulling in d3.

/** Below this figure width, figures use their phone layout. */
export const NARROW_PX = 560;

/**
 * True when the figure body is too narrow for a desktop layout. Read it at the start
 * of mount() and lay the figure out for that width: stack side-by-side panels, size
 * the SVG viewBox to el.clientWidth so text renders at its real size, use fewer ticks.
 * The loader mounts the figure again if the width crosses NARROW_PX.
 */
export function isNarrow(el: HTMLElement): boolean {
	return el.clientWidth > 0 && el.clientWidth < NARROW_PX;
}
