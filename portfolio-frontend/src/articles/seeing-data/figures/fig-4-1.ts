import * as d3 from 'd3';
import { dataTable, rng, svg, v, viridis, type Figure } from './lib';
import penguins from './data/penguins.json';
import gistemp from './data/5-2-gistemp.json';

interface Penguin {
	species: string;
	island: string;
	bill_length_mm: number | null;
	bill_depth_mm: number | null;
	flipper_length_mm: number | null;
	body_mass_g: number | null;
}
type G = d3.Selection<SVGGElement, unknown, null, undefined>;
type Num = 'bill_length_mm' | 'bill_depth_mm' | 'flipper_length_mm' | 'body_mass_g';

const ALL = penguins as Penguin[];
const P = ALL.filter((d) => d.body_mass_g != null && d.flipper_length_mm != null && d.bill_length_mm != null && d.bill_depth_mm != null);
const SPECIES = ['Adelie', 'Chinstrap', 'Gentoo'];
const ISLANDS = ['Biscoe', 'Dream', 'Torgersen'];
const color = (s: string) => v(`series-${SPECIES.indexOf(s) + 1}`);
const SYMBOLS = [d3.symbolCircle, d3.symbolTriangle, d3.symbolSquare];

const TW = 200;
const TH = 150;
const M = { l: 14, r: 10, t: 10, b: 24 };
const IW = TW - M.l - M.r;
const IH = TH - M.t - M.b;

function axes(g: G) {
	g.append('line').attr('x1', 0).attr('x2', IW).attr('y1', IH).attr('y2', IH).style('stroke', v('axis'));
	g.append('line').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', IH).style('stroke', v('axis'));
}
function note(g: G, x: number, y: number, text: string, anchor = 'middle') {
	return g
		.append('text')
		.attr('x', x)
		.attr('y', y)
		.attr('text-anchor', anchor)
		.style('fill', v('muted'))
		.style('font-size', '12px')
		.text(text);
}
const count = (f: (d: Penguin) => boolean) => ALL.filter(f).length;

interface Thumb {
	name: string;
	shows: string;
	mark: string;
	channels: string;
	draw: (g: G) => void;
}

