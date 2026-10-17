import * as d3 from 'd3';
import { controls, dataTable, readout, rng, svg, toggle, v, type Figure } from './lib';
import words from './data/12-3-alice-words.json';

interface Placed {
	word: string;
	n: number;
	size: number;
	x: number;
	y: number;
	w: number;
	h: number;
}

/** Spiral word-cloud layout with seeded start angles, so it looks the same on every load. */
function layout(list: [string, number][], W: number, H: number, family: string): Placed[] {
	const ctx = document.createElement('canvas').getContext('2d')!;
	const fs = d3
		.scaleLinear()
		.domain([list[list.length - 1][1], list[0][1]])
		.range([14, 66]);
	const rand = rng(12);
	const placed: Placed[] = [];
	const hits = (a: Placed) =>
		placed.some((b) => a.x < b.x + b.w + 3 && b.x < a.x + a.w + 3 && a.y < b.y + b.h + 1 && b.y < a.y + a.h + 1);
	for (const [word, n] of list) {
		const size = Math.round(fs(n));
		ctx.font = `600 ${size}px ${family}`;
		const w = ctx.measureText(word).width;
		const h = size * 0.95;
		const t0 = rand() * 2 * Math.PI;
		for (let t = 0; t < 600; t += 0.1) {
			// Wider than tall, like the box it fills.
			const r = 2.2 * t;
			const p = {
				word,
				n,
				size,
				w,
				h,
				x: W / 2 + 1.6 * r * Math.cos(t + t0) - w / 2,
				y: H / 2 + r * Math.sin(t + t0) - h / 2,
			};
			if (p.x < 0 || p.y < 0 || p.x + w > W || p.y + h > H) {
				if (r > W) break;
				continue;
			}
			if (!hits(p)) {
				placed.push(p);
				break;
			}
		}
	}
	return placed;
}

const figure: Figure = {
	title: 'A word cloud and a bar chart of the same words',
	caption:
		'The 40 most frequent words in Alice’s Adventures in Wonderland, as a cloud and as a sorted bar chart of the top 20. Turn stop-word removal off and “the” wins. In the cloud, compare words with similar counts: the longer one looks bigger.',
	credit: 'Text: Lewis Carroll, Alice’s Adventures in Wonderland (1865), Project Gutenberg eBook #11, public domain.',
	mount(el) {
		const W = 680;
		const CW = 400;
		const H = 410;
		const BX = 486;
		const BW = 150;
		const RH = 19;

		const row = controls(el);
		const root = svg(el, W, H, '');
		const cloud = root.append('g');
		const bars = root.append('g').attr('transform', 'translate(0,24)');
		root.append('text')
			.attr('x', CW / 2)
			.attr('y', 14)
			.attr('text-anchor', 'middle')
			.style('fill', v('muted'))
			.style('font-size', '13px')
			.text('Word cloud, top 40');
		root.append('text')
			.attr('x', BX)
			.attr('y', 14)
			.style('fill', v('muted'))
			.style('font-size', '13px')
			.text('Top 20, sorted');
		const out = readout(el);
		const family = getComputedStyle(el).fontFamily || 'sans-serif';

		function draw(removeStop: boolean) {
			const list = (removeStop ? words.noStop : words.all) as [string, number][];
			const placed = layout(list.slice(0, 40), CW, H - 30, family);
			cloud
				.attr('transform', 'translate(0,24)')
				.selectAll('text')
				.data(placed, (d) => (d as Placed).word)
				.join('text')
				.attr('x', (d) => d.x)
				.attr('y', (d) => d.y + d.h * 0.8)
				.style('font-size', (d) => `${d.size}px`)
				.style('font-weight', '600')
				.style('fill', v('ink'))
				.text((d) => d.word);

			const top = list.slice(0, 20);
			const x = d3
				.scaleLinear()
				.domain([0, top[0][1]])
				.range([0, BW]);
			bars.selectAll('rect')
				.data(top)
				.join('rect')
				.attr('x', BX)
				.attr('y', (_, i) => i * RH + 2)
				.attr('height', RH - 4)
				.attr('width', (d) => x(d[1]))
				.attr('rx', 2)
				.style('fill', v('series-1'));
			bars.selectAll('text.w')
				.data(top)
				.join('text')
				.attr('class', 'w')
				.attr('x', BX - 6)
				.attr('y', (_, i) => i * RH + RH / 2)
				.attr('dy', '0.35em')
				.attr('text-anchor', 'end')
				.style('fill', v('ink'))
				.style('font-size', '13px')
				.text((d) => d[0]);
			bars.selectAll('text.n')
				.data(top)
				.join('text')
				.attr('class', 'n')
				.attr('x', (d) => BX + x(d[1]) + 4)
				.attr('y', (_, i) => i * RH + RH / 2)
				.attr('dy', '0.35em')
				.style('fill', v('ink'))
				.style('font-size', '12px')
				.text((d) => d[1]);

			root.attr(
				'aria-label',
				`Word cloud and bar chart of the most frequent words in Alice’s Adventures in Wonderland, ${
					removeStop ? 'with' : 'without'
				} stop words removed. The top five are ${top
					.slice(0, 5)
					.map((d) => `${d[0]} (${d[1]})`)
					.join(', ')}.`,
			);
			out.textContent = removeStop
				? `${words.stopWords} stop words removed. Now “said” (${list[0][1]}) and “alice” (${list[1][1]}) lead, followed by words that hint at the story: little, queen, king, turtle, hatter.`
				: `No stop words removed. The top words are ${top
						.slice(0, 4)
						.map((d) => `“${d[0]}”`)
						.join(', ')}: true of almost any English text, and no help at all.`;
			dataTable(
				el,
				[
					{ label: 'Rank', value: (d: [string, number]) => list.indexOf(d) + 1, numeric: true },
					{ label: 'Word', value: (d) => d[0] },
					{ label: 'Count', value: (d) => d[1], numeric: true },
				],
				list.slice(0, 40),
			);
		}

		toggle(row, 'Remove stop words', draw, true);
		draw(true);
	},
};

export default figure;
