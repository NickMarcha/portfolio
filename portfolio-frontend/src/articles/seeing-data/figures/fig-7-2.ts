import * as d3 from 'd3';
import pairsRaw from './data/7-2-costars.json';
import { controls, dataTable, isNarrow, readout, select, slider, svg, v, type Figure } from './lib';

type Pair = { a: string; b: string; films: string[] };
const year = (f: string) => Number(f.slice(-5, -1));
const PAIRS = (pairsRaw as Pair[]).map((p) => ({ ...p, films: [...p.films].sort((x, y) => year(x) - year(y)) }));
const key = (p: Pair) => `${p.a}|${p.b}`;

const figure: Figure = {
	title: 'Who acts with whom',
	caption:
		'A rebuild of the chord diagram from my third programming exercise, without the poster grid that sat next to it. Each arc is an actor, each ribbon a pair of actors who share films among IMDB’s top-rated films from 2000 to 2020.',
	credit:
		'Own work, INF252 exercise 3. Data: IMDB top 1000 movies, compiled by Harshit Shankhdhar on Kaggle (CC0). Colors simplified from the original, which gave every actor its own hue.',
	mount(el) {
		let minFilms = 2;
		let picked: string | null = null;
		// Phone: no room for 80 names around the ring, so the circle fills the width and the
		// picked pair is named above it. Start with the top pair picked so the names show.
		const narrow = isNarrow(el);
		if (narrow) picked = key(PAIRS.filter((p) => p.films.length >= minFilms).sort((p, q) => q.films.length - p.films.length || key(p).localeCompare(key(q)))[0]);

		const row = controls(el);
		slider(row, 'Minimum shared films', { min: 2, max: 4, value: minFilms }, (n) => {
			minFilms = n;
			picked = null;
			draw();
		});
		const pairSelect = select(row, 'Pair', [], (val) => pick(val || null));
		// Long pair names would push the select past a phone's edge.
		if (narrow) pairSelect.style.maxWidth = `${el.clientWidth - 50}px`;

		const S = narrow ? el.clientWidth : 680;
		const r = narrow ? S / 2 - 4 : 200;
		const top = narrow ? 52 : 0;
		const root = svg(el, S, S + top, 'Chord diagram of actors who appear together in top-rated films.');
		const names = root.append('g');
		const g = root.append('g').attr('transform', `translate(${S / 2},${top + S / 2})`);
		const out = readout(el);

		function draw() {
			const pairs = PAIRS.filter((p) => p.films.length >= minFilms).sort((p, q) => q.films.length - p.films.length || key(p).localeCompare(key(q)));
			// Actors ordered by how many shared films they have in total, as in the original.
			const weight = new Map<string, number>();
			for (const p of pairs) for (const n of [p.a, p.b]) weight.set(n, (weight.get(n) ?? 0) + p.films.length);
			const actors = [...weight.keys()].sort((a, b) => weight.get(b)! - weight.get(a)! || a.localeCompare(b));
			const idx = new Map(actors.map((a, i) => [a, i]));
			const matrix = actors.map(() => actors.map(() => 0));
			for (const p of pairs) {
				matrix[idx.get(p.a)!][idx.get(p.b)!] = p.films.length;
				matrix[idx.get(p.b)!][idx.get(p.a)!] = p.films.length;
			}
			// With many actors, wide gaps spread the labels evenly instead of crowding the one-film-pair actors.
			const chords = d3.chord().padAngle(actors.length > 30 ? 0.05 : 0.04)(matrix);
			const pairOf = (c: d3.Chord) => {
				const a = actors[c.source.index];
				const b = actors[c.target.index];
				return pairs.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a))!;
			};
			const sel = picked ? pairs.find((p) => key(p) === picked) : undefined;

			g.selectAll('*').remove();
			const ribbon = d3.ribbon<d3.Chord, d3.ChordSubgroup>().radius(r - 14);
			g.append('g')
				.selectAll('path')
				.data(chords)
				.join('path')
				.attr('d', (c) => ribbon(c) as unknown as string)
				.style('fill', (c) => (sel && pairOf(c) === sel ? v('highlight') : v('series-1')))
				.style('fill-opacity', (c) => (!sel ? 0.45 : pairOf(c) === sel ? 0.95 : 0.18))
				.style('stroke', v('surface'))
				.style('stroke-width', 0.5)
				.style('cursor', 'pointer')
				.on('click', (_, c) => pick(key(pairOf(c))))
				.append('title')
				.text((c) => {
					const p = pairOf(c);
					return `${p.a} and ${p.b}: ${p.films.length} films`;
				});
			g.append('g')
				.selectAll('path')
				.data(chords.groups)
				.join('path')
				.attr('d', d3.arc<d3.ChordGroup>().innerRadius(r - 12).outerRadius(r) as never)
				.style('fill', (d) => (narrow && sel && (sel.a === actors[d.index] || sel.b === actors[d.index]) ? v('highlight') : v('series-1')));
			names.selectAll('*').remove();
			if (narrow) {
				const lines = sel ? [sel.a, `and ${sel.b}: ${sel.films.length} films`] : ['Pick a pair to name its actors.'];
				names
					.selectAll('text')
					.data(lines)
					.join('text')
					.attr('x', S / 2)
					.attr('y', (_, i) => 16 + i * 20)
					.attr('text-anchor', 'middle')
					.style('fill', v('ink'))
					.style('font-size', '14px')
					.style('font-weight', sel ? '700' : '400')
					.text((t) => t);
			}
			const fontSize = actors.length > 40 ? 12 : 14;
			g.append('g')
				.selectAll('text')
				.data(narrow ? [] : chords.groups)
				.join('text')
				.each((d) => Object.assign(d, { angle: (d.startAngle + d.endAngle) / 2 }))
				.attr('transform', (d) => {
					const a = (d as d3.ChordGroup & { angle: number }).angle;
					return `rotate(${(a * 180) / Math.PI - 90}) translate(${r + 6}) ${a > Math.PI ? 'rotate(180)' : ''}`;
				})
				.attr('dy', '0.35em')
				.attr('text-anchor', (d) => ((d as d3.ChordGroup & { angle: number }).angle > Math.PI ? 'end' : 'start'))
				.style('fill', v('ink'))
				.style('font-size', `${fontSize}px`)
				.style('font-weight', (d) => (sel && (sel.a === actors[d.index] || sel.b === actors[d.index]) ? '700' : '400'))
				.text((d) => actors[d.index]);

			// Refill the options in place, so keyboard focus stays on the select.
			pairSelect.replaceChildren(
				new Option('None picked', '', false, !picked),
				...pairs.map((p) => new Option(`${p.a} and ${p.b} (${p.films.length})`, key(p), false, key(p) === picked)),
			);

			out.textContent = sel
				? `${sel.a} and ${sel.b} share ${sel.films.length} films: ${sel.films.join(', ')}.`
				: `${actors.length} actors in ${pairs.length} pairs that share at least ${minFilms} films. Pick a pair for the films they share.`;

			dataTable(
				el,
				[
					{ label: 'Actor', value: (p: Pair) => p.a },
					{ label: 'Actor', value: (p) => p.b },
					{ label: 'Shared films', value: (p) => p.films.length, numeric: true },
					{ label: 'Films', value: (p) => p.films.join('; ') },
				],
				pairs,
			);
		}
		function pick(k: string | null) {
			picked = k;
			draw();
		}
		draw();
	},
};

export default figure;
