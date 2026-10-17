import * as d3 from 'd3';
import { controls, dataTable, gridY, isNarrow, readout, slider, styleAxis, svg, v, type Figure } from './lib';

const DATA = [
	{ label: 'Sign-ups', value: 6 },
	{ label: 'Target', value: 7 },
];

const figure: Figure = {
	title: 'Moving the baseline',
	caption:
		'The same two numbers, 6 million sign-ups against a 7 million target. The higher the axis starts, the bigger the gap looks. The lie factor compares the gap the bars show with the real one.',
	credit: 'Example from Franconeri et al. 2021. Lie factor after Tufte 1983.',
	mount(el) {
		const narrow = isNarrow(el);
		const W = narrow ? el.clientWidth : 560;
		const H = 300;
		const m = narrow ? { top: 20, right: 8, bottom: 36, left: 44 } : { top: 20, right: 20, bottom: 36, left: 56 };
		const iw = W - m.left - m.right;
		const ih = H - m.top - m.bottom;

		const row = controls(el);
		const root = svg(el, W, H, 'Bar chart of 6 million sign-ups against a 7 million target.');
		const g = root.append('g').attr('transform', `translate(${m.left},${m.top})`);
		const grid = g.append('g');
		const yAxis = g.append('g');
		const x = d3
			.scaleBand()
			.domain(DATA.map((d) => d.label))
			.range([0, iw])
			.padding(narrow ? 0.3 : 0.45);
		styleAxis(g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).tickSize(0)))
			.selectAll('.tick text')
			.style('fill', v('ink'))
			.style('font-size', '14px')
			.attr('dy', '1.2em');
		const bars = g.append('g');
		const labels = g.append('g');
		const out = readout(el);

		function draw(base: number) {
			const y = d3.scaleLinear().domain([base, 7.2]).range([ih, 0]);
			gridY(grid, y, iw);
			styleAxis(yAxis.call(d3.axisLeft(y).ticks(5).tickFormat((d) => (d === 0 ? '0' : `${d}M`))));
			bars
				.selectAll('rect')
				.data(DATA)
				.join('rect')
				.attr('x', (d) => x(d.label)!)
				.attr('width', x.bandwidth())
				.attr('y', (d) => y(d.value))
				.attr('height', (d) => ih - y(d.value))
				.attr('rx', 2)
				.style('fill', (_, i) => (i === 0 ? v('series-1') : v('dim')));
			labels
				.selectAll('text')
				.data(DATA)
				.join('text')
				.attr('x', (d) => x(d.label)! + x.bandwidth() / 2)
				.attr('y', (d) => y(d.value) - 6)
				.attr('text-anchor', 'middle')
				.style('fill', v('ink'))
				.style('font-size', '14px')
				.text((d) => `${d.value} million`);

			// Effect shown: how much taller the target bar looks. Effect in data: 7/6.
			const shown = (7 - base) / (6 - base);
			const real = 7 / 6;
			const lie = (shown - 1) / (real - 1);
			out.textContent =
				base === 0
					? `Axis starts at zero. The target bar is ${shown.toFixed(2)} times as tall as the sign-ups bar, the same as the data. Lie factor 1.`
					: `Axis starts at ${base} million. The target bar now looks ${shown.toFixed(2)} times as tall, against a real ratio of ${real.toFixed(2)}. Lie factor ${lie.toFixed(1)}.`;
		}

		slider(
			row,
			'Axis starts at',
			{ min: 0, max: 5.5, step: 0.5, value: 0, format: (n) => `${n}M` },
			draw,
		);
		draw(0);
		dataTable(
			el,
			[
				{ label: 'Bar', value: (d) => d.label },
				{ label: 'Millions', value: (d) => d.value, numeric: true },
			],
			DATA,
		);
	},
};

export default figure;
