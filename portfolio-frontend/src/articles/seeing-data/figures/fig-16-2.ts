import * as d3 from 'd3';
import { dataTable, rng, styleAxis, svg, v, type Figure } from './lib';

// Two synthetic groups of 201 values with the exact same five-number summary.
// A is bell-shaped. B is built to hit A's quartiles but piles its values up near
// Q1 and Q3, so it has two peaks and almost nothing at the median.
const N = 201;
const random = rng(16);
const A = d3.range(N).map(d3.randomNormal.source(random)(50, 10)).sort(d3.ascending);
const Q = [0, 0.25, 0.5, 0.75, 1].map((p) => d3.quantile(A, p)!);

const B: number[] = [];
const per = (N - 1) / 4 - 1; // values strictly between two quartiles
for (let s = 0; s < 4; s++) {
	B.push(Q[s]);
	const lo = Q[s];
	const hi = Q[s + 1];
	// Segments 0 and 1 crowd toward Q1, segments 2 and 3 toward Q3.
	const toward = s < 2 ? Q[1] : Q[3];
	const seg = d3.range(per).map((i) => {
		const u = ((i + 0.5) / per) ** (s === 1 || s === 2 ? 3.5 : 1.4);
		return toward === lo ? lo + (hi - lo) * u * 0.999 : hi - (hi - lo) * u * 0.999;
	});
	B.push(...seg.sort(d3.ascending));
}
B.push(Q[4]);

const GROUPS = [
	{ name: 'Group A', values: A, color: v('series-1') },
	{ name: 'Group B', values: B, color: v('series-2') },
];

const PANELS = ['Mean ± 1 standard deviation', 'Box plot (whiskers to min and max)', 'Violin plot', 'Every value'] as const;

