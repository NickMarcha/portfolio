import * as d3 from 'd3';
import { button, controls, dataTable, readout, reducedMotion, styleAxis, svg, v, type Figure } from './lib';

// Nick's own aggregate from Programming Exercise 2 (INF252): mean gap per primary genre
// between the IMDB rating rescaled to 0-100 and the Metascore, over the 843 films in the
// IMDB top 1000 that have a Metascore. Only these per-genre numbers are published here.
const DATA = [
	{ genre: 'Film-Noir', gap: -18.3, n: 3 },
	{ genre: 'Thriller', gap: -5.4, n: 1 },
	{ genre: 'Animation', gap: -4.1, n: 75 },
	{ genre: 'Family', gap: -3.4, n: 2 },
	{ genre: 'Horror', gap: -3.2, n: 11 },
	{ genre: 'Drama', gap: -2.6, n: 241 },
	{ genre: 'Comedy', gap: -2.3, n: 125 },
	{ genre: 'Adventure', gap: -1.4, n: 64 },
	{ genre: 'Mystery', gap: -0.9, n: 8 },
	{ genre: 'Crime', gap: 0.6, n: 87 },
	{ genre: 'Biography', gap: 0.7, n: 79 },
	{ genre: 'Western', gap: 3.4, n: 4 },
	{ genre: 'Action', gap: 3.6, n: 143 },
];
type Row = (typeof DATA)[number];
type View = 'honest' | 'deceptive';

