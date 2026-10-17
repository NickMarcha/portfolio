import * as d3 from 'd3';
import { button, controls, dataTable, readout, select, svg, v, type Figure } from './lib';

// Made-up shares that are close together. Pie order is alphabetical, not sorted.
const DATA = [
	{ label: 'A', value: 21 },
	{ label: 'B', value: 19 },
	{ label: 'C', value: 23 },
	{ label: 'D', value: 17 },
	{ label: 'E', value: 20 },
];
const SORTED = [...DATA].sort((a, b) => b.value - a.value);
const ANSWER = SORTED[1].label;

const figure: Figure = {
	title: 'Find the second-biggest slice',
	caption:
		'Five shares between 17% and 23%. In the pie you have to compare angles and areas, and the ranking is a guess. Sorted bars on a common baseline make the order obvious.',
	credit: 'Made-up values. After Skau and Kosara 2016.',
	mount(el) {
		const PW = 310;
		const H = 284;
		const R = 105;

		const row = controls(el);
		const guess = select(
			row,
			'Second biggest slice',
			[{ value: '', label: 'Pick one' }, ...DATA.map((d) => ({ value: d.label, label: d.label }))],
			() => {},
			'',
		);
		const reveal = button(row, 'Show as sorted bars', () => show());

		const wrap = document.createElement('div');
		wrap.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 8px 24px;';
		el.append(wrap);
		const pieCell = document.createElement('div');
		const barCell = document.createElement('div');
		wrap.append(pieCell, barCell);
		const root = svg(pieCell, PW, H, 'Pie chart of five slices labelled A to E, with similar sizes. A sorted bar chart of the same values appears after you answer.');
		root.style('margin', '0 auto');
		const pie = root.append('g').attr('transform', `translate(${PW / 2},${H / 2 + 6})`);
		const arcs = d3.pie<(typeof DATA)[number]>().value((d) => d.value).sort(null)(DATA);
		const arc = d3.arc<d3.PieArcDatum<(typeof DATA)[number]>>().innerRadius(0).outerRadius(R);
		const outer = d3.arc<d3.PieArcDatum<(typeof DATA)[number]>>().innerRadius(R + 16).outerRadius(R + 16);
		pie.selectAll('path')
			.data(arcs)
			.join('path')
			.attr('d', arc)
			.style('fill', v('series-1'))
			.style('stroke', v('surface'))
			.style('stroke-width', 2);
		pie.selectAll('text')
			.data(arcs)
			.join('text')
			.attr('transform', (d) => `translate(${outer.centroid(d)})`)
			.attr('text-anchor', 'middle')
			.attr('dy', '0.35em')
			.style('fill', v('ink'))
			.style('font-size', '15px')
			.style('font-weight', '600')
			.text((d) => d.data.label);

		const bw = PW - 40 - 50;
		const barSvg = svg(barCell, PW, H, 'Sorted bar chart of the same five values.');
		barSvg.style('margin', '0 auto');
		barCell.hidden = true;
		const bars = barSvg.append('g').attr('transform', 'translate(40,40)');
		const y = d3
			.scaleBand()
			.domain(SORTED.map((d) => d.label))
			.range([0, H - 70])
			.padding(0.25);
		const x = d3.scaleLinear().domain([0, 25]).range([0, bw]);
		bars.append('text')
			.attr('x', 0)
			.attr('y', -16)
			.style('fill', v('muted'))
			.style('font-size', '13px')
			.text('Same values, sorted');
		bars.selectAll('rect')
			.data(SORTED)
			.join('rect')
			.attr('x', 0)
			.attr('y', (d) => y(d.label)!)
			.attr('height', y.bandwidth())
			.attr('width', (d) => x(d.value))
			.attr('rx', 2)
			.style('fill', v('series-1'));
		bars.selectAll('text.name')
			.data(SORTED)
			.join('text')
			.attr('class', 'name')
			.attr('x', -8)
			.attr('y', (d) => y(d.label)! + y.bandwidth() / 2)
			.attr('dy', '0.35em')
			.attr('text-anchor', 'end')
			.style('fill', v('ink'))
			.style('font-size', '15px')
			.style('font-weight', '600')
			.text((d) => d.label);
		bars.selectAll('text.val')
			.data(SORTED)
			.join('text')
			.attr('class', 'val')
			.attr('x', (d) => x(d.value) + 6)
			.attr('y', (d) => y(d.label)! + y.bandwidth() / 2)
			.attr('dy', '0.35em')
			.style('fill', v('ink'))
			.style('font-size', '13px')
			.text((d) => `${d.value}%`);
		bars.append('line')
			.attr('y1', 0)
			.attr('y2', H - 70)
			.style('stroke', v('axis'));

		const out = readout(el);
		let shown = false;
		function show() {
			shown = true;
			barCell.hidden = false;
			reveal.disabled = true;
			const g = guess.value;
			out.textContent =
				(g ? (g === ANSWER ? `Yes, ${ANSWER} is second. ` : `Not ${g}: it is ${ANSWER}. `) : `It is ${ANSWER}. `) +
				`${ANSWER} is ${SORTED[1].value}% against ${SORTED[2].label}’s ${SORTED[2].value}%, a gap the bars show at once.`;
			table();
		}
		guess.addEventListener('change', () => {
			if (guess.value) show();
		});

		function table() {
			if (!shown) return;
			dataTable(
				el,
				[
					{ label: 'Slice', value: (d: (typeof DATA)[number]) => d.label },
					{ label: 'Share (%)', value: (d) => d.value, numeric: true },
				],
				SORTED,
			);
		}
	},
};

export default figure;