const THUMBS: Thumb[] = [
	{
		name: 'Scatterplot',
		shows: 'Penguins: flipper length against body mass',
		mark: 'Points',
		channels: 'Horizontal and vertical position',
		draw(g) {
			axes(g);
			const x = d3.scaleLinear().domain(d3.extent(P, (d) => d.flipper_length_mm!) as [number, number]).range([4, IW - 4]);
			const y = d3.scaleLinear().domain(d3.extent(P, (d) => d.body_mass_g!) as [number, number]).range([IH - 4, 4]);
			g.selectAll('path')
				.data(P)
				.join('path')
				.attr('transform', (d) => `translate(${x(d.flipper_length_mm!)},${y(d.body_mass_g!)})`)
				.attr('d', (d) => d3.symbol(SYMBOLS[SPECIES.indexOf(d.species)], 22)()!)
				.style('fill', (d) => color(d.species))
				.style('fill-opacity', 0.75);
			note(g, IW / 2, IH + 17, 'flipper length →');
		},
	},
	{
		name: 'Bar chart',
		shows: 'Penguins: count per species',
		mark: 'Lines (bars)',
		channels: 'Length, one region per bar',
		draw(g) {
			const x = d3.scaleBand().domain(SPECIES).range([0, IW]).padding(0.3);
			const y = d3.scaleLinear().domain([0, 160]).range([IH, 0]);
			g.selectAll('rect')
				.data(SPECIES)
				.join('rect')
				.attr('x', (s) => x(s)!)
				.attr('width', x.bandwidth())
				.attr('y', (s) => y(count((d) => d.species === s)))
				.attr('height', (s) => IH - y(count((d) => d.species === s)))
				.attr('rx', 1.5)
				.style('fill', (s) => color(s));
			g.append('line').attr('x2', IW).attr('y1', IH).attr('y2', IH).style('stroke', v('axis'));
			for (const s of SPECIES) note(g, x(s)! + x.bandwidth() / 2, IH + 17, s);
		},
	},
	{
		name: 'Line chart',
		shows: 'Global temperature anomaly, 1880 to 2025 (NASA GISTEMP)',
		mark: 'Points joined by lines',
		channels: 'Position',
		draw(g) {
			axes(g);
			const rows = gistemp.rows as [number, number, number][];
			const x = d3.scaleLinear().domain([1880, 2025]).range([0, IW]);
			const y = d3.scaleLinear().domain([-0.6, 1.4]).range([IH, 0]);
			g.append('path')
				.attr('d', d3.line<[number, number, number]>((d) => x(d[0]), (d) => y(d[1]))(rows))
				.style('fill', 'none')
				.style('stroke', v('series-1'))
				.style('stroke-width', 2);
			note(g, 0, IH + 17, '1880', 'start');
			note(g, IW, IH + 17, '2025', 'end');
		},
	},
	{
		name: 'Stacked bar',
		shows: 'Penguins: count per island, split by species',
		mark: 'Stacked lines (bars)',
		channels: 'Length, color for the second key',
		draw(g) {
			const rows = ISLANDS.map((i) => {
				const r: Record<string, number | string> = { island: i };
				for (const s of SPECIES) r[s] = count((d) => d.island === i && d.species === s);
				return r;
			});
			const stack = d3.stack<Record<string, number | string>>().keys(SPECIES)(rows);
			const x = d3.scaleBand().domain(ISLANDS).range([0, IW]).padding(0.3);
			const y = d3.scaleLinear().domain([0, 170]).range([IH, 0]);
			g.selectAll('g')
				.data(stack)
				.join('g')
				.style('fill', (s) => color(s.key))
				.selectAll('rect')
				.data((s) => s)
				.join('rect')
				.attr('x', (d) => x(d.data.island as string)!)
				.attr('width', x.bandwidth())
				.attr('y', (d) => y(d[1]))
				.attr('height', (d) => Math.max(0, y(d[0]) - y(d[1]) - (d[1] > d[0] ? 1 : 0)));
			g.append('line').attr('x2', IW).attr('y1', IH).attr('y2', IH).style('stroke', v('axis'));
			for (const i of ISLANDS) note(g, x(i)! + x.bandwidth() / 2, IH + 17, i);
		},
	},
	{
		name: 'Heatmap',
		shows: 'Penguins: count per species and island',
		mark: 'Areas',
		channels: 'Color',
		draw(g) {
			const x = d3.scaleBand().domain(ISLANDS).range([40, IW]).padding(0.06);
			const y = d3.scaleBand().domain(SPECIES).range([0, IH]).padding(0.06);
			const cells = d3.cross(SPECIES, ISLANDS).map(([s, i]) => ({ s, i, n: count((d) => d.species === s && d.island === i) }));
			const c = d3.scaleSequential(viridis).domain([0, 124]);
			g.selectAll('rect')
				.data(cells)
				.join('rect')
				.attr('x', (d) => x(d.i)!)
				.attr('y', (d) => y(d.s)!)
				.attr('width', x.bandwidth())
				.attr('height', y.bandwidth())
				.style('fill', (d) => (d.n ? c(d.n) : v('grid')));
			for (const s of SPECIES) note(g, 34, y(s)! + y.bandwidth() / 2 + 4, s.slice(0, 3), 'end');
			for (const i of ISLANDS) note(g, x(i)! + x.bandwidth() / 2, IH + 17, i.slice(0, 3));
		},
	},
	{
		name: 'Streamgraph',
		shows: 'Synthetic data: five series rising and falling over time',
		mark: 'Areas',
		channels: 'Stacked thickness',
		draw(g) {
			const r = rng(7);
			const K = ['a', 'b', 'c', 'd', 'e'];
			// Each series is a sum of a few random bumps: clearly labelled made-up data.
			const bumps = K.map(() => d3.range(3).map(() => ({ at: r() * 40, w: 3 + r() * 8, h: 1 + r() * 4 })));
			const rows = d3.range(41).map((t) => {
				const o: Record<string, number> = { t };
				K.forEach((k, i) => (o[k] = 0.2 + d3.sum(bumps[i], (b) => b.h * Math.exp(-((t - b.at) ** 2) / (2 * b.w ** 2)))));
				return o;
			});
			const stack = d3.stack<Record<string, number>>().keys(K).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut)(rows);
			const x = d3.scaleLinear().domain([0, 40]).range([0, IW]);
			const y = d3
				.scaleLinear()
				.domain([d3.min(stack, (s) => d3.min(s, (d) => d[0]))!, d3.max(stack, (s) => d3.max(s, (d) => d[1]))!])
				.range([IH, 0]);
			const area = d3
				.area<d3.SeriesPoint<Record<string, number>>>()
				.x((d) => x(d.data.t))
				.y0((d) => y(d[0]))
				.y1((d) => y(d[1]))
				.curve(d3.curveBasis);
			g.selectAll('path')
				.data(stack)
				.join('path')
				.attr('d', area)
				.style('fill', (_, i) => v(`series-${i + 4}`))
				.style('stroke', v('surface'))
				.style('stroke-width', 0.75);
			note(g, IW / 2, IH + 17, 'synthetic data, time →');
		},
	},
	{
		name: 'Scatterplot matrix',
		shows: 'Penguins: bill length, bill depth and flipper length, every pair',
		mark: 'Points',
		channels: 'Position, one small scatterplot per pair',
		draw(g) {
			const attrs: Num[] = ['bill_length_mm', 'bill_depth_mm', 'flipper_length_mm'];
			const names = ['bill L', 'bill D', 'flipper'];
			const n = attrs.length;
			const gap = 4;
			const size = (IH + 14 - gap * (n - 1)) / n;
			const ox = (IW - (size * n + gap * (n - 1))) / 2;
			const sc = attrs.map((a) => d3.scaleLinear().domain(d3.extent(P, (d) => d[a]!) as [number, number]).range([2, size - 2]));
			attrs.forEach((ay, row) =>
				attrs.forEach((ax, col) => {
					const cell = g.append('g').attr('transform', `translate(${ox + col * (size + gap)},${row * (size + gap)})`);
					cell.append('rect').attr('width', size).attr('height', size).style('fill', 'none').style('stroke', v('grid'));
					if (row === col) {
						note(cell, size / 2, size / 2 + 4, names[row]);
						return;
					}
					cell.selectAll('circle')
						.data(P)
						.join('circle')
						.attr('cx', (d) => sc[col](d[ax]!))
						.attr('cy', (d) => size - sc[row](d[ay]!))
						.attr('r', 1.2)
						.style('fill', (d) => color(d.species));
				}),
			);
		},
	},
	{
		name: 'Parallel coordinates',
		shows: 'Penguins: four measurements, one line per penguin',
		mark: 'Lines',
		channels: 'Position on parallel axes',
		draw(g) {
			const attrs: Num[] = ['bill_length_mm', 'bill_depth_mm', 'flipper_length_mm', 'body_mass_g'];
			const names = ['bill L', 'bill D', 'flipper', 'mass'];
			const x = d3.scalePoint<Num>().domain(attrs).range([10, IW - 10]);
			const ys = new Map(attrs.map((a) => [a, d3.scaleLinear().domain(d3.extent(P, (d) => d[a]!) as [number, number]).range([IH, 0])]));
			g.selectAll('path')
				.data(P)
				.join('path')
				.attr('d', (d) => d3.line()(attrs.map((a) => [x(a)!, ys.get(a)!(d[a]!)])))
				.style('fill', 'none')
				.style('stroke', (d) => color(d.species))
				.style('stroke-opacity', 0.35)
				.style('stroke-width', 1);
			attrs.forEach((a, i) => {
				g.append('line').attr('x1', x(a)!).attr('x2', x(a)!).attr('y2', IH).style('stroke', v('ink'));
				note(g, x(a)!, IH + 17, names[i]);
			});
		},
	},
	{
		name: 'Pie chart',
		shows: 'Penguins: count per island',
		mark: 'Wedges',
		channels: 'Angle, area, arc length',
		draw(g) {
			const data = ISLANDS.map((i) => ({ i, n: count((d) => d.island === i) }));
			const r = 48;
			const c = g.append('g').attr('transform', `translate(${IW / 2 + 2},${IH / 2 + 8})`);
			const arcs = d3.pie<(typeof data)[number]>().value((d) => d.n).sort(null)(data);
			c.selectAll('path')
				.data(arcs)
				.join('path')
				.attr('d', d3.arc<d3.PieArcDatum<(typeof data)[number]>>().innerRadius(0).outerRadius(r))
				.style('fill', v('series-1'))
				.style('stroke', v('surface'))
				.style('stroke-width', 1.5);
			const lab = d3.arc<d3.PieArcDatum<(typeof data)[number]>>().innerRadius(r + 8).outerRadius(r + 8);
			c.selectAll('text')
				.data(arcs)
				.join('text')
				.attr('transform', (d) => `translate(${lab.centroid(d)})`)
				.attr('text-anchor', (d) => ((d.startAngle + d.endAngle) / 2 > Math.PI ? 'end' : 'start'))
				.attr('dy', '0.35em')
				.style('fill', v('muted'))
				.style('font-size', '12px')
				.text((d) => d.data.i);
		},
	},
];

