import * as d3 from 'd3';
import penguinsRaw from './data/penguins.json';
import { SERIES, button, controls, dataTable, fmt, readout, slider, styleAxis, svg, v, type Figure } from './lib';

type Key = 'bill_length_mm' | 'bill_depth_mm' | 'flipper_length_mm' | 'body_mass_g';
type Raw = { species: string; island: string } & Record<Key, number | null>;
type P = Raw & { id: number } & Record<Key, number>;

const SPECIES = ['Adelie', 'Chinstrap', 'Gentoo'];
const SHAPES = [d3.symbolCircle, d3.symbolSquare, d3.symbolTriangle];
const LABEL: Record<Key, string> = {
	bill_length_mm: 'Bill length (mm)',
	bill_depth_mm: 'Bill depth (mm)',
	flipper_length_mm: 'Flipper length (mm)',
	body_mass_g: 'Body mass (g)',
};
const VIEWS: [Key, Key][] = [
	['bill_length_mm', 'bill_depth_mm'],
	['flipper_length_mm', 'body_mass_g'],
	['bill_length_mm', 'flipper_length_mm'],
];

const DATA: P[] = (penguinsRaw as Raw[])
	.filter((d) => d.bill_length_mm != null && d.bill_depth_mm != null && d.flipper_length_mm != null && d.body_mass_g != null)
	.map((d, id) => ({ ...d, id }) as P);

