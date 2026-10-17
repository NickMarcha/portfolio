// Shared helpers for the "Seeing data" figures.
//
// Rules the figures follow, taken from the article itself (sections 5, 6, 15, 18):
// - Categorical color: the slots below, in order, never cycled. They pass the
//   dataviz validator against the site surfaces (#ffffff light, #1e1e1e dark).
//   In light mode slots 3-5 are under 3:1 contrast, so charts using them need
//   direct labels or the data table.
// - Never hue alone: pair color with labels, shape or position.
// - Sequential magnitude: viridis (one-way luminance). Diverging: blue <-> grey <-> red,
//   blue meaning low/cold. Rainbow only where a figure is about the rainbow's failure.
// - Bars start at zero. Direct labels over legends. Light gridlines.
// - Every figure gets a caption, an aria label, and a data table where there is data.
// - Every control is a native, labelled element, so it works with a keyboard.
// - Animation respects prefers-reduced-motion. Nothing flashes.
//
// Colors are CSS custom properties (defined in seeing-data.css), so SVG styled with
// v('...') follows the theme toggle without re-rendering. Canvas code reads real
// values with token() and re-draws through onThemeChange().

import * as d3 from 'd3';

export { isNarrow, NARROW_PX } from './narrow';

export interface Figure {
	title: string;
	/** One or two sentences stating the point of the figure. */
	caption: string;
	credit?: string;
	mount(el: HTMLElement): void | (() => void);
}

/** CSS var reference, for .style('fill', v('series-1')). */
export const v = (name: string) => `var(--viz-${name})`;

export const SERIES = Array.from({ length: 8 }, (_, i) => v(`series-${i + 1}`));

/** Resolved color value of a token, for canvas and color interpolation. */
export function token(name: string): string {
	return getComputedStyle(document.documentElement).getPropertyValue(`--viz-${name}`).trim();
}