const figure: Figure = {
	title: 'Same box, different data',
	caption:
		'Two groups with identical minimum, quartiles, median and maximum. The box plots are identical and the error bars barely differ. The violin and the raw values show what both hide: group B has two peaks and few values near its median.',
	credit: 'Synthetic data. Strategies after Potter, Rosen and Johnson 2012.',
	mount(el) {
		const W = 680;
		const m = { top: 8, right: 20, bottom: 34, left: 76 };
		const iw = W - m.left - m.right;
		const rowH = 34;
		const panelH = 22 + rowH * 2 + 14;
		const H = m.top + panelH * PANELS.length + m.bottom;
		const root = svg(
			el,
			W,
			H,
			'Two groups shown four ways. Mean and standard deviation bars and box plots look nearly identical for both. The violin plot and the raw values show group A as one central hump and group B as two humps near the quartiles.',
		);
		const g = root.append('g').attr('transform', `translate(${m.left},${m.top})`);
		const x = d3.scaleLinear().domain([Q[0] - 4, Q[4] + 4]).nice().range([0, iw]);
		const kde = (vals: number[], bw: number) => {
			const xs = d3.ticks(Q[0] - 2 * bw, Q[4] + 2 * bw, 120);
			return xs.map((t) => [t, d3.mean(vals, (vv) => Math.exp(-0.5 * ((t - vv) / bw) ** 2))!] as [number, number]);
		};
		const dens = GROUPS.map((gr) => kde(gr.values, 2.2));
		const dMax = d3.max(dens.flat(), (d) => d[1])!;
		const jitter = rng(3);

		PANELS.forEach((title, p) => {
			const pg = g.append('g').attr('transform', `translate(0,${p * panelH})`);
			pg.append('text')
				.attr('x', -m.left + 4)
				.attr('y', 14)
				.style('fill', v('ink'))
				.style('font-size', '14px')
				.style('font-weight', 700)
				.text(title);
			GROUPS.forEach((gr, i) => {
				const cy = 22 + rowH * i + rowH / 2;
				const row = pg.append('g').attr('transform', `translate(0,${cy})`);
				row.append('text')
					.attr('x', -10)
					.attr('dy', '0.35em')
					.attr('text-anchor', 'end')
					.style('fill', v('ink'))
					.style('font-size', '13px')
					.text(gr.name);
				const vals = gr.values;
				const h = rowH / 2 - 3;
				if (p === 0) {
					const mean = d3.mean(vals)!;
					const sd = d3.deviation(vals)!;
					row.append('line').attr('x1', x(mean - sd)).attr('x2', x(mean + sd)).style('stroke', gr.color).style('stroke-width', 2);
					for (const e of [mean - sd, mean + sd])
						row.append('line').attr('x1', x(e)).attr('x2', x(e)).attr('y1', -8).attr('y2', 8).style('stroke', gr.color).style('stroke-width', 2);
					row.append('circle').attr('cx', x(mean)).attr('r', 5).style('fill', gr.color);
				} else if (p === 1) {
					const q = [0, 0.25, 0.5, 0.75, 1].map((pp) => d3.quantile(vals, pp)!);
					row.append('line').attr('x1', x(q[0])).attr('x2', x(q[4])).style('stroke', v('muted')).style('stroke-width', 1.5);
					for (const e of [q[0], q[4]])
						row.append('line').attr('x1', x(e)).attr('x2', x(e)).attr('y1', -6).attr('y2', 6).style('stroke', v('muted')).style('stroke-width', 1.5);
					row.append('rect')
						.attr('x', x(q[1]))
						.attr('width', x(q[3]) - x(q[1]))
						.attr('y', -h)
						.attr('height', h * 2)
						.style('fill', gr.color)
						.style('fill-opacity', 0.35)
						.style('stroke', gr.color)
						.style('stroke-width', 2);
					row.append('line').attr('x1', x(q[2])).attr('x2', x(q[2])).attr('y1', -h).attr('y2', h).style('stroke', v('ink')).style('stroke-width', 2);
				} else if (p === 2) {
					const area = d3
						.area<[number, number]>()
						.x((d) => x(d[0]))
						.y0((d) => (d[1] / dMax) * h)
						.y1((d) => (-d[1] / dMax) * h)
						.curve(d3.curveBasis);
					row.append('path').attr('d', area(dens[i])).style('fill', gr.color).style('fill-opacity', 0.6).style('stroke', gr.color).style('stroke-width', 1.5);
				} else {
					row.selectAll('circle')
						.data(vals)
						.join('circle')
						.attr('cx', (d) => x(d))
						.attr('cy', () => (jitter() - 0.5) * h * 1.8)
						.attr('r', 2.5)
						.style('fill', gr.color)
						.style('fill-opacity', 0.55);
				}
			});
		});
		styleAxis(g.append('g').attr('transform', `translate(0,${H - m.top - m.bottom + 4})`).call(d3.axisBottom(x).ticks(8)));

		const stat = (vals: number[], p: number) => d3.quantile(vals, p)!.toFixed(1);
		dataTable(
			el,
			[
				{ label: 'Group', value: (gr) => gr.name },
				{ label: 'Min', value: (gr) => stat(gr.values, 0), numeric: true },
				{ label: 'Q1', value: (gr) => stat(gr.values, 0.25), numeric: true },
				{ label: 'Median', value: (gr) => stat(gr.values, 0.5), numeric: true },
				{ label: 'Q3', value: (gr) => stat(gr.values, 0.75), numeric: true },
				{ label: 'Max', value: (gr) => stat(gr.values, 1), numeric: true },
				{ label: 'Mean', value: (gr) => d3.mean(gr.values)!.toFixed(1), numeric: true },
				{ label: 'SD', value: (gr) => d3.deviation(gr.values)!.toFixed(1), numeric: true },
				{ label: 'Values within 2 of the median', value: (gr) => gr.values.filter((d) => Math.abs(d - Q[2]) <= 2).length, numeric: true },
			],
			GROUPS,
		);
	},
};

export default figure;
