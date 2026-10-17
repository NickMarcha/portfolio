import * as d3 from 'd3';
import penguinsRaw from './data/penguins.json';
import {
	SERIES,
	button,
	controls,
	dataTable,
	fmt,
	gridY,
	readout,
	reducedMotion,
	select,
	styleAxis,
	svg,
	toggle,
	tooltip,
	v,
	type Figure,
} from './lib';

type Raw = { species: string; island: string; bill_length_mm: number | null; bill_depth_mm: number | null; flipper_length_mm: number | null; body_mass_g: number | null; sex: string | null; year: number };
type Key = 'bill_length_mm' | 'bill_depth_mm' | 'flipper_length_mm' | 'body_mass_g';
type P = Raw & { id: number } & Record<Key, number>;

const ATTRS: { value: Key; label: string }[] = [
	{ value: 'flipper_length_mm', label: 'Flipper length (mm)' },
	{ value: 'body_mass_g', label: 'Body mass (g)' },
	{ value: 'bill_length_mm', label: 'Bill length (mm)' },
	{ value: 'bill_depth_mm', label: 'Bill depth (mm)' },
];
const label = (k: Key) => ATTRS.find((a) => a.value === k)!.label;
const SPECIES = ['Adelie', 'Chinstrap', 'Gentoo'];
const SHAPES = [d3.symbolCircle, d3.symbolSquare, d3.symbolTriangle];
const ISLANDS = ['Biscoe', 'Dream', 'Torgersen'];

const DATA: P[] = (penguinsRaw as Raw[])
	.filter((d) => d.bill_length_mm != null && d.bill_depth_mm != null && d.flipper_length_mm != null && d.body_mass_g != null)
	.map((d, id) => ({ ...d, id }) as P);

