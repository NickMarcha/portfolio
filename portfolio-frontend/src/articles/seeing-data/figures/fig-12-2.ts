import * as d3 from 'd3';
import { controls, dataTable, isNarrow, select, styleAxis, svg, v, type Figure } from './lib';

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
		'Each row is one combination of genres, marked by the dots in it, and the bar to its right counts the films with exactly that combination. The bars above the genre names give the size of each genre. Five sets would need 31 regions in a Venn diagram; here only the 13 that occur take up space.',
	credit: 'Made-up collection of 124 films. Technique: Lex et al. 2014.',
	mount(el) {
		// Phones get a compact layout at their real width (slanted genre names, narrower columns)
		// instead of a scroll box that would hide the combination bars off to the side.
		const narrow = isNarrow(el);
		const W = narrow ? Math.max(300, Math.round(el.clientWidth)) : 580;
		const CW = narrow ? 38 : 60; // one matrix column per genre
		const ML = narrow ? 16 : 12;
		const MW = SETS.length * CW;
		const BX = ML + MW + (narrow ? 12 : 20); // combination bars start here
		const BW = W - BX - (narrow ? 24 : 34); // room for the count label at the end
		const SH = narrow ? 56 : 70; // genre-size bars
		const top = 18 + SH; // baseline of the genre-size bars
		const M0 = top + (narrow ? 46 : 26); // matrix starts under the genre names
		const RH = 24;
		const H = M0 + COMBOS.length * RH + 34;
		const total = d3.sum(COMBOS, (c) => c.n);
		const size = new Map(SETS.map((s) => [s, d3.sum(COMBOS.filter((c) => c.sets.includes(s)), (c) => c.n)]));

		const row = controls(el);
		const root = svg(
			el,
			W,
			H,
			`UpSet plot of ${total} made-up films in five genres: a matrix with one row for each of the 13 genre combinations that occur, a bar of film counts to the right of each row, and genre sizes above the genre names.`,
		);
		const colX = (i: number) => ML + i * CW + CW / 2;
		const sy = d3
			.scaleLinear()
			.domain([0, d3.max(size.values())!])
			.range([0, SH]);
		const x = d3
			.scaleLinear()
			.domain([0, d3.max(COMBOS, (c) => c.n)!])
			.nice()
			.range([BX, BX + BW]);

		// Genre sizes: a bar above each matrix column, with the name as the column header.
		const head = root.append('g');
		head.selectAll('rect')
			.data(SETS)
			.join('rect')
			.attr('x', (_, i) => colX(i) - (narrow ? 11 : 14))
			.attr('width', narrow ? 22 : 28)
			.attr('y', (s) => top - sy(size.get(s)!))
			.attr('height', (s) => sy(size.get(s)!))
			.attr('rx', 2)
			.style('fill', v('series-1'));
		head.selectAll('text.n')
			.data(SETS)
			.join('text')
			.attr('class', 'n')
			.attr('x', (_, i) => colX(i))
			.attr('y', (s) => top - sy(size.get(s)!) - 5)
			.attr('text-anchor', 'middle')
			.style('fill', v('ink'))
			.style('font-size', '12px')
			.text((s) => size.get(s)!);
		head.selectAll('text.name')
			.data(SETS)
			.join('text')
			.attr('class', 'name')
			.attr('transform', (_, i) => (narrow ? `translate(${colX(i) - 6},${M0 - 6}) rotate(-40)` : `translate(${colX(i)},${top + 18})`))
			.attr('text-anchor', narrow ? 'start' : 'middle')
			.style('fill', v('ink'))
			.style('font-size', narrow ? '12px' : '13px')
			.text((s) => s);
		head.append('text')
			.attr('x', BX)
			.attr('y', M0 - 8)
			.style('fill', v('muted'))
			.style('font-size', '12px')
			.text(narrow ? 'Films' : 'Films with exactly this combination');

		const rowsTop = M0;
		const gx = root.append('g');
		gx.selectAll('line')
			.data((narrow ? [0, 20] : x.ticks(5)))
			.join('line')
			.attr('x1', (d) => x(d))
			.attr('x2', (d) => x(d))
			.attr('y1', rowsTop)
			.attr('y2', rowsTop + COMBOS.length * RH)
			.style('stroke', v('grid'));
		styleAxis(
			root.append('g')
				.attr('transform', `translate(0,${rowsTop + COMBOS.length * RH})`)
				.call(d3.axisBottom(x).tickValues(narrow ? [0, 20] : x.ticks(5))),
		);
		root.append('text')
			.attr('x', BX + BW)
			.attr('y', H - 2)
			.attr('text-anchor', 'end')
			.style('fill', v('muted'))
			.style('font-size', '12px')
			.text('films');

		const rows = root.append('g');
		function draw(sort: Sort) {
			const order = [...COMBOS].sort((a, b) =>
				sort === 'size' ? b.n - a.n : a.sets.length - b.sets.length || b.n - a.n,
			);
			const r = rows
				.selectAll<SVGGElement, (typeof COMBOS)[number]>('g.combo')
				.data(order, (c) => c.sets.join('+'))
				.join((enter) => {
					const g = enter.append('g').attr('class', 'combo');
					// Zebra stripe, so the eye can follow a row from the dots to its bar.
					g.append('rect')
						.attr('class', 'stripe')
						.attr('x', ML - 6)
						.attr('width', BX + BW + 30 - ML)
						.attr('height', RH);
					g.append('line')
						.style('stroke', v('ink'))
						.style('stroke-width', 2)
						.attr('y1', RH / 2)
						.attr('y2', RH / 2)
						.attr('x1', (c) => colX(d3.min(c.sets, (s) => SETS.indexOf(s))!))
						.attr('x2', (c) => colX(d3.max(c.sets, (s) => SETS.indexOf(s))!));
					g.selectAll('circle')
						.data((c) => SETS.map((s, i) => ({ i, on: c.sets.includes(s) })))
						.join('circle')
						.attr('cx', (d) => colX(d.i))
						.attr('cy', RH / 2)
						.attr('r', 6)
						.style('fill', (d) => (d.on ? v('ink') : v('dim')));
					g.append('rect')
						.attr('class', 'bar')
						.attr('x', BX)
						.attr('y', 4)
						.attr('height', RH - 8)
						.attr('width', (c) => x(c.n) - BX)
						.attr('rx', 2)
						.style('fill', v('series-1'));
					g.append('text')
						.attr('x', (c) => x(c.n) + 5)
						.attr('y', RH / 2)
						.attr('dy', '0.35em')
						.style('fill', v('ink'))
						.style('font-size', '12px')
						.text((c) => c.n);
					return g;
				});
			r.attr('transform', (_, i) => `translate(0,${rowsTop + i * RH})`);
			r.select('rect.stripe').style('fill', (_, i) => (i % 2 ? 'transparent' : v('grid')));
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