const SMALL = 12;
// Traffic-light colors from the original exercise, on purpose: they are the deception.
const TRAFFIC = (d: Row) => {
	const a = Math.abs(d.gap);
	return a < 2 ? '#22c55e' : a < 4 ? '#eab308' : '#e34a33';
};
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}`;

const figure: Figure = {
	title: 'One dataset, an honest chart and a deceptive one',
	caption:
		'Both versions use the same thirteen numbers and differ only in design decisions.',
	credit:
		'Nick Marcha, INF252 Programming Exercise 2. Per-genre averages computed from the “IMDB Movies Dataset” of the top 1000 films on Kaggle (Harshit Shankhdhar); only the aggregates are shown here, not the underlying dataset.',
	mount(el) {
		const W = 640;
		const rowH = 26;
		const m = { top: 92, right: 70, bottom: 34, left: 92 };
		const H = m.top + DATA.length * rowH + m.bottom;
		const iw = W - m.left - m.right;
		const ih = DATA.length * rowH;

		const row = controls(el);
		const root = svg(el, W, H, '');
		const banner = root.append('g');
		banner
			.append('rect')
			.attr('x', 1)
			.attr('y', 1)
			.attr('width', W - 2)
			.attr('height', 30)
			.attr('rx', 4)
			.style('fill', 'none')
			.style('stroke', v('highlight'))
			.style('stroke-width', 2)
			.style('stroke-dasharray', '6 4');
		banner
			.append('text')
			.attr('x', W / 2)
			.attr('y', 21)
			.attr('text-anchor', 'middle')
			.style('fill', v('ink'))
			.style('font-size', '14px')
			.style('font-weight', '700')
			.text('Deliberately misleading version: do not read it at face value');
		const title = root
			.append('text')
			.attr('x', 0)
			.attr('y', 56)
			.style('fill', v('ink'))
			.style('font-size', '16px')
			.style('font-weight', '600');

		const g = root.append('g').attr('transform', `translate(${m.left},${m.top})`);
		const x = d3.scaleLinear().domain([-20, 5]).range([0, iw]);
		const xAxis = g.append('g');
		styleAxis(xAxis.call(d3.axisTop(x).ticks(6).tickSize(-ih).tickFormat((d) => signed(+d).replace('.0', ''))));
		xAxis.selectAll('.tick line').style('stroke', v('grid'));
		xAxis.select('.domain').remove();
		g.append('line')
			.attr('x1', x(0))
			.attr('x2', x(0))
			.attr('y1', -4)
			.attr('y2', ih)
			.style('stroke', v('ink'))
			.style('stroke-width', 1.5);
		const sides = g.append('g').style('fill', v('muted')).style('font-size', '13px');
		sides.append('text').attr('x', x(0) - 6).attr('y', ih + 22).attr('text-anchor', 'end').text('← Critics rated higher');
		sides.append('text').attr('x', x(0) + 6).attr('y', ih + 22).text('Audiences →');

		const rowsG = g.append('g');
		const out = readout(el);

		const buttons: HTMLButtonElement[] = [];
		function draw(view: View, animate = true) {
			const honest = view === 'honest';
			buttons.forEach((b, i) => b.setAttribute('aria-pressed', String((i === 0) === honest)));
			const order = honest ? DATA : [...DATA].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
			const y = d3
				.scaleBand()
				.domain(order.map((d) => d.genre))
				.range([0, ih])
				.padding(0.18);
			const t = d3.transition().duration(animate && !reducedMotion() ? 600 : 0);

			const rows = rowsG
				.selectAll<SVGGElement, Row>('g.row')
				.data(DATA, (d) => d.genre)
				.join((enter) => {
					const r = enter.append('g').attr('class', 'row');
					r.append('rect').attr('rx', 2);
					r.append('text').attr('class', 'name').attr('dy', '0.35em').style('fill', v('ink')).style('font-size', '13px');
					r.append('text').attr('class', 'val').attr('dy', '0.35em').style('fill', v('ink')).style('font-size', '12px');
					return r;
				});
			rows.transition(t).attr('transform', (d) => `translate(0,${y(d.genre)})`);
			rows.select('rect')
				.attr('x', (d) => x(Math.min(0, d.gap)))
				.attr('width', (d) => Math.abs(x(d.gap) - x(0)))
				.attr('height', y.bandwidth())
				.style('fill', (d) => (honest ? (d.gap > 0 ? v('div-low') : v('div-high')) : TRAFFIC(d)))
				.style('fill-opacity', (d) => (honest && d.n < SMALL ? 0.45 : 1));
			// Genre names sit on the opposite side of zero from their bar.
			rows.select('text.name')
				.attr('x', (d) => (d.gap < 0 ? x(0) + 6 : x(0) - 6))
				.attr('y', y.bandwidth() / 2)
				.attr('text-anchor', (d) => (d.gap < 0 ? 'start' : 'end'))
				.style('font-weight', (d) => (!honest && Math.abs(d.gap) >= 3 ? '700' : '400'))
				.text((d) => d.genre);
			rows.select('text.val')
				.attr('x', (d) => x(d.gap) + (d.gap < 0 ? -5 : 5))
				.attr('y', y.bandwidth() / 2)
				.attr('text-anchor', (d) => (d.gap < 0 ? 'end' : 'start'))
				.style('font-weight', (d) => (!honest && Math.abs(d.gap) >= 3 ? '700' : '400'))
				.text((d) => (honest ? `${signed(d.gap)} (n=${d.n})` : signed(d.gap)));

			banner.attr('display', honest ? 'none' : null);
			sides.attr('display', honest ? null : 'none');
			title.text(
				honest
					? 'Where do audiences and critics disagree? Mean gap by genre'
					: 'Which genres are most controversial?',
			);
			root.attr(
				'aria-label',
				honest
					? 'Honest version: diverging bar chart of the mean gap between audience and critic scores for 13 genres, sorted by gap, with the number of films on each bar. Blue bars mean audiences rated the genre higher, red bars mean critics did.'
					: 'Deliberately misleading version: the same 13 gaps sorted by size regardless of direction, without film counts, colored green, yellow and red by size. Film-Noir and Thriller appear at the top.',
			);
			out.textContent = honest
				? `Blue: audiences rated the genre higher. Red: critics did. Paler bars have fewer than ${SMALL} films, so read them with caution: Film-Noir rests on 3 films and Thriller on 1.`
				: 'Same numbers. Sorted by size and colored like a traffic light, the chart hides who liked each genre more and how few films sit behind the top bars.';
		}

		buttons.push(button(row, 'Honest', () => draw('honest')));
		buttons.push(button(row, 'Deceptive', () => draw('deceptive')));
		draw('honest', false);

		dataTable(
			el,
			[
				{ label: 'Genre', value: (d: Row) => d.genre },
				{ label: 'Mean gap (audience − critic, points of 100)', value: (d) => signed(d.gap), numeric: true },
				{ label: 'Films', value: (d) => d.n, numeric: true },
			],
			DATA,
		);
	},
};

export default figure;