export function isDark(): boolean {
	const t = document.documentElement.getAttribute('data-theme');
	if (t === 'dark') return true;
	if (t === 'light') return false;
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Calls cb when the site theme changes. Returns an unsubscribe function. */
export function onThemeChange(cb: () => void): () => void {
	const mo = new MutationObserver(cb);
	mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
	const mq = window.matchMedia('(prefers-color-scheme: dark)');
	mq.addEventListener('change', cb);
	return () => {
		mo.disconnect();
		mq.removeEventListener('change', cb);
	};
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const viridis = d3.interpolateViridis;

/** Diverging interpolator over t in [0, 1]: blue, neutral grey at 0.5, red. */
export function diverging(): (t: number) => string {
	return d3.piecewise(d3.interpolateLab, [token('div-low'), token('div-mid'), token('div-high')]);
}

export const fmt = {
	int: d3.format(',d'),
	num: d3.format(',.2f'),
	pct: d3.format('.0%'),
};

/** Responsive SVG with a viewBox. label is the text alternative for screen readers. */
export function svg(parent: HTMLElement, width: number, height: number, label: string) {
	// Wide charts get a scroll wrapper so they can keep a readable minimum width on phones.
	const host = width >= 560 ? d3.select(parent).append('div').attr('class', 'viz-scroll') : d3.select(parent);
	return host
		.append('svg')
		.attr('viewBox', `0 0 ${width} ${height}`)
		.attr('width', '100%')
		.attr('role', 'img')
		.attr('aria-label', label)
		// Wide charts keep a minimum width on phones (see .viz-wide in the CSS).
		.classed('viz-wide', width >= 560)
		.style('max-width', `${width}px`)
		.style('height', 'auto')
		.style('display', 'block');
}

/** Styles a d3 axis group: muted ticks, hairline domain. */
export function styleAxis<T extends d3.BaseType>(g: d3.Selection<T, unknown, null, undefined>) {
	g.selectAll('.domain').style('stroke', v('axis'));
	g.selectAll('.tick line').style('stroke', v('axis'));
	g.selectAll('.tick text').style('fill', v('muted')).style('font-size', '12px');
	return g;
}

/** Horizontal gridlines across width, for a y scale. */
export function gridY<T extends d3.BaseType>(
	g: d3.Selection<T, unknown, null, undefined>,
	y: d3.ScaleLinear<number, number>,
	width: number,
	ticks = 5,
) {
	g.selectAll('line')
		.data(y.ticks(ticks))
		.join('line')
		.attr('x1', 0)
		.attr('x2', width)
		.attr('y1', (d) => y(d))
		.attr('y2', (d) => y(d))
		.style('stroke', v('grid'));
}

/** A row for controls, placed above the chart. */
export function controls(parent: HTMLElement): HTMLDivElement {
	const row = document.createElement('div');
	row.className = 'viz-controls';
	parent.append(row);
	return row;
}

let uid = 0;
const nextId = () => `viz-ctl-${++uid}`;

export function button(row: HTMLElement, label: string, onClick: (b: HTMLButtonElement) => void) {
	const b = document.createElement('button');
	b.type = 'button';
	b.textContent = label;
	b.addEventListener('click', () => onClick(b));
	row.append(b);
	return b;
}

/** A toggle button that reports its state with aria-pressed. */
export function toggle(row: HTMLElement, label: string, onChange: (on: boolean) => void, initial = false) {
	const b = button(row, label, () => {
		const on = b.getAttribute('aria-pressed') !== 'true';
		b.setAttribute('aria-pressed', String(on));
		onChange(on);
	});
	b.setAttribute('aria-pressed', String(initial));
	return b;
}

export function slider(
	row: HTMLElement,
	label: string,
	opts: { min: number; max: number; step?: number; value: number; format?: (n: number) => string },
	onInput: (n: number) => void,
) {
	const id = nextId();
	const wrap = document.createElement('label');
	wrap.htmlFor = id;
	const text = document.createElement('span');
	const out = document.createElement('output');
	const input = document.createElement('input');
	input.type = 'range';
	input.id = id;
	input.min = String(opts.min);
	input.max = String(opts.max);
	input.step = String(opts.step ?? 1);
	input.value = String(opts.value);
	const show = (n: number) => {
		const s = opts.format ? opts.format(n) : String(n);
		out.textContent = s;
		input.setAttribute('aria-valuetext', s);
	};
	text.textContent = label + ' ';
	show(opts.value);
	input.addEventListener('input', () => {
		const n = Number(input.value);
		show(n);
		onInput(n);
	});
	wrap.append(text, input, out);
	row.append(wrap);
	return input;
}

export function select<T extends string>(
	row: HTMLElement,
	label: string,
	options: { value: T; label: string }[],
	onChange: (value: T) => void,
	initial?: T,
) {
	const id = nextId();
	const wrap = document.createElement('label');
	wrap.htmlFor = id;
	wrap.append(label + ' ');
	const s = document.createElement('select');
	s.id = id;
	for (const o of options) s.add(new Option(o.label, o.value, false, o.value === initial));
	s.addEventListener('change', () => onChange(s.value as T));
	wrap.append(s);
	row.append(wrap);
	return s;
}

/**
 * A collapsible table of the figure's data, for screen readers and anyone who
 * wants the numbers. Call again with new rows to update it.
 */
export function dataTable<R>(
	parent: HTMLElement,
	columns: { label: string; value: (r: R) => string | number; numeric?: boolean }[],
	rows: R[],
	summary = 'Show the data',
) {
	let details = parent.querySelector<HTMLDetailsElement>(':scope > details.viz-table');
	if (!details) {
		details = document.createElement('details');
		details.className = 'viz-table';
		const s = document.createElement('summary');
		s.textContent = summary;
		details.append(s);
		parent.append(details);
	}
	details.querySelector('table')?.remove();
	const table = document.createElement('table');
	const head = table.createTHead().insertRow();
	for (const c of columns) {
		const th = document.createElement('th');
		th.scope = 'col';
		th.textContent = c.label;
		if (c.numeric) th.className = 'num';
		head.append(th);
	}
	const body = table.createTBody();
	for (const r of rows) {
		const tr = body.insertRow();
		for (const c of columns) {
			const td = tr.insertCell();
			const val = c.value(r);
			td.textContent = typeof val === 'number' ? fmt.num(val).replace(/\.00$/, '') : val;
			if (c.numeric) td.className = 'num';
		}
	}
	details.append(table);
	return details;
}

/** A tooltip positioned inside parent (which gets position: relative). */
export function tooltip(parent: HTMLElement) {
	parent.style.position = 'relative';
	const tip = document.createElement('div');
	tip.className = 'viz-tooltip';
	tip.setAttribute('role', 'status');
	tip.hidden = true;
	parent.append(tip);
	return {
		show(html: string, event: { clientX: number; clientY: number }) {
			tip.innerHTML = html;
			tip.hidden = false;
			const box = parent.getBoundingClientRect();
			const x = event.clientX - box.left;
			const y = event.clientY - box.top;
			const flip = x > box.width - 180;
			tip.style.left = `${flip ? x - tip.offsetWidth - 12 : x + 12}px`;
			tip.style.top = `${Math.max(0, y - tip.offsetHeight - 8)}px`;
		},
		hide() {
			tip.hidden = true;
		},
	};
}

/** Short note under a figure's chart, e.g. a live readout. aria-live so changes are announced. */
export function readout(parent: HTMLElement) {
	const p = document.createElement('p');
	p.className = 'viz-readout';
	p.setAttribute('aria-live', 'polite');
	parent.append(p);
	return p;
}

/** Seeded random numbers, so "random" figures look the same on every load (Kindlmann's invariance). */
export function rng(seed = 42) {
	return d3.randomLcg(seed);
}
