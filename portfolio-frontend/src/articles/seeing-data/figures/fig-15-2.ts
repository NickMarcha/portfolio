import * as d3 from 'd3';
import { SERIES, controls, dataTable, gridY, isNarrow, readout, select, styleAxis, svg, v, type Figure } from './lib';

// Made-up numbers: cups of coffee sold per day at four cafés, by month.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CAFES = [
	{ name: 'Library', values: [410, 430, 420, 400, 360, 220, 150, 210, 420, 440, 450, 380] },
	{ name: 'Harbour', values: [180, 190, 230, 290, 360, 430, 470, 450, 330, 250, 200, 210] },
	{ name: 'Station', values: [300, 310, 305, 300, 310, 290, 260, 270, 300, 310, 320, 330] },
	{ name: 'Market', values: [240, 230, 260, 280, 320, 340, 300, 310, 270, 220, 200, 260] },
];

type Mode = 'labels' | 'legend';

const figure: Figure = {
	title: 'Legend or direct labels',
	caption:
		'The same four lines, named two ways. With a legend, you match each color to its line by looking back and forth. With the name written at the end of each line, you just read it.',
	credit: 'Made-up data. Advice from Franconeri et al. 2021.',
	mount(el) {
		// Phone: full width, the legend sits above the chart in two columns, fewer month ticks.
		const narrow = isNarrow(el);
		const W = narrow ? el.clientWidth : 680;
		const H = 340;
		const m = narrow ? { top: 60, right: 62, bottom: 32, left: 40 } : { top: 16, right: 96, bottom: 32, left: 48 };
		const iw = W - m.left - m.right;
		const ih = H - m.top - m.bottom;

		const row = controls(el);
		const root = svg(el, W, H, 'Line chart of daily coffee sales at four made-up cafés over a year. Library sales dip in summer, Harbour sales peak in summer, Station stays flat around 300, Market rises a little in early summer.');
		const g = root.append('g').attr('transform', `translate(${m.left},${m.top})`);
		const x = d3.scalePoint().domain(MONTHS).range([0, iw]);
		const y = d3.scaleLinear().domain([0, 500]).range([ih, 0]);
		gridY(g.append('g'), y, iw);
		styleAxis(g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).tickSizeOuter(0).tickValues(narrow ? MONTHS.filter((_, i) => i % 3 === 0) : MONTHS)));
		styleAxis(g.append('g').call(d3.axisLeft(y).ticks(5)));

		const line = d3
			.line<number>()
			.x((_, i) => x(MONTHS[i])!)
			.y((d) => y(d));
		g.append('g')
			.selectAll('path')
			.data(CAFES)
			.join('path')
			.attr('d', (d) => line(d.values))
			.style('fill', 'none')
			.style('stroke', (_, i) => SERIES[i])
			.style('stroke-width', 2);

		// Direct labels at the line ends, nudged apart so they never overlap.
		const ends = CAFES.map((c, i) => ({ name: c.name, i, y: y(c.values[11]) })).sort((a, b) => a.y - b.y);
		for (let k = 1; k < ends.length; k++) ends[k].y = Math.max(ends[k].y, ends[k - 1].y + 16);
		const direct = g.append('g');
		direct
			.selectAll('text')
			.data(ends)
			.join('text')
			.attr('x', iw + 8)
			.attr('y', (d) => d.y)
			.attr('dy', '0.35em')
			.style('fill', v('ink'))
			.style('font-size', '13px')
			.text((d) => d.name);

		const legend = g.append('g').attr('transform', narrow ? 'translate(8,-46)' : `translate(${iw + 16},8)`);
		legend
			.append('rect')
			.attr('x', -8)
			.attr('y', -6)
			.attr('width', narrow ? 184 : 84)
			.attr('height', (narrow ? 2 : CAFES.length) * 18 + 8)
			.attr('rx', 4)
			.style('fill', v('surface'))
			.style('stroke', v('axis'));
		const item = legend
			.selectAll('g')
			.data(CAFES)
			.join('g')
			.attr('transform', (_, i) => (narrow ? `translate(${(i % 2) * 92},${Math.floor(i / 2) * 18 + 6})` : `translate(0,${i * 18 + 6})`));
		item
			.append('line')
			.attr('x1', 0)
			.attr('x2', 18)
			.style('stroke', (_, i) => SERIES[i])
			.style('stroke-width', 3);
		item
			.append('text')
			.attr('x', 26)
			.attr('dy', '0.35em')
			.style('fill', v('ink'))
			.style('font-size', '13px')
			.text((d) => d.name);

		const out = readout(el);
		function show(mode: Mode) {
			direct.style('display', mode === 'labels' ? '' : 'none');
			legend.style('display', mode === 'legend' ? '' : 'none');
			out.textContent =
				mode === 'legend'
					? 'Legend: which line is Market? Find its color in the box, then hunt for that color among the lines.'
					: 'Direct labels: each name sits at the end of its own line, so there is nothing to match up.';
		}
		select<Mode>(
			row,
			'Name the lines with',
			[
				{ value: 'labels', label: 'Direct labels' },
				{ value: 'legend', label: 'A legend' },
			],
			show,
			'legend',
		);
		show('legend');

		dataTable(
			el,
			[
				{ label: 'Month', value: (r) => r.month },
				...CAFES.map((c, i) => ({ label: c.name, value: (r: { i: number }) => c.values[r.i], numeric: true })),
			],
			MONTHS.map((month, i) => ({ month, i })),
		);
	},
};

export default figure;
