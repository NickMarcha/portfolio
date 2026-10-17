import * as d3 from 'd3';
import { controls, dataTable, isNarrow, readout, reducedMotion, select, svg, tooltip, v, type Figure } from './lib';
import data from './data/8-1-miserables.json';

type Order = 'cluster' | 'name' | 'frequency';

const pretty = (s: string) => s.replace(/\.(?=\S)/g, '. ');

const NOTES: Record<Order, string> = {
	cluster:
		'Ordered by community: dense blocks line up along the diagonal. Each block is a group of characters who share chapters, the same groups that pulled together in the node-link drawing.',
	name: 'Ordered by name: the same links, scattered. Nothing about the alphabet groups characters, so no structure shows.',
	frequency:
		'Ordered by how often each character appears with others: the busiest characters crowd the top-left corner, but the separate groups blur together.',
};

const figure: Figure = {
	title: 'The same network as a grid',
	caption:
		'Each row and column is a character, and a filled cell means the two appear in the same chapter. Stronger color means more shared chapters. The blocks along the diagonal appear and vanish with the row order.',
	credit:
		'After Mike Bostock’s Les Misérables co-occurrence matrix (bost.ocks.org/mike/miserables). Data: D. E. Knuth, The Stanford GraphBase (1993), via vega-datasets.',
	mount(el) {
		// Phone: the matrix fills the width, and the highlighted name sits above it instead of to the left.
		const narrow = isNarrow(el);
		const W = narrow ? el.clientWidth : 680;
		const left = narrow ? 2 : 128;
		const top = narrow ? 30 : 44;
		const side = narrow ? W - 4 : 77 * 7;
		const H = narrow ? top + side + 34 : 616;

		const n = data.nodes.length;
		const names = data.nodes.map((d) => pretty(d.name));
		const weight = new Array(n).fill(0);
		const cells: { i: number; j: number; value: number }[] = [];
		for (const l of data.links) {
			weight[l.source] += l.value;
			weight[l.target] += l.value;
			cells.push({ i: l.source, j: l.target, value: l.value }, { i: l.target, j: l.source, value: l.value });
		}
		const idx = d3.range(n);
		const orders: Record<Order, number[]> = {
			name: [...idx].sort((a, b) => names[a].localeCompare(names[b])),
			frequency: [...idx].sort((a, b) => weight[b] - weight[a]),
			cluster: [...idx].sort((a, b) => data.nodes[a].group - data.nodes[b].group || weight[b] - weight[a]),
		};

		const row = controls(el);
		const root = svg(
			el,
			W,
			H,
			'Adjacency matrix of 77 Les Misérables characters. Filled cells mark pairs who appear in the same chapter.',
		);
		const g = root.append('g').attr('transform', `translate(${left},${top})`);
		const x = d3.scaleBand<number>().domain(orders.cluster).range([0, side]);
		const op = d3.scaleSqrt().domain([1, d3.max(cells, (c) => c.value)!]).range([0.3, 1]);
		g.append('rect').attr('width', side).attr('height', side).style('fill', v('grid'));
		const cellSel = g
			.append('g')
			.selectAll('rect')
			.data(cells)
			.join('rect')
			.attr('width', x.bandwidth() - 0.5)
			.attr('height', x.bandwidth() - 0.5)
			.style('fill-opacity', (d) => op(d.value));
		const bands = g.append('g').style('pointer-events', 'none');
		const rowBand = bands.append('rect').attr('x', -2).attr('width', side + 4).attr('height', x.bandwidth());
		const colBand = bands.append('rect').attr('y', -2).attr('height', side + 4).attr('width', x.bandwidth());
		bands
			.selectAll('rect')
			.style('fill', 'none')
			.style('stroke', v('highlight'))
			.style('stroke-width', '1.5px');
		const rowLabel = g.append('text').attr('x', -8).attr('dy', '0.35em').attr('text-anchor', 'end');
		const colLabel = g.append('text').attr('y', -10).attr('text-anchor', 'middle');
		g.selectAll('text').style('fill', v('ink')).style('font-size', '13px');
		g.append('text')
			.attr('x', side / 2)
			.attr('y', side + 22)
			.attr('text-anchor', 'middle')
			.style('fill', v('muted'))
			.style('font-size', '12px')
			.text(narrow ? '77 characters on both axes' : '77 characters along both axes, in the order chosen above');

		const out = readout(el);
		const tip = tooltip(el);
		let order: Order = 'cluster';
		let selected = -1;

		function layout(animate: boolean) {
			x.domain(orders[order]);
			const t = cellSel.transition().duration(animate && !reducedMotion() ? 900 : 0);
			t.attr('x', (d) => x(d.j)!).attr('y', (d) => x(d.i)!);
			paint();
		}

		function paint() {
			const on = selected >= 0;
			cellSel.style('fill', (d) => (on && (d.i === selected || d.j === selected) ? v('highlight') : v('series-1')));
			bands.style('display', on ? '' : 'none');
			rowLabel.style('display', on && !narrow ? '' : 'none');
			colLabel.style('display', on ? '' : 'none');
			let text = NOTES[order];
			if (on) {
				const p = x(selected)!;
				rowBand.attr('y', p);
				colBand.attr('x', p);
				rowLabel.attr('y', p + x.bandwidth() / 2).text(names[selected]);
				colLabel.attr('x', narrow ? side / 2 : Math.max(30, Math.min(side - 30, p + x.bandwidth() / 2))).text(names[selected]);
				const k = cells.filter((c) => c.i === selected).length;
				text += ` ${names[selected]} has ${k} filled cells in their row, one for each character they share a chapter with.`;
			}
			out.textContent = text;
		}

		cellSel
			.on('pointermove', (e, d) => {
				tip.show(`<strong>${names[d.i]}</strong> and <strong>${names[d.j]}</strong><br>${d.value} shared chapter${d.value === 1 ? '' : 's'}`, e);
			})
			.on('pointerleave', () => tip.hide());

		select<Order>(
			row,
			'Order rows by',
			[
				{ value: 'cluster', label: 'Community' },
				{ value: 'name', label: 'Name' },
				{ value: 'frequency', label: 'Frequency' },
			],
			(val) => {
				order = val;
				layout(true);
			},
			'cluster',
		);
		const byName = [...idx].sort((a, b) => names[a].localeCompare(names[b]));
		select(
			row,
			'Highlight',
			[{ value: '-1', label: 'Nobody' }, ...byName.map((i) => ({ value: String(i), label: names[i] }))],
			(val) => {
				selected = Number(val);
				paint();
			},
			'-1',
		);

		layout(false);
		dataTable(
			el,
			[
				{ label: 'Character', value: (d: (typeof data.links)[number]) => names[d.source] },
				{ label: 'Character', value: (d) => names[d.target] },
				{ label: 'Shared chapters', value: (d) => d.value, numeric: true },
			],
			[...data.links].sort((a, b) => b.value - a.value),
		);
		return () => cellSel.interrupt();
	},
};

export default figure;
