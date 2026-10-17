import * as d3 from 'd3';
import penguinsRaw from './data/penguins.json';
import { SERIES, button, controls, dataTable, gridY, readout, select, styleAxis, svg, v, type Figure } from './lib';

type Key = 'flipper_length_mm' | 'body_mass_g' | 'bill_length_mm' | 'bill_depth_mm';
type Raw = { species: string } & Record<Key, number | null>;

const ATTRS: { value: Key; label: string; step: number }[] = [
	{ value: 'flipper_length_mm', label: 'Flipper length (mm)', step: 3 },
	{ value: 'body_mass_g', label: 'Body mass (g)', step: 200 },
	{ value: 'bill_length_mm', label: 'Bill length (mm)', step: 1.5 },
	{ value: 'bill_depth_mm', label: 'Bill depth (mm)', step: 0.5 },
];
const SPECIES = ['Adelie', 'Chinstrap', 'Gentoo'];
const DATA = penguinsRaw as Raw[];

type Mode = 'juxtapose' | 'superimpose';

const figure: Figure = {
	title: 'Superimpose or juxtapose',
	caption:
		'The same three histograms, one per penguin species. Superimposed, they share one set of axes and their overlap is easy to see, but the layers start to hide each other. Juxtaposed as small multiples, the data is partitioned by species into separate panels with the same axes, so each shape is clear and comparing them costs a glance between panels.',
	credit: 'Data: Palmer Penguins, Gorman, Williams and Fraser 2014, via Horst, Hill and Gorman 2020 (CC0). Terms: Munzner 2014.',
	mount(el) {
		let mode: Mode = 'juxtapose';
		let attr = ATTRS[0];

		const row = controls(el);
		const modeButtons = (['juxtapose', 'superimpose'] as Mode[]).map((m) => {
			const b = button(row, m === 'juxtapose' ? 'Juxtapose (small multiples)' : 'Superimpose (one chart)', () => {
				mode = m;
				draw();
			});
			b.dataset.mode = m;
			return b;
		});
		select(
			row,
			'Measure',
			ATTRS.map((a) => ({ value: a.value, label: a.label })),
			(val) => {
				attr = ATTRS.find((a) => a.value === val)!;
				draw();
			},
			attr.value,
		);

		const W = 600;
		const H = 380;
		const m = { top: 26, right: 90, bottom: 44, left: 48 };
		const iw = W - m.left - m.right;
		const ih = H - m.top - m.bottom;
		const root = svg(el, W, H, 'Histograms of a penguin measurement for each species.');
		const g = root.append('g').attr('transform', `translate(${m.left},${m.top})`);
		const out = readout(el);

		function draw() {
			for (const b of modeButtons) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
			const vals = DATA.map((d) => d[attr.value]).filter((x): x is number => x != null);
			const lo = Math.floor(d3.min(vals)! / attr.step) * attr.step;
			const hi = Math.ceil(d3.max(vals)! / attr.step) * attr.step;
			const thresholds = d3.range(lo, hi + attr.step / 2, attr.step);
			const bin = d3.bin().domain([lo, hi]).thresholds(thresholds);
			const series = SPECIES.map((s, i) => ({
				s,
				i,
				bins: bin(DATA.filter((d) => d.species === s && d[attr.value] != null).map((d) => d[attr.value]!)),
			}));
			const yMax = d3.max(series, (se) => d3.max(se.bins, (b) => b.length))!;
			const x = d3.scaleLinear().domain([lo, hi]).range([0, iw]);

			g.selectAll('*').remove();
			const panels = mode === 'juxtapose' ? series.map((se) => [se]) : [series];
			const gap = 16;
			const ph = (ih - gap * (panels.length - 1)) / panels.length;
			const y = d3.scaleLinear().domain([0, yMax]).range([ph, 0]).nice();

			panels.forEach((group, k) => {
				const pg = g.append('g').attr('transform', `translate(0,${k * (ph + gap)})`);
				gridY(pg.append('g'), y, iw, mode === 'juxtapose' ? 2 : 5);
				styleAxis(pg.append('g').call(d3.axisLeft(y).ticks(mode === 'juxtapose' ? 2 : 5)));
				const xa = pg.append('g').attr('transform', `translate(0,${ph})`).call(d3.axisBottom(x).ticks(6).tickSizeOuter(0));
				styleAxis(xa);
				if (k < panels.length - 1) xa.selectAll('.tick text').remove();
				for (const se of group) {
					const area = d3
						.area<d3.Bin<number, number>>()
						.curve(d3.curveStepAfter)
						.x((b) => x(b.x0!))
						.y0(ph)
						.y1((b) => y(b.length));
					// Close the last step at the right edge of the final bin.
					const last = se.bins[se.bins.length - 1];
					const pts = [...se.bins, Object.assign([...last], { x0: last.x1, x1: last.x1 })];
					if (mode === 'juxtapose') {
						pg.append('g')
							.selectAll('rect')
							.data(se.bins)
							.join('rect')
							.attr('x', (b) => x(b.x0!) + 0.5)
							.attr('width', (b) => Math.max(0, x(b.x1!) - x(b.x0!) - 1))
							.attr('y', (b) => y(b.length))
							.attr('height', (b) => ph - y(b.length))
							.style('fill', SERIES[se.i]);
					} else {
						pg.append('path').datum(pts).attr('d', area).style('fill', SERIES[se.i]).style('fill-opacity', 0.18);
						pg.append('path').datum(pts).attr('d', area.lineY1()).style('fill', 'none').style('stroke', SERIES[se.i]).style('stroke-width', 2);
					}
					// Direct label: at the panel's right edge, or beside each species' tallest bar.
					const peak = se.bins[d3.maxIndex(se.bins, (b) => b.length)];
					const lx = mode === 'juxtapose' ? iw + 8 : x((peak.x0! + peak.x1!) / 2);
					const ly = mode === 'juxtapose' ? ph / 2 + 5 : y(peak.length) - 8;
					pg.append('text')
						.attr('x', lx)
						.attr('y', ly)
						.attr('text-anchor', mode === 'juxtapose' ? 'start' : 'middle')
						.style('fill', v('ink'))
						.style('font-size', '14px')
						.style('font-weight', '700')
						.style('stroke', v('surface'))
						.style('stroke-width', 4)
						.style('paint-order', 'stroke')
						.text(se.s);
				}
			});
			g.append('text').attr('x', iw).attr('y', ih + 38).attr('text-anchor', 'end').style('fill', v('muted')).style('font-size', '13px').text(attr.label);
			g.append('text').attr('x', -44).attr('y', -12).style('fill', v('muted')).style('font-size', '13px').text('Penguins per bin');

			out.textContent =
				mode === 'juxtapose'
					? `Juxtaposed: three panels, one per species, sharing the ${attr.label.toLowerCase()} axis and a 0 to ${y.domain()[1]} count axis.`
					: `Superimposed: three layers on one set of axes. Where they overlap, the colors mix and the shapes are harder to follow.`;

			dataTable(
				el,
				[
					{ label: `${attr.label}, from`, value: (r: { x0: number; x1: number; c: number[] }) => r.x0, numeric: true },
					{ label: 'to', value: (r) => r.x1, numeric: true },
					...SPECIES.map((s, i) => ({ label: s, value: (r: { c: number[] }) => r.c[i], numeric: true })),
				],
				series[0].bins.map((b, j) => ({ x0: b.x0!, x1: b.x1!, c: series.map((se) => se.bins[j].length) })),
				'Show the counts per bin',
			);
		}
		draw();
	},
};

export default figure;