const figure: Figure = {
	title: 'A field guide in thumbnails',
	caption:
		'One small example for each chart in the field guide below. Each is a choice of mark and channels for a particular shape of data: how many keys, how many values, and whether they are ordered.',
	credit:
		'Breakdown after Munzner 2014. Palmer Penguins data by Horst, Hill and Gorman (CC0). Temperature: NASA GISTEMP v4 (public domain). Streamgraph data is synthetic.',
	mount(el) {
		const legend = document.createElement('p');
		legend.style.cssText = 'margin: 0 0 10px; font-size: 14px; display: flex; flex-wrap: wrap; gap: 4px 16px;';
		legend.append('Penguin species:');
		SPECIES.forEach((s, i) => {
			const item = document.createElement('span');
			item.style.cssText = 'display: inline-flex; align-items: center;';
			const sw = d3
				.create('svg')
				.attr('width', 14)
				.attr('height', 14)
				.attr('aria-hidden', 'true')
								.style('margin-right', '4px');
			sw.append('path')
				.attr('transform', 'translate(7,7)')
				.attr('d', d3.symbol(SYMBOLS[i], 90)()!)
				.style('fill', color(s));
			item.append(sw.node()!, s);
			legend.append(item);
		});
		el.append(legend);

		const grid = document.createElement('div');
		grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px 14px;';
		el.append(grid);
		for (const t of THUMBS) {
			const cell = document.createElement('div');
			grid.append(cell);
			const root = svg(cell, TW, TH, `${t.name}: ${t.shows}.`);
			t.draw(root.append('g').attr('transform', `translate(${M.l},${M.t})`));
			const p = document.createElement('p');
			p.style.cssText = 'margin: 4px 0 0; font-size: 14px; line-height: 1.35;';
			const b = document.createElement('strong');
			b.textContent = t.name;
			const s = document.createElement('span');
			s.style.color = 'var(--viz-muted)';
			s.textContent = t.shows;
			p.append(b, document.createElement('br'), s);
			cell.append(p);
		}

		dataTable(
			el,
			[
				{ label: 'Chart', value: (d: Thumb) => d.name },
				{ label: 'Data in the thumbnail', value: (d) => d.shows },
				{ label: 'Mark', value: (d) => d.mark },
				{ label: 'Channels', value: (d) => d.channels },
			],
			THUMBS,
		);
	},
};

export default figure;