const figure: Figure = {
	title: 'Brushing and linking',
	caption:
		'Three views of the same 342 penguins, each showing two measurements. A selection in one view lights up the same birds in the other two, and a group that overlaps in one view can stand apart in another.',
	credit: 'Data: Palmer Penguins, Gorman, Williams and Fraser 2014, via Horst, Hill and Gorman 2020 (CC0).',
	mount(el) {
		let selected: Set<number> | null = null;

		const row = controls(el);
		row.setAttribute('role', 'group');
		row.setAttribute('aria-label', 'Select penguins');
		row.append('Select');
		for (const s of SPECIES) button(row, s, () => setSelection(DATA.filter((d) => d.species === s), `all ${s}`));
		button(row, 'Clear', () => setSelection(null, ''));
		const row2 = controls(el);
		const massSlider = slider(
			row2,
			'Or select body mass of at least',
			{ min: 2700, max: 6300, step: 100, value: 2700, format: (n) => `${fmt.int(n)} g` },
			(n) => setSelection(n > 2700 ? DATA.filter((d) => d.body_mass_g >= n) : null, `body mass of at least ${fmt.int(n)} g`),
		);

		const wrap = document.createElement('div');
		wrap.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px 4px; justify-content: center;';
		el.append(wrap);
		const out = readout(el);

		const S = 232;
		const m = { top: 24, right: 10, bottom: 38, left: 44 };
		const iw = S - m.left - m.right;
		const ih = S - m.top - m.bottom;
		let quiet = false;

		const views = VIEWS.map(([kx, ky], vi) => {
			const root = svg(wrap, S, S, `Scatterplot of ${LABEL[ky]} against ${LABEL[kx]}. Selected penguins are colored by species; the rest are grey.`).style('flex', `1 1 ${S - 30}px`);
			const g = root.append('g').attr('transform', `translate(${m.left},${m.top})`);
			const pad = (k: Key) => {
				const [a, b] = d3.extent(DATA, (d) => d[k]) as [number, number];
				return [a - (b - a) * 0.05, b + (b - a) * 0.05];
			};
			const x = d3.scaleLinear().domain(pad(kx)).range([0, iw]).nice();
			const y = d3.scaleLinear().domain(pad(ky)).range([ih, 0]).nice();
			styleAxis(g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).ticks(4)));
			styleAxis(g.append('g').call(d3.axisLeft(y).ticks(4)));
			g.append('text').attr('x', iw).attr('y', ih + 32).attr('text-anchor', 'end').style('fill', v('muted')).style('font-size', '12px').text(LABEL[kx]);
			g.append('text').attr('x', -40).attr('y', -10).style('fill', v('muted')).style('font-size', '12px').text(LABEL[ky]);
			const dots = g
				.append('g')
				.selectAll('path')
				.data(DATA)
				.join('path')
				.attr('transform', (d) => `translate(${x(d[kx])},${y(d[ky])})`)
				.attr('d', (d) => d3.symbol(SHAPES[SPECIES.indexOf(d.species)], 40)());
			const brush = d3
				.brush()
				.extent([
					[0, 0],
					[iw, ih],
				])
				.on('start brush end', (event: d3.D3BrushEvent<P>) => {
					if (quiet || !event.sourceEvent) return;
					if (event.type === 'start') clearBrushes(vi);
					const sel = event.selection as [[number, number], [number, number]] | null;
					if (!sel) return setSelection(null, '', true);
					const [[x0, y0], [x1, y1]] = sel;
					const hit = DATA.filter((d) => x(d[kx]) >= x0 && x(d[kx]) <= x1 && y(d[ky]) >= y0 && y(d[ky]) <= y1);
					setSelection(hit, `the box in the ${LABEL[kx].toLowerCase()} and ${LABEL[ky].toLowerCase()} view`, true);
				});
			const bg = g.append('g').call(brush);
			bg.select('.selection').style('fill', v('ink')).style('fill-opacity', 0.08).style('stroke', v('ink'));
			// The brush overlay is mouse-only, so keep it out of the tab order; the buttons and slider are the keyboard route.
			bg.selectAll('rect').attr('tabindex', null).attr('aria-hidden', 'true');
			return { dots, brush, bg };
		});

		function clearBrushes(except = -1) {
			quiet = true;
			views.forEach((vw, i) => i !== except && vw.bg.call(vw.brush.move, null));
			quiet = false;
		}

		function setSelection(rows: P[] | null, how: string, fromBrush = false) {
			if (!fromBrush) clearBrushes();
			if (!how.startsWith('body')) {
				massSlider.value = '2700';
				massSlider.setAttribute('aria-valuetext', '2,700 g');
				massSlider.nextElementSibling!.textContent = '2,700 g';
			}
			selected = rows ? new Set(rows.map((d) => d.id)) : null;
			for (const vw of views) {
				vw.dots
					.style('fill', (d) => (!selected || selected.has(d.id) ? SERIES[SPECIES.indexOf(d.species)] : v('dim')))
					.style('fill-opacity', (d) => (!selected || selected.has(d.id) ? 0.85 : 0.6))
					.filter((d) => !selected || selected.has(d.id))
					.raise();
			}
			const rowsSel = rows ?? [];
			out.textContent = rows
				? `${rowsSel.length} penguins selected (${how}): ` +
					SPECIES.map((s) => `${rowsSel.filter((d) => d.species === s).length} ${s}`).join(', ') +
					'. They are colored in all three views; the others are grey.'
				: 'Nothing selected, so all penguins are colored by species: Adelie circles, Chinstrap squares, Gentoo triangles.';
			dataTable(
				el,
				[
					{ label: 'Species', value: (r: { s: string; rows: P[] }) => r.s },
					{ label: 'Selected', value: (r) => r.rows.length, numeric: true },
					...(Object.keys(LABEL) as Key[]).map((k) => ({
						label: `Mean ${LABEL[k].toLowerCase()}`,
						value: (r: { rows: P[] }) => (r.rows.length ? d3.mean(r.rows, (d) => d[k])!.toFixed(1) : '–'),
						numeric: true,
					})),
				],
				SPECIES.map((s) => ({ s, rows: (rows ?? DATA).filter((d) => d.species === s) })),
				'Show the data (selected penguins, per species)',
			);
		}
		setSelection(null, '');
	},
};

export default figure;
