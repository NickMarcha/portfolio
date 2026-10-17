import * as d3 from 'd3';
import { dataTable, gridY, styleAxis, svg, v, type Figure } from './lib';

const DATA = [
	{ fruit: 'Apples', sold: 42 },
	{ fruit: 'Oranges', sold: 28 },
	{ fruit: 'Bananas', sold: 35 },
	{ fruit: 'Pears', sold: 18 },
	{ fruit: 'Grapes', sold: 24 },
];

const figure: Figure = {
	title: 'A line between categories invents a trend',
	caption:
		'The same five numbers twice. The line implies you can read between apples and oranges, and that something rises and falls along the way. Bars say these are separate things.',
	credit: 'Made-up data.',
	mount(el) {
		const PW = 330;
		const H = 270;
		const m = { top: 40, bottom: 32, left: 34, right: 6 };
		const ih = H - m.top - m.bottom;
		const wrap = document.createElement('div');
		wrap.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 12px 24px;';
		el.append(wrap);
		const x = d3
			.scaleBand()
			.domain(DATA.map((d) => d.fruit))
			.range([0, PW - m.left - m.right])
			.padding(0.3);
		const y = d3.scaleLinear().domain([0, 45]).range([ih, 0]);

		// On the line, label low points underneath so the text doesn't sit on the line.
		const valley = (j: number) =>
			(j === 0 || DATA[j - 1].sold > DATA[j].sold) && (j === DATA.length - 1 || DATA[j + 1].sold > DATA[j].sold);

		[0, 1].forEach((i) => {
			const cell = document.createElement('div');
			wrap.append(cell);
			const root = svg(
				cell,
				PW,
				H,
				i === 0
					? 'Fruit sold per day drawn as a line connecting the five fruits: apples 42, oranges 28, bananas 35, pears 18, grapes 24.'
					: 'The same fruit sales drawn as five separate bars.',
			);
			root.style('margin', '0 auto');
			const g = root.append('g').attr('transform', `translate(${m.left},${m.top})`);
			gridY(g.append('g'), y, PW - m.left - m.right, 3);
			styleAxis(g.append('g').call(d3.axisLeft(y).ticks(3).tickSize(0).tickPadding(6))).select('.domain').remove();
			styleAxis(g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).tickSize(0).tickPadding(8)));
			g.append('text')
				.attr('x', 0)
				.attr('y', -18)
				.style('fill', v('ink'))
				.style('font-size', '14px')
				.style('font-weight', '600')
				.text(i === 0 ? '✗ As a line: implies a trend' : '✓ As bars: separate categories');
			const cx = (d: (typeof DATA)[number]) => x(d.fruit)! + x.bandwidth() / 2;
			if (i === 0) {
				g.append('path')
					.attr('d', d3.line<(typeof DATA)[number]>(cx, (d) => y(d.sold))(DATA))
					.style('fill', 'none')
					.style('stroke', v('muted'))
					.style('stroke-width', 2);
				g.selectAll('circle')
					.data(DATA)
					.join('circle')
					.attr('cx', cx)
					.attr('cy', (d) => y(d.sold))
					.attr('r', 4.5)
					.style('fill', v('muted'));
			} else {
				g.selectAll('rect')
					.data(DATA)
					.join('rect')
					.attr('x', (d) => x(d.fruit)!)
					.attr('width', x.bandwidth())
					.attr('y', (d) => y(d.sold))
					.attr('height', (d) => ih - y(d.sold))
					.attr('rx', 2)
					.style('fill', v('series-1'));
			}
			g.selectAll('text.val')
				.data(DATA)
				.join('text')
				.attr('class', 'val')
				.attr('x', cx)
				.attr('y', (d, j) => (i === 0 && valley(j) ? y(d.sold) + 20 : y(d.sold) - 9))
				.attr('text-anchor', 'middle')
				.style('fill', v('ink'))
				.style('font-size', '12px')
				.text((d) => d.sold);
		});

		dataTable(
			el,
			[
				{ label: 'Fruit', value: (d: (typeof DATA)[number]) => d.fruit },
				{ label: 'Sold per day', value: (d) => d.sold, numeric: true },
			],
			DATA,
		);
	},
};

export default figure;
