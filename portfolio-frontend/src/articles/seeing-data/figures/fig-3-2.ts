import * as d3 from 'd3';
import { svg, v, type Figure } from './lib';

type G = d3.Selection<SVGGElement, unknown, null, undefined>;

const PW = 160;
const PH = 140;

const PANELS: { name: string; note: string; label: string; draw: (g: G) => void }[] = [
	{
		name: 'Proximity',
		note: 'Spacing alone makes two groups.',
		label: 'Sixteen identical dots, spaced so they read as two groups of eight.',
		draw(g) {
			const pts = d3.cross([20, 52, 84, 116], [20, 42, 118, 140]).map(([y, x]) => ({ x, y }));
			g.selectAll('circle')
				.data(pts)
				.join('circle')
				.attr('cx', (d) => d.x)
				.attr('cy', (d) => d.y)
				.attr('r', 7)
				.style('fill', v('muted'));
		},
	},
	{
		name: 'Similarity',
		note: 'Even spacing, but you see rows.',
		label: 'An evenly spaced grid where alternate rows are blue circles and orange squares, so it reads as rows.',
		draw(g) {
			const pts = d3.cross(d3.range(4), d3.range(5)).map(([r, c]) => ({ r, x: 24 + c * 28, y: 24 + r * 31 }));
			g.selectAll('path')
				.data(pts)
				.join('path')
				.attr('transform', (d) => `translate(${d.x},${d.y})`)
				.attr('d', (d) => d3.symbol(d.r % 2 ? d3.symbolSquare : d3.symbolCircle, 150)()!)
				.style('fill', (d) => (d.r % 2 ? v('series-2') : v('series-1')));
		},
	},
	{
		name: 'Symmetry',
		note: 'Mirrored brackets pair up.',
		label: 'Six evenly spaced brackets that read as three symmetric pairs.',
		draw(g) {
			const sq = (s: number) => `M${8 * s},-28 H0 V28 H${8 * s}`;
			const paren = (s: number) => `M${8 * s},-28 Q${-10 * s},0 ${8 * s},28`;
			const angle = (s: number) => `M${10 * s},-28 L0,0 L${10 * s},28`;
			const shapes = [sq(1), sq(-1), paren(1), paren(-1), angle(1), angle(-1)];
			g.selectAll('path')
				.data(shapes)
				.join('path')
				.attr('transform', (_, i) => `translate(${18 + i * 25},70)`)
				.attr('d', (d) => d)
				.style('fill', 'none')
				.style('stroke', v('ink'))
				.style('stroke-width', 3)
				.style('stroke-linecap', 'round');
		},
	},
	{
		name: 'Parallelism',
		note: 'Evenly spaced, but parallel lines pair up.',
		label: 'Six evenly spaced lines whose slants come in parallel pairs, so they read as three pairs.',
		draw(g) {
			const slant = [-1, -1, 0, 0, 1, 1];
			const lines = slant.map((a, i) => ({ x: 20 + i * 24, a, y: 70 }));
			g.selectAll('line')
				.data(lines)
				.join('line')
				.attr('x1', (d) => d.x - 10 * d.a)
				.attr('x2', (d) => d.x + 10 * d.a)
				.attr('y1', (d) => d.y - 28)
				.attr('y2', (d) => d.y + 28)
				.style('stroke', v('ink'))
				.style('stroke-width', 3)
				.style('stroke-linecap', 'round');
		},
	},
	{
		name: 'Figure and ground',
		note: 'A vase, or two faces?',
		label: 'Rubin’s vase: a light vase on a dark background, whose outline also forms two dark faces looking at each other.',
		draw(g) {
			// Half-width of the vase from top to bottom; the faces' profiles are its edges.
			const hw: [number, number][] = [
				[6, 44], [16, 42], [26, 30], [36, 24], [44, 26], [52, 14], [60, 20], [66, 15],
				[72, 19], [78, 16], [86, 24], [100, 30], [116, 34], [134, 44],
			];
			const right = hw.map(([y, w]) => [80 + w, y] as [number, number]);
			const left = hw.map(([y, w]) => [80 - w, y] as [number, number]).reverse();
			const line = d3.line().curve(d3.curveCatmullRom);
			// Dark faces on the sides, light vase in the middle.
			g.append('rect').attr('x', 20).attr('y', 6).attr('width', 120).attr('height', 128).style('fill', v('ink'));
			g.append('path')
				.attr('d', `${line(right)}L${left[0].join(',')} ${line(left)!.slice(1)}Z`)
				.style('fill', v('surface'));
		},
	},
];

const figure: Figure = {
	title: 'Five ways we group what we see',
	caption:
		'Each panel uses one Gestalt principle and nothing else. Nobody has to tell you where the groups are.',
	mount(el) {
		const grid = document.createElement('div');
		grid.style.cssText =
			'display: grid; grid-template-columns: repeat(auto-fit, minmax(104px, 1fr)); gap: 12px; align-items: start;';
		el.append(grid);
		for (const p of PANELS) {
			const cell = document.createElement('div');
			grid.append(cell);
			const root = svg(cell, PW, PH, `${p.name}. ${p.label}`);
			root.style('margin', '0 auto');
			p.draw(root.append('g'));
			const t = document.createElement('p');
			t.style.cssText = 'margin: 4px 0 0; font-size: 14px; line-height: 1.35; text-align: center;';
			const b = document.createElement('strong');
			b.textContent = p.name;
			const n = document.createElement('span');
			n.style.color = 'var(--viz-muted)';
			n.textContent = p.note;
			t.append(b, document.createElement('br'), n);
			cell.append(t);
		}
	},
};

export default figure;
