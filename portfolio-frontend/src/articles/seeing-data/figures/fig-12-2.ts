import * as d3 from 'd3';
import { controls, dataTable, gridY, select, styleAxis, svg, v, type Figure } from './lib';

const SETS = ['Drama', 'Comedy', 'Action', 'Thriller', 'Romance'];

// Made-up film collection: how many films have exactly this combination of genres.
const COMBOS: { sets: string[]; n: number }[] = [
	{ sets: ['Drama'], n: 22 },
	{ sets: ['Comedy'], n: 18 },
	{ sets: ['Drama', 'Romance'], n: 14 },
	{ sets: ['Action'], n: 12 },
	{ sets: ['Comedy', 'Romance'], n: 11 },
	{ sets: ['Thriller'], n: 9 },
	{ sets: ['Action', 'Thriller'], n: 9 },
	{ sets: ['Drama', 'Thriller'], n: 7 },
	{ sets: ['Drama', 'Comedy'], n: 6 },
	{ sets: ['Comedy', 'Action'], n: 5 },
	{ sets: ['Romance'], n: 4 },
	{ sets: ['Drama', 'Comedy', 'Romance'], n: 4 },
	{ sets: ['Drama', 'Action', 'Thriller'], n: 3 },
];

type Sort = 'size' | 'degree';

const figure: Figure = {
	title: 'An UpSet plot of film genres',
	caption:
		'Each column is one combination of genres, marked by the dots below it, and the bar on top counts the films with exactly that combination. The bars on the left give the size of each genre. Five sets would need 31 regions in a Venn diagram; here only the 13 that occur take up space.',
	credit: 'Made-up collection of 124 films. Technique: Lex et al. 2014.',
	mount(el) {
		const W = 680;
		const L = 168; // set labels and set-size bars
		const T = 180; // intersection bars
		const RH = 26;
		const H = T + 16 + SETS.length * RH + 10;
		const total = d3.sum(COMBOS, (c) => c.n);
		const size = new Map(SETS.map((s) => [s, d3.sum(COMBOS.filter((c) => c.sets.includes(s)), (c) => c.n)]));

		const row = controls(el);
		const root = svg(
			el,
			W,
			H,
			`UpSet plot of ${total} made-up films in five genres: a matrix of the 13 genre combinations that occur, with a bar of film counts above each combination and genre sizes on the left.`,
		);
		const x = d3
			.scaleBand<number>()
			.domain(d3.range(COMBOS.length))
			.range([L + 10, W - 10])
			.padding(0.25);
		const y = d3
			.scaleLinear()
			.domain([0, d3.max(COMBOS, (c) => c.n)!])
			.nice()
			.range([T, 18]);
		const rowY = (i: number) => T + 16 + i * RH + RH / 2;
		const sx = d3
			.scaleLinear()
			.domain([0, d3.max(size.values())!])
			.range([0, L - 104]);

		gridY(root.append('g').attr('transform', `translate(${L + 10},0)`), y, W - L - 20, 4);
		styleAxis(root.append('g').attr('transform', `translate(${L + 10},0)`).call(d3.axisLeft(y).ticks(4)));
		root.append('text')
			.attr('x', L + 4)
			.attr('y', 8)
			.attr('text-anchor', 'end')
			.style('fill', v('muted'))
			.style('font-size', '12px')
			.text('films');

		// Zebra stripes help the eye follow a row across the matrix.
		root.append('g')
			.selectAll('rect')
			.data(SETS)
			.join('rect')
			.attr('x', 0)
			.attr('width', W)
			.attr('y', (_, i) => rowY(i) - RH / 2)
			.attr('height', RH)
			.style('fill', (_, i) => (i % 2 ? 'transparent' : v('grid')));
		const sets = root.append('g');
		sets.selectAll('text')
			.data(SETS)
			.join('text')
			.attr('x', L - 4)
			.attr('y', (_, i) => rowY(i))
			.attr('dy', '0.35em')
			.attr('text-anchor', 'end')
			.style('fill', v('ink'))
			.style('font-size', '13px')
			.text((s) => s);
		sets.selectAll('rect')
			.data(SETS)
			.join('rect')
			.attr('x', (s) => L - 66 - sx(size.get(s)!))
			.attr('width', (s) => sx(size.get(s)!))
			.attr('y', (_, i) => rowY(i) - 8)
			.attr('height', 16)
			.attr('rx', 2)
			.style('fill', v('series-1'));
		sets.selectAll('text.n')
			.data(SETS)
			.join('text')
			.attr('class', 'n')
			.attr('x', (s) => L - 70 - sx(size.get(s)!))
			.attr('y', (_, i) => rowY(i))
			.attr('dy', '0.35em')
			.attr('text-anchor', 'end')
			.style('fill', v('ink'))
			.style('font-size', '12px')
			.text((s) => size.get(s)!);

		const cols = root.append('g');
		function draw(sort: Sort) {
			const order = [...COMBOS].sort((a, b) =>
				sort === 'size' ? b.n - a.n : a.sets.length - b.sets.length || b.n - a.n,
			);
			const col = cols
				.selectAll<SVGGElement, (typeof COMBOS)[number]>('g.col')
				.data(order, (c) => c.sets.join('+'))
				.join((enter) => {
					const g = enter.append('g').attr('class', 'col');
					g.append('rect').attr('class', 'bar').attr('rx', 2).style('fill', v('series-1'));
					g.append('text')
						.attr('class', 'n')
						.attr('text-anchor', 'middle')
						.style('fill', v('ink'))
						.style('font-size', '12px');
					g.append('line').style('stroke', v('ink')).style('stroke-width', 2);
					g.selectAll('circle')
						.data((c) => SETS.map((s, i) => ({ i, on: c.sets.includes(s) })))
						.join('circle')
						.attr('cy', (d) => rowY(d.i))
						.attr('r', 6)
						.style('fill', (d) => (d.on ? v('ink') : v('dim')));
					return g;
				});
			col.attr('transform', (_, i) => `translate(${x(i)},0)`);
			const bw = x.bandwidth();
			col.select('rect.bar')
				.attr('width', bw)
				.attr('y', (c) => y(c.n))
				.attr('height', (c) => T - y(c.n));
			col.select('text.n')
				.attr('x', bw / 2)
				.attr('y', (c) => y(c.n) - 4)
				.text((c) => c.n);
			col.select('line')
				.attr('x1', bw / 2)
				.attr('x2', bw / 2)
				.attr('y1', (c) => rowY(d3.min(c.sets, (s) => SETS.indexOf(s))!))
				.attr('y2', (c) => rowY(d3.max(c.sets, (s) => SETS.indexOf(s))!));
			col.selectAll('circle').attr('cx', bw / 2);
		}

		select(
			row,
			'Sort combinations by',
			[
				{ value: 'size', label: 'Number of films' },
				{ value: 'degree', label: 'Number of genres, then films' },
			],
			draw,
			'size',
		);
		draw('size');
		dataTable(
			el,
			[
				{ label: 'Genre combination', value: (c: (typeof COMBOS)[number]) => c.sets.join(' + ') + (c.sets.length === 1 ? ' only' : '') },
				{ label: 'Films', value: (c) => c.n, numeric: true },
			],
			COMBOS,
		);
	},
};

export default figure;
