import * as d3 from 'd3';
import { dataTable, fmt, isNarrow, readout, svg, tooltip, v, viridis, type Figure } from './lib';
import data from './data/8-3-oslo-od.json';

// Phone labels; the key above the matrix spells them out.
const CODE: Record<string, string> = {
	Grünerløkka: 'Grü',
	Sentrum: 'Sen',
	Frogner: 'Fro',
	'St. Hanshaugen': 'StH',
	'Gamle Oslo': 'GOs',
	Sagene: 'Sag',
	'Nordre Aker': 'NAk',
	Ullern: 'Ull',
	'Vestre Aker': 'VAk',
	Bjerke: 'Bje',
	Alna: 'Aln',
};

const short = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

const figure: Figure = {
	title: 'Bike trips between Oslo’s districts',
	caption:
		'Every Oslo Bysykkel trip in 2025, counted by the district where it started (rows) and the district where it ended (columns). Read across a row to see where trips from one district go. The diagonal is trips that start and end in the same district. The color scale is logarithmic, because the busiest cell has tens of thousands of times more trips than the quietest.',
	credit:
		'Data: Oslo Bysykkel, NLOD. Rebuilt from the origin-destination matrix in Oslo on Two Wheels (INF252 team project), nickmarcha.github.io/INF252-Course-Project.',
	mount(el) {
		const names = data.districts;
		const M = data.matrix;
		const n = names.length;
		// Phone: short district codes, no numbers in the (too small) cells; tap a cell for its count.
		const narrow = isNarrow(el);
		const left = narrow ? 36 : 124;
		const top = narrow ? 50 : 112;
		const W = narrow ? el.clientWidth : 660;
		const cell = narrow ? Math.floor((W - left - 2) / n) : 40;
		const side = n * cell;
		const H = top + side + (narrow ? 100 : 64);
		const label = (d: string) => (narrow ? (CODE[d] ?? d) : d);
		if (narrow) {
			const key = document.createElement('p');
			key.className = 'viz-readout';
			key.textContent = names.map((d) => `${CODE[d] ?? d} ${d}`).join(' · ');
			el.append(key);
		}

		const cells = names.flatMap((from, i) => names.map((to, j) => ({ i, j, from, to, value: M[i][j] })));
		const max = d3.max(cells, (c) => c.value)!;
		const color = d3.scaleSequentialLog(viridis).domain([1, max]);
		const total = d3.sum(cells, (c) => c.value);

		const root = svg(
			el,
			W,
			H,
			`Origin-destination matrix of ${fmt.int(total)} Oslo city bike trips in 2025 between ${n} city districts.`,
		);
		const g = root.append('g').attr('transform', `translate(${left},${top})`);
		const tip = tooltip(el);

		const cg = g
			.selectAll('g.cell')
			.data(cells)
			.join('g')
			.attr('class', 'cell')
			.attr('transform', (d) => `translate(${d.j * cell},${d.i * cell})`)
			.on('pointermove', (e, d) =>
				tip.show(`From <strong>${d.from}</strong> to <strong>${d.to}</strong><br>${fmt.int(d.value)} trips`, e),
			)
			.on('pointerleave', () => tip.hide())
			.on('click', (_, d) => {
				if (narrow) pickText.text(`${d.from} to ${d.to}: ${fmt.int(d.value)} trips`);
			});
		cg.append('rect')
			.attr('width', cell - 1)
			.attr('height', cell - 1)
			.style('fill', (d) => (d.value ? color(d.value) : v('grid')));
		// Fixed light or dark ink on the viridis cell, whichever reads better; viridis is the same in both themes.
		if (!narrow) cg.append('text')
			.attr('x', (cell - 1) / 2)
			.attr('y', (cell - 1) / 2)
			.attr('dy', '0.35em')
			.attr('text-anchor', 'middle')
			.style('font-size', '12px')
			.style('fill', (d) =>
				d.value === 0 ? v('muted') : d3.lab(color(d.value)).l > 60 ? '#1a1a1a' : '#ffffff',
			)
			.text((d) => (d.value ? short(d.value) : '0'));

		g.append('g')
			.selectAll('text')
			.data(names)
			.join('text')
			.attr('x', narrow ? -5 : -8)
			.attr('y', (_, i) => i * cell + cell / 2)
			.attr('dy', '0.35em')
			.attr('text-anchor', 'end')
			.text(label);
		g.append('g')
			.selectAll('text')
			.data(names)
			.join('text')
			.attr('transform', (_, i) => `translate(${i * cell + cell / 2},${narrow ? -5 : -8}) rotate(${narrow ? -90 : -45})`)
			.attr('dy', '0.35em')
			.text(label);
		g.selectAll('g > g:not(.cell) text').style('fill', v('ink')).style('font-size', narrow ? '12px' : '13px');
		root.append('text')
			.attr('x', narrow ? 2 : 8)
			.attr('y', narrow ? 12 : top - 10)
			.text('From ↓  To →')
			.style('fill', v('muted'))
			.style('font-size', '12px');

		// Legend: the log ramp with a few round ticks.
		const lw = narrow ? W - 40 : 260;
		const lg = root.append('g').attr('transform', `translate(${narrow ? 16 : left},${top + side + (narrow ? 36 : 18)})`);
		const grad = root
			.append('defs')
			.append('linearGradient')
			.attr('id', 'fig83-ramp');
		d3.range(0, 1.01, 0.1).forEach((t) =>
			grad.append('stop').attr('offset', `${t * 100}%`).attr('stop-color', viridis(t)),
		);
		lg.append('rect').attr('width', lw).attr('height', 10).attr('fill', 'url(#fig83-ramp)');
		const ls = d3.scaleLog().domain([1, max]).range([0, lw]);
		lg.selectAll('text')
			.data([1, 10, 100, 1000, 10000])
			.join('text')
			.attr('x', (d) => ls(d))
			.attr('y', 26)
			.attr('text-anchor', 'middle')
			.style('fill', v('muted'))
			.style('font-size', '12px')
			.text((d) => fmt.int(d));
		lg.append('text')
			.attr('x', narrow ? 0 : lw + 12)
			.attr('y', narrow ? -8 : 9)
			.style('fill', v('muted'))
			.style('font-size', '12px')
			.text('trips (log scale)');

		const pickText = root
			.append('text')
			.attr('x', 2)
			.attr('y', H - 10)
			.style('fill', v('ink'))
			.style('font-size', '13px')
			.text(narrow ? 'Tap a cell to see its trip count.' : '');

		const within = d3.sum(d3.range(n), (i) => M[i][i]);
		const cross = cells.filter((c) => c.i !== c.j).sort((a, b) => b.value - a.value)[0];
		readout(el).textContent =
			`${fmt.pct(within / total)} of the ${fmt.int(total)} trips start and end in the same district. ` +
			`The busiest pair of different districts is ${cross.from} to ${cross.to}, with ${fmt.int(cross.value)} trips. ` +
			`The outer districts at the bottom have only a few stations, so their rows and columns are nearly empty.`;

		dataTable(
			el,
			[
				{ label: 'From', value: (d: (typeof cells)[number]) => d.from },
				{ label: 'To', value: (d) => d.to },
				{ label: 'Trips', value: (d) => d.value, numeric: true },
			],
			cells.filter((c) => c.value > 0).sort((a, b) => b.value - a.value),
		);
	},
};

export default figure;