const figure: Figure = {
	title: 'Overview, zoom and filter, details on demand',
	caption:
		'All 342 measured penguins first, then filtered by species or island, then one bird’s details. With “Keep axes fixed” off, the axes jump to fit whatever is left, and the same point lands somewhere else each time.',
	credit: 'Data: Palmer Penguins, Gorman, Williams and Fraser 2014, via Horst, Hill and Gorman 2020 (CC0). Mantra: Shneiderman 1996.',
	mount(el) {
		const state = {
			x: 'flipper_length_mm' as Key,
			y: 'body_mass_g' as Key,
			species: new Set(SPECIES),
			island: 'all',
			pinned: true,
			picked: null as P | null,
		};

		const row1 = controls(el);
		select(row1, 'Horizontal', ATTRS, (val) => ((state.x = val), draw()), state.x);
		select(row1, 'Vertical', ATTRS, (val) => ((state.y = val), draw()), state.y);
		select(
			row1,
			'Island',
			[{ value: 'all', label: 'All islands' }, ...ISLANDS.map((i) => ({ value: i, label: i }))],
			(val) => ((state.island = val), draw()),
			'all',
		);
		// Outside the species group, so that group's label stays true.
		toggle(row1, 'Keep axes fixed', (on) => ((state.pinned = on), draw()), true);
		const row2 = controls(el);
		row2.setAttribute('role', 'group');
		row2.setAttribute('aria-label', 'Species to show');
		row2.append('Show');
		for (const s of SPECIES) {
			toggle(
				row2,
				s,
				(on) => {
					if (on) state.species.add(s);
					else state.species.delete(s);
					draw();
				},
				true,
			);
		}

		const W = 600;
		const H = 400;
		const m = { top: 36, right: 16, bottom: 48, left: 60 };
		const iw = W - m.left - m.right;
		const ih = H - m.top - m.bottom;
		const root = svg(el, W, H, 'Scatterplot of penguins, colored and shaped by species.');
		const g = root.append('g').attr('transform', `translate(${m.left},${m.top})`);
		const grid = g.append('g');
		const xAxis = g.append('g').attr('transform', `translate(0,${ih})`);
		const yAxis = g.append('g');
		const xTitle = g.append('text').attr('x', iw).attr('y', ih + 40).attr('text-anchor', 'end').style('fill', v('muted')).style('font-size', '13px');
		const yTitle = g.append('text').attr('x', -56).attr('y', -14).style('fill', v('muted')).style('font-size', '13px');
		const dots = g.append('g');
		const ring = g.append('circle').attr('r', 11).style('fill', 'none').style('stroke', v('highlight')).style('stroke-width', 2.5).style('display', 'none');

		// Legend: shape and color together, so species never rests on hue alone.
		const legend = root.append('g').attr('transform', `translate(${W - m.right - 290},14)`);
		SPECIES.forEach((s, i) => {
			const lg = legend.append('g').attr('transform', `translate(${i * 100},0)`);
			lg.append('path').attr('d', d3.symbol(SHAPES[i], 80)()).attr('transform', 'translate(6,0)').style('fill', SERIES[i]);
			lg.append('text').attr('x', 16).attr('y', 5).style('fill', v('ink')).style('font-size', '13px').text(s);
		});

		const tip = tooltip(el);
		const nav = controls(el);
		const prev = button(nav, '← Previous penguin', () => step(-1));
		const next = button(nav, 'Next penguin →', () => step(1));
		button(nav, 'Clear', () => pick(null));
		const out = readout(el);

		const pad = (k: Key, rows: P[]) => {
			const [a, b] = d3.extent(rows, (d) => d[k]) as [number, number];
			const p = (b - a) * 0.05 || 1;
			return [a - p, b + p];
		};

		let visible: P[] = [];
		let xs = d3.scaleLinear();
		let ys = d3.scaleLinear();
		const details = (d: P) =>
			`${d.species} from ${d.island}, ${d.sex ?? 'sex unknown'}, measured ${d.year}. Flipper ${d.flipper_length_mm} mm, body mass ${fmt.int(d.body_mass_g)} g, bill ${d.bill_length_mm} by ${d.bill_depth_mm} mm.`;

		// Stepping goes left to right, so the buttons and the readout agree on the order.
		const ordered = () => [...visible].sort((a, b) => a[state.x] - b[state.x] || a[state.y] - b[state.y]);

		function pick(d: P | null) {
			state.picked = d;
			if (d && visible.includes(d)) {
				ring.style('display', null).attr('cx', xs(d[state.x])).attr('cy', ys(d[state.y]));
				out.textContent = `Penguin ${ordered().indexOf(d) + 1} of ${visible.length}, counting from the left: ${details(d)}`;
			} else {
				state.picked = null;
				ring.style('display', 'none');
				out.textContent = visible.length
					? `Showing ${visible.length} of ${DATA.length} penguins. Hover a point, click it, or step through them with the buttons for details.`
					: 'No penguins match this filter. Turn on another species or pick another island.';
			}
		}
		function step(dir: number) {
			if (!visible.length) return;
			const order = ordered();
			const i = state.picked ? order.indexOf(state.picked) : -1;
			pick(order[(i + dir + order.length) % order.length]);
		}

		function draw() {
			visible = DATA.filter((d) => state.species.has(d.species) && (state.island === 'all' || d.island === state.island));
			const basis = state.pinned || visible.length < 2 ? DATA : visible;
			xs = d3.scaleLinear().domain(pad(state.x, basis)).range([0, iw]).nice();
			ys = d3.scaleLinear().domain(pad(state.y, basis)).range([ih, 0]).nice();
			const ms = reducedMotion() ? 0 : 400;
			gridY(grid, ys, iw);
			styleAxis(xAxis.call(d3.axisBottom(xs).ticks(6)));
			styleAxis(yAxis.call(d3.axisLeft(ys).ticks(6)));
			xTitle.text(label(state.x));
			yTitle.text(label(state.y));

			dots
				.selectAll<SVGPathElement, P>('path')
				.data(visible, (d) => d.id)
				.join(
					(enter) => enter.append('path').attr('transform', (d) => `translate(${xs(d[state.x])},${ys(d[state.y])})`),
					(update) => update,
					(exit) => exit.remove(),
				)
				.attr('d', (d) => d3.symbol(SHAPES[SPECIES.indexOf(d.species)], 64)())
				.style('fill', (d) => SERIES[SPECIES.indexOf(d.species)])
				.style('fill-opacity', 0.8)
				.style('stroke', v('surface'))
				.style('stroke-width', 0.75)
				.style('cursor', 'pointer')
				.on('pointerenter', (event, d) => tip.show(details(d), event))
				.on('pointerleave', () => tip.hide())
				.on('click', (_, d) => pick(d))
				.transition()
				.duration(ms)
				.attr('transform', (d) => `translate(${xs(d[state.x])},${ys(d[state.y])})`);

			prev.disabled = next.disabled = visible.length === 0;
			pick(state.picked);

			dataTable(
				el,
				[
					{ label: 'Species', value: (d: { s: string; n: number; mx: number; my: number }) => d.s },
					{ label: 'Shown', value: (d) => d.n, numeric: true },
					{ label: `Mean ${label(state.x).toLowerCase()}`, value: (d) => (d.n ? d.mx.toFixed(1) : '–'), numeric: true },
					{ label: `Mean ${label(state.y).toLowerCase()}`, value: (d) => (d.n ? d.my.toFixed(1) : '–'), numeric: true },
				],
				SPECIES.map((s) => {
					const rows = visible.filter((d) => d.species === s);
					return { s, n: rows.length, mx: d3.mean(rows, (d) => d[state.x]) ?? 0, my: d3.mean(rows, (d) => d[state.y]) ?? 0 };
				}),
				'Show the data (per species, for the current filter)',
			);
		}
		draw();
	},
};

export default figure;
