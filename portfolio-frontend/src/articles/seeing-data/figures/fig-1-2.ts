import * as d3 from 'd3';
import { controls, dataTable, fmt, gridY, styleAxis, svg, toggle, v, type Figure } from './lib';

// Anscombe 1973, Table 1. Sets I-III share their x values.
const X = [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5];
const SETS = [
	{ name: 'I', x: X, y: [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68] },
	{ name: 'II', x: X, y: [9.14, 8.14, 8.74, 8.77, 9.26, 8.1, 6.13, 3.1, 9.13, 7.26, 4.74] },
	{ name: 'III', x: X, y: [7.46, 6.77, 12.74, 7.11, 7.81, 8.84, 6.08, 5.39, 8.15, 6.42, 5.73] },
	{ name: 'IV', x: [8, 8, 8, 8, 8, 8, 8, 19, 8, 8, 8], y: [6.58, 5.76, 7.71, 8.84, 8.47, 7.04, 5.25, 12.5, 5.56, 7.91, 6.89] },
];

function stats(x: number[], y: number[]) {
	const mx = d3.mean(x)!;
	const my = d3.mean(y)!;
	const vx = d3.variance(x)!;
	const vy = d3.variance(y)!;
	const cov = d3.sum(x, (xi, i) => (xi - mx) * (y[i] - my)) / (x.length - 1);
	const slope = cov / vx;
	return { mx, my, vx, vy, r: cov / Math.sqrt(vx * vy), slope, intercept: my - slope * mx };
}

const figure: Figure = {
	title: 'Anscombe’s quartet',
	caption:
		'Four datasets of eleven points each. The numbers under the plots are computed from the data: the same means, correlation and regression line, and variances that differ by at most 0.01. Only the pictures differ.',
	credit: 'Data: Anscombe 1973.',
	mount(el) {
		const W = 320;
		const H = 240;
		const m = { top: 28, right: 18, bottom: 30, left: 36 };
		const iw = W - m.left - m.right;
		const ih = H - m.top - m.bottom;
		const x = d3.scaleLinear().domain([2, 20]).range([0, iw]);
		const y = d3.scaleLinear().domain([2, 14]).range([ih, 0]);
		const all = SETS.map((s) => ({ ...s, st: stats(s.x, s.y) }));

		const row = controls(el);
		const grid = document.createElement('div');
		grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 8px 16px;';
		el.append(grid);

		const lines: d3.Selection<SVGLineElement, unknown, null, undefined>[] = [];
		for (const s of all) {
			const cell = document.createElement('div');
			grid.append(cell);
			const root = svg(cell, W, H, `Dataset ${s.name}: scatterplot of ${s.x.length} points.`);
			const g = root.append('g').attr('transform', `translate(${m.left},${m.top})`);
			gridY(g.append('g'), y, iw, 4);
			styleAxis(g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).ticks(5)));
			styleAxis(g.append('g').call(d3.axisLeft(y).ticks(4)));
			root.append('text')
				.attr('x', m.left)
				.attr('y', 18)
				.style('fill', v('ink'))
				.style('font-size', '14px')
				.style('font-weight', '700')
				.text(`Dataset ${s.name}`);
			lines.push(
				g.append('line')
					.attr('x1', x(3))
					.attr('x2', x(19.5))
					.attr('y1', y(s.st.intercept + s.st.slope * 3))
					.attr('y2', y(s.st.intercept + s.st.slope * 19.5))
					.style('stroke', v('muted'))
					.style('stroke-width', 2)
					.style('stroke-dasharray', '5 4'),
			);
			g.append('g')
				.selectAll('circle')
				.data(s.x.map((xi, i) => [xi, s.y[i]]))
				.join('circle')
				.attr('cx', (d) => x(d[0]))
				.attr('cy', (d) => y(d[1]))
				.attr('r', 5)
				.style('fill', v('series-1'))
				.style('stroke', v('surface'))
				.style('stroke-width', 1);
		}

		toggle(row, 'Show the regression line', (on) => lines.forEach((l) => l.style('display', on ? 'inline' : 'none')), true);

		// The shared statistics, visible rather than tucked in the data table.
		const table = document.createElement('table');
		table.style.cssText = 'margin: 12px 0 0; font-size: 14px; font-variant-numeric: tabular-nums; width: auto;';
		const head = table.createTHead().insertRow();
		for (const h of ['', ...all.map((s) => `Dataset ${s.name}`)]) {
			const th = document.createElement('th');
			th.scope = 'col';
			th.textContent = h;
			th.style.textAlign = h ? 'right' : 'left';
			head.append(th);
		}
		const body = table.createTBody();
		const rows: [string, (st: ReturnType<typeof stats>) => string][] = [
			['Mean of x', (st) => fmt.num(st.mx)],
			['Variance of x', (st) => fmt.num(st.vx)],
			['Mean of y', (st) => fmt.num(st.my)],
			['Variance of y', (st) => fmt.num(st.vy)],
			['Correlation', (st) => fmt.num(st.r)],
			['Regression line', (st) => `y = ${fmt.num(st.intercept)} + ${fmt.num(st.slope)}x`],
		];
		for (const [label, f] of rows) {
			const tr = body.insertRow();
			const th = document.createElement('th');
			th.scope = 'row';
			th.textContent = label;
			th.style.cssText = 'text-align: left; font-weight: 400;';
			tr.append(th);
			for (const s of all) {
				const td = tr.insertCell();
				td.textContent = f(s.st);
				td.style.textAlign = 'right';
			}
		}
		const wrap = document.createElement('div');
		wrap.style.overflowX = 'auto';
		wrap.append(table);
		el.append(wrap);

		dataTable(
			el,
			[
				{ label: 'Point', value: (d) => d.i + 1, numeric: true },
				...all.flatMap((s) => [
					{ label: `${s.name} x`, value: (d: { i: number }) => s.x[d.i], numeric: true },
					{ label: `${s.name} y`, value: (d: { i: number }) => s.y[d.i], numeric: true },
				]),
			],
			X.map((_, i) => ({ i })),
		);
	},
};

export default figure;
