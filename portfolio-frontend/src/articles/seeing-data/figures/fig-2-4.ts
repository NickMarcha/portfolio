import * as d3 from 'd3';
import { controls, dataTable, isNarrow, readout, rng, styleAxis, svg, toggle, v, viridis, type Figure } from './lib';

const DATA = [
	{ k: 'A', n: 21 },
	{ k: 'B', n: 34 },
	{ k: 'C', n: 46 },
	{ k: 'D', n: 62 },
	{ k: 'E', n: 84 },
];
const MAX = 100;

const figure: Figure = {
	title: 'Five numbers, five channels',
	caption:
		'The same five values drawn with position, length, angle, area and color, in the order of Cleveland and McGill’s ranking. Judging how many times bigger E is than A usually gets harder as you go down the list.',
	credit: 'After Cleveland and McGill 1984. Values made up.',
	mount(el) {
		const row = controls(el);
		const grid = document.createElement('div');
		grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr)); gap: 16px 24px;';
		el.append(grid);
		// Phone layout: panels stack; each SVG is as wide as the body so labels stay 12-13px,
		// and the circles and squares shrink to fit their spacing.
		const narrow = isNarrow(el);
		const W = narrow ? el.clientWidth : 300;
		const PAD = narrow ? 24 : 34;
		const step = (W - 2 * PAD) / (DATA.length - 1);
		const H = 200;
		const HS = 120; // shorter panels for the single-row charts
		const valueLabels: d3.Selection<d3.BaseType, (typeof DATA)[number], any, any>[] = [];

		function panel(title: string, label: string, height = H) {
			const cell = document.createElement('div');
			const h = document.createElement('p');
			h.style.cssText = 'margin: 0 0 4px; font-size: 14px; font-weight: 700;';
			h.textContent = title;
			cell.append(h);
			grid.append(cell);
			return svg(cell, W, height, label);
		}
		const ink = <T extends d3.BaseType, D>(s: d3.Selection<T, D, any, any>, size = 13) =>
			s.style('fill', v('ink')).style('font-size', `${size}px`);

		// 1. Position along a common scale
		{
			const root = panel('1. Position on a common scale', 'Dot plot of the five values on one shared axis.');
			const m = { top: 8, right: 16, bottom: 26, left: 24 };
			const x = d3.scaleLinear().domain([0, MAX]).range([m.left, W - m.right]);
			const y = d3.scaleBand().domain(DATA.map((d) => d.k)).range([m.top, H - m.bottom]).padding(0.2);
			styleAxis(root.append('g').attr('transform', `translate(0,${H - m.bottom})`).call(d3.axisBottom(x).ticks(5)));
			root.append('g')
				.selectAll('line')
				.data(DATA)
				.join('line')
				.attr('x1', m.left)
				.attr('x2', W - m.right)
				.attr('y1', (d) => y(d.k)! + y.bandwidth() / 2)
				.attr('y2', (d) => y(d.k)! + y.bandwidth() / 2)
				.style('stroke', v('grid'));
			root.append('g')
				.selectAll('circle')
				.data(DATA)
				.join('circle')
				.attr('cx', (d) => x(d.n))
				.attr('cy', (d) => y(d.k)! + y.bandwidth() / 2)
				.attr('r', 6)
				.style('fill', v('series-1'));
			ink(root.append('g').selectAll('text').data(DATA).join('text'))
				.attr('x', 4)
				.attr('y', (d) => y(d.k)! + y.bandwidth() / 2 + 5)
				.text((d) => d.k);
			valueLabels.push(
				ink(root.append('g').selectAll('text').data(DATA).join('text'), 12)
					.attr('x', (d) => x(d.n) + 10)
					.attr('y', (d) => y(d.k)! + y.bandwidth() / 2 + 4)
					.text((d) => d.n),
			);
		}

		// 2. Length, without a shared baseline so only length is left to compare
		{
			const root = panel('3. Length', 'Five bars of different lengths that start at different places.');
			const r = rng(7);
			const m = { top: 8, right: 16, bottom: 26, left: 24 };
			const len = d3.scaleLinear().domain([0, MAX]).range([0, 190]);
			const y = d3.scaleBand().domain(DATA.map((d) => d.k)).range([m.top, H - m.bottom]).padding(0.25);
			const off = DATA.map((d) => m.left + r() * (W - m.left - m.right - len(d.n)));
			root.append('g')
				.selectAll('rect')
				.data(DATA)
				.join('rect')
				.attr('x', (_, i) => off[i])
				.attr('y', (d) => y(d.k)!)
				.attr('width', (d) => len(d.n))
				.attr('height', y.bandwidth())
				.attr('rx', 2)
				.style('fill', v('series-1'));
			ink(root.append('g').selectAll('text').data(DATA).join('text'))
				.attr('x', 4)
				.attr('y', (d) => y(d.k)! + y.bandwidth() / 2 + 5)
				.text((d) => d.k);
			valueLabels.push(
				ink(root.append('g').selectAll('text').data(DATA).join('text'), 12)
					.attr('x', (d, i) => off[i] + len(d.n) / 2)
					.attr('y', (d) => y(d.k)! + y.bandwidth() / 2 + 4)
					.attr('text-anchor', 'middle')
					.style('fill', '#fff')
					.text((d) => d.n),
			);
		}

		// 3. Angle
		{
			const root = panel('4. Angle', 'Pie chart of the five values.');
			const g = root.append('g').attr('transform', `translate(${W / 2},${H / 2})`);
			const arcs = d3.pie<(typeof DATA)[number]>().value((d) => d.n).sort(null)(DATA);
			const arc = d3.arc<d3.PieArcDatum<(typeof DATA)[number]>>().innerRadius(0).outerRadius(78);
			const lab = d3.arc<d3.PieArcDatum<(typeof DATA)[number]>>().innerRadius(90).outerRadius(90);
			g.selectAll('path')
				.data(arcs)
				.join('path')
				.attr('d', arc)
				.style('fill', v('series-1'))
				.style('stroke', v('surface'))
				.style('stroke-width', 2);
			ink(g.selectAll('text.k').data(arcs).join('text'))
				.attr('transform', (d) => `translate(${lab.centroid(d)})`)
				.attr('text-anchor', 'middle')
				.attr('dy', '0.35em')
				.text((d) => d.data.k);
			valueLabels.push(
				ink(g.append('g').selectAll('text').data(DATA).join('text'), 12)
					.attr('transform', (_, i) => `translate(${arc.centroid(arcs[i])})`)
					.attr('text-anchor', 'middle')
					.attr('dy', '0.35em')
					.style('fill', '#fff')
					.text((d) => d.n),
			);
		}

		// 4. Area
		{
			const root = panel('5. Area', 'Five circles whose areas show the values.', HS);
			const rad = d3.scaleSqrt().domain([0, MAX]).range([0, Math.min(30, step * 0.48)]);
			const x = d3.scalePoint().domain(DATA.map((d) => d.k)).range([PAD, W - PAD]);
			root.append('g')
				.selectAll('circle')
				.data(DATA)
				.join('circle')
				.attr('cx', (d) => x(d.k)!)
				.attr('cy', 40)
				.attr('r', (d) => rad(d.n))
				.style('fill', v('series-1'));
			ink(root.append('g').selectAll('text').data(DATA).join('text'))
				.attr('x', (d) => x(d.k)!)
				.attr('y', 92)
				.attr('text-anchor', 'middle')
				.text((d) => d.k);
			valueLabels.push(
				ink(root.append('g').selectAll('text').data(DATA).join('text'), 12)
					.attr('x', (d) => x(d.k)!)
					.attr('y', 110)
					.attr('text-anchor', 'middle')
					.text((d) => d.n),
			);
		}

		// 5. Color intensity
		{
			const root = panel('6. Color intensity', 'Five squares whose color, from dark to light, shows the values.', HS);
			const x = d3.scalePoint().domain(DATA.map((d) => d.k)).range([PAD, W - PAD]);
			root.append('g')
				.selectAll('rect')
				.data(DATA)
				.join('rect')
				.attr('x', (d) => x(d.k)! - Math.min(44, step - 6) / 2)
				.attr('y', 48 - Math.min(44, step - 6) / 2)
				.attr('width', Math.min(44, step - 6))
				.attr('height', Math.min(44, step - 6))
				.attr('rx', 3)
				.style('fill', (d) => viridis(d.n / MAX));
			ink(root.append('g').selectAll('text').data(DATA).join('text'))
				.attr('x', (d) => x(d.k)!)
				.attr('y', 92)
				.attr('text-anchor', 'middle')
				.text((d) => d.k);
			valueLabels.push(
				ink(root.append('g').selectAll('text').data(DATA).join('text'), 12)
					.attr('x', (d) => x(d.k)!)
					.attr('y', 110)
					.attr('text-anchor', 'middle')
					.text((d) => d.n),
			);
		}

		const out = readout(el);
		const show = (on: boolean) => {
			valueLabels.forEach((s) => s.style('display', on ? 'inline' : 'none'));
			out.textContent = on ? `E is ${(DATA[4].n / DATA[0].n).toFixed(1)} times A in every panel.` : '';
		};
		toggle(row, 'Show the values', show);
		show(false);

		dataTable(
			el,
			[
				{ label: 'Item', value: (d) => d.k },
				{ label: 'Value', value: (d) => d.n, numeric: true },
			],
			DATA,
		);
	},
};

export default figure;
