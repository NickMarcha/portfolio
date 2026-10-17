import * as d3 from 'd3';
import { controls, dataTable, fmt, isNarrow, readout, select, svg, tooltip, v, type Figure } from './lib';
import data from './data/8-4-west-migration.json';

const CODE: Record<string, string> = {
	Washington: 'WA',
	Oregon: 'OR',
	California: 'CA',
	Nevada: 'NV',
	Idaho: 'ID',
	Utah: 'UT',
	Arizona: 'AZ',
};

type Flow = (typeof data.flows)[number];

const figure: Figure = {
	title: 'A small kriskogram of moves between western states',
	caption:
		'Seven western US states sit on one line, roughly west to east. Each arc stands for the people who moved from one state to another in 2023, and its width shows how many. Arcs above the line run left to right (eastward); arcs below run right to left (westward).',
	credit:
		'Data: U.S. Census Bureau, American Community Survey 2023 1-year state-to-state migration flows (public domain). Kriskogram after Xiao and Chun 2009.',
	mount(el) {
		// Phone: the same line at 1 unit = 1px, states closer together and arcs a little thinner.
		const narrow = isNarrow(el);
		const W = narrow ? el.clientWidth : 680;
		const H = narrow ? Math.round(W * 0.68 + 90) : 470;
		const axisY = narrow ? H / 2 : 236;
		const states = data.states;
		const x = d3.scalePoint().domain(states).range(narrow ? [22, W - 22] : [56, W - 56]);
		const squash = 0.68; // flatten the semicircles so the widest arc fits
		const width = d3.scaleLinear().domain([0, d3.max(data.flows, (f) => f.n)!]).range([0, narrow ? 11 : 16]);
		const east = (f: Flow) => x(f.to)! > x(f.from)!;

		const row = controls(el);
		const root = svg(
			el,
			W,
			H,
			'Kriskogram of 2023 migration between Washington, Oregon, California, Nevada, Idaho, Utah and Arizona. Eastward moves arc above the line, westward moves below.',
		);
		const tip = tooltip(el);

		root.append('line')
			.attr('x1', narrow ? 2 : 20)
			.attr('x2', W - (narrow ? 2 : 20))
			.attr('y1', axisY)
			.attr('y2', axisY)
			.style('stroke', v('axis'));
		const notes = root.append('g').style('font-size', '13px').style('fill', v('muted'));
		notes
			.append('text')
			.attr('x', narrow ? 2 : 8)
			.attr('y', 18)
			.text(narrow ? 'Above: moving east →' : 'Above the line: moving east, left to right →');
		notes
			.append('text')
			.attr('x', narrow ? 2 : 8)
			.attr('y', H - 8)
			.text(narrow ? '← Below: moving west' : '← Below the line: moving west, right to left');

		// Clockwise arcs (sweep 1): a left-to-right flow bulges up, a right-to-left flow bulges down.
		const arcPath = (f: Flow) => {
			const a = x(f.from)!;
			const b = x(f.to)!;
			const r = Math.abs(b - a) / 2;
			return `M${a},${axisY} A${r},${r * squash} 0 0 1 ${b},${axisY}`;
		};
		const arcs = root
			.append('g')
			.style('fill', 'none')
			.selectAll('path')
			.data([...data.flows].sort((a, b) => b.n - a.n))
			.join('path')
			.attr('d', arcPath)
			.style('stroke-width', (d) => `${Math.max(1, width(d.n))}px`)
			.on('pointermove', (e, d) =>
				tip.show(`<strong>${d.from} → ${d.to}</strong><br>${fmt.int(d.n)} people (± ${fmt.int(d.moe)})`, e),
			)
			.on('pointerleave', () => tip.hide());

		const nodes = root
			.append('g')
			.selectAll('g')
			.data(states)
			.join('g')
			.attr('transform', (d) => `translate(${x(d)},${axisY})`);
		nodes
			.append('rect')
			.attr('x', -17)
			.attr('y', -11)
			.attr('width', 34)
			.attr('height', 22)
			.attr('rx', 4)
			.style('fill', v('surface'))
			.style('stroke', v('axis'));
		nodes
			.append('text')
			.attr('dy', '0.35em')
			.attr('text-anchor', 'middle')
			.style('font-size', '13px')
			.style('font-weight', '700')
			.style('fill', v('ink'))
			.text((d) => CODE[d]);

		const out = readout(el);
		const link = document.createElement('p');
		link.className = 'viz-readout';
		link.innerHTML =
			'The full version, with all 50 states, ego focus and years overlaid: <a href="https://portfolio.nickmarcha.com/projects/kriskogram/">the interactive kriskogram explorer</a>.';
		el.append(link);

		function paint(focus: string) {
			const on = (f: Flow) => !focus || f.from === focus || f.to === focus;
			arcs
				.style('stroke', (d) => (!on(d) ? v('dim') : east(d) ? v('series-1') : v('series-2')))
				.style('stroke-opacity', (d) => (on(d) ? 0.6 : 0.18));
			arcs.filter(on).raise();
			if (!focus) {
				out.textContent =
					'The thickest arcs start in California: above the line toward Nevada and Arizona on its right, below the line toward Oregon and Washington on its left. Pick California to compare them with the thinner arcs coming back.';
				return;
			}
			const inn = d3.sum(data.flows.filter((f) => f.to === focus), (f) => f.n);
			const outn = d3.sum(data.flows.filter((f) => f.from === focus), (f) => f.n);
			const net = inn - outn;
			out.textContent = `${focus} gained ${fmt.int(inn)} people from the other six states and lost ${fmt.int(outn)} to them, a net ${net >= 0 ? 'gain' : 'loss'} of ${fmt.int(Math.abs(net))}. Arcs from states to its left that sit above the line, and arcs from states to its right that sit below, are people arriving.`;
		}

		select(
			row,
			'Focus on',
			[{ value: '', label: 'All seven states' }, ...states.map((s) => ({ value: s, label: s }))],
			paint,
			'',
		);
		paint('');

		dataTable(
			el,
			[
				{ label: 'From', value: (d: Flow) => d.from },
				{ label: 'To', value: (d) => d.to },
				{ label: 'Direction', value: (d) => (east(d) ? 'East, above' : 'West, below') },
				{ label: 'People', value: (d) => d.n, numeric: true },
				{ label: 'Margin of error', value: (d) => d.moe, numeric: true },
			],
			[...data.flows].sort((a, b) => b.n - a.n),
		);
	},
};

export default figure;
