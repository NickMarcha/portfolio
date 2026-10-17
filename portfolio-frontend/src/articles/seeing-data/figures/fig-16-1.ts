import * as d3 from 'd3';
import { dataTable, rng, svg, v, type Figure } from './lib';

// Board radius is 1. Each board: where the throws are aimed (bias) and how much they scatter.
const BOARDS = [
	{ name: 'Precise and accurate', precise: true, accurate: true, cx: 0, cy: 0, sd: 0.08 },
	{ name: 'Accurate, not precise', precise: false, accurate: true, cx: 0, cy: 0, sd: 0.26 },
	{ name: 'Precise, not accurate', precise: true, accurate: false, cx: 0.5, cy: -0.42, sd: 0.08 },
	{ name: 'Neither', precise: false, accurate: false, cx: -0.4, cy: 0.3, sd: 0.26 },
];
const N = 10;

const random = rng(7);
const normal = d3.randomNormal.source(random);
const THROWS = BOARDS.map((b) => {
	const nx = normal(b.cx, b.sd);
	const ny = normal(b.cy, b.sd);
	return d3.range(N).map(() => {
		let x = nx();
		let y = ny();
		// Keep every dart on the board.
		const r = Math.hypot(x, y);
		if (r > 0.95) [x, y] = [(x / r) * 0.95, (y / r) * 0.95];
		return { x, y };
	});
});

const figure: Figure = {
	title: 'Accuracy and precision',
	caption:
		'Ten darts on each board. Accuracy is how close the darts land to the bullseye on average; precision is how tightly they group. The two are independent, and a tight cluster in the wrong place is precisely wrong.',
	mount(el) {
		const W = 640;
		const H = 440;
		const R = 78;
		const left = 110;
		const top = 40;
		const cellW = (W - left) / 2;
		const cellH = (H - top) / 2;
		const root = svg(
			el,
			W,
			H,
			'Four dartboards in a two by two grid. Columns: precise, not precise. Rows: accurate, not accurate. Precise boards have tight clusters; accurate boards are centered on the bullseye. The precise but not accurate board has a tight cluster up and to the right of the center.',
		);

		const colHead = ['Precise', 'Not precise'];
		const rowHead = ['Accurate', 'Not accurate'];
		root.selectAll('text.col')
			.data(colHead)
			.join('text')
			.attr('x', (_, i) => left + cellW * (i + 0.5))
			.attr('y', 22)
			.attr('text-anchor', 'middle')
			.style('fill', v('ink'))
			.style('font-size', '15px')
			.style('font-weight', 700)
			.text((d) => d);
		root.selectAll('text.row')
			.data(rowHead)
			.join('text')
			.attr('x', left - 16)
			.attr('y', (_, i) => top + cellH * (i + 0.5))
			.attr('dy', '0.35em')
			.attr('text-anchor', 'end')
			.style('fill', v('ink'))
			.style('font-size', '15px')
			.style('font-weight', 700)
			.text((d) => d);

		BOARDS.forEach((b, i) => {
			const col = b.precise ? 0 : 1;
			const row = b.accurate ? 0 : 1;
			const g = root.append('g').attr('transform', `translate(${left + cellW * (col + 0.5)},${top + cellH * (row + 0.5)})`);
			[1, 0.75, 0.5, 0.25].forEach((f, k) =>
				g.append('circle')
					.attr('r', R * f)
					.style('fill', k % 2 ? v('surface') : v('grid'))
					.style('stroke', v('axis')),
			);
			g.append('circle').attr('r', R * 0.07).style('fill', v('muted'));
			g.selectAll('circle.dart')
				.data(THROWS[i])
				.join('circle')
				.attr('cx', (d) => d.x * R)
				.attr('cy', (d) => d.y * R)
				.attr('r', 5)
				.style('fill', v('series-1'))
				.style('stroke', v('surface'))
				.style('stroke-width', 1.5);
		});

		const stats = BOARDS.map((b, i) => {
			const t = THROWS[i];
			const mx = d3.mean(t, (d) => d.x)!;
			const my = d3.mean(t, (d) => d.y)!;
			return {
				name: b.name,
				off: Math.hypot(mx, my),
				spread: d3.mean(t, (d) => Math.hypot(d.x - mx, d.y - my))!,
			};
		});
		dataTable(
			el,
			[
				{ label: 'Board', value: (d) => d.name },
				{ label: 'Average dart’s distance from bullseye (board radius = 1)', value: (d) => d.off.toFixed(2), numeric: true },
				{ label: 'Spread around their own average', value: (d) => d.spread.toFixed(2), numeric: true },
			],
			stats,
		);
	},
};

export default figure;
