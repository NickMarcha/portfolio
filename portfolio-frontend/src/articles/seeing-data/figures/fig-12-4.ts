import * as d3 from 'd3';
import { controls, dataTable, isNarrow, readout, select, v, type Figure } from './lib';
import contexts from './data/12-4-alice-contexts.json';

type Root = keyof typeof contexts;

interface Node {
	word: string;
	count: number;
	children: Map<string, Node>;
}
interface Drawn {
	text: string;
	count: number;
	depth: number;
	x: number;
	y: number;
	w: number;
	size: number;
	more?: boolean;
	kids: Drawn[];
}

const MAX_DEPTH = 4;
const KIDS = [6, 4, 2, 1];

function trie(phrases: string[]): Node {
	const root: Node = { word: '', count: phrases.length, children: new Map() };
	for (const p of phrases) {
		let n = root;
		for (const w of p.split(' ').filter(Boolean).slice(0, MAX_DEPTH)) {
			let c = n.children.get(w);
			if (!c) n.children.set(w, (c = { word: w, count: 0, children: new Map() }));
			c.count++;
			n = c;
		}
	}
	return root;
}

const figure: Figure = {
	title: 'A word tree',
	caption:
		'Every phrase in Alice’s Adventures in Wonderland that follows the chosen word, merged where the phrases share a beginning. Bigger text means more phrases go that way. Only the most common branches are drawn.',
	credit:
		'Text: Lewis Carroll, Alice’s Adventures in Wonderland, Project Gutenberg eBook #11, public domain. Technique after Wattenberg and Viégas 2008.',
	mount(el) {
		// Drawn at the real width on phones: scaling a 680-wide tree down makes 12px text unreadable.
		const W = isNarrow(el) ? Math.max(300, Math.round(el.clientWidth)) : 680;
		const BIG = W < 500 ? 22 : 30; // size of the root word
		const RH = 22;
		const GAP = 16;
		const row = controls(el);
		const host = document.createElement('div');
		el.append(host);
		const out = readout(el);
		const ctx = document.createElement('canvas').getContext('2d')!;
		const family = getComputedStyle(el).fontFamily || 'sans-serif';
		const measure = (s: string, size: number, weight = 400) => {
			ctx.font = `${weight} ${size}px ${family}`;
			return ctx.measureText(s).width;
		};

		function draw(rootWord: Root) {
			const phrases = contexts[rootWord] as string[];
			const t = trie(phrases);
			const fs = d3.scaleSqrt().domain([1, t.count]).range([12, BIG]);
			let leafRow = 0;

			function build(n: Node, depth: number, x: number, text: string): Drawn {
				const size = depth === 0 ? BIG : Math.round(fs(n.count));
				const weight = depth === 0 ? 700 : 400;
				let label = text;
				// A branch only one phrase follows is printed as the rest of that phrase.
				let tail = n;
				if (depth > 0 && n.count === 1) {
					const words = [text];
					while (tail.children.size === 1) {
						tail = [...tail.children.values()][0];
						words.push(tail.word);
					}
					label = words.join(' ');
				}
				let w = measure(label, size, weight);
				const room = W - x - 4;
				while (w > room && label.includes(' ')) {
					label = label.slice(0, label.lastIndexOf(' ')) + '…';
					w = measure(label, size, weight);
				}
				const d: Drawn = { text: label, count: n.count, depth, x, y: 0, w, size, kids: [] };
				if (tail === n && depth < MAX_DEPTH) {
					const kids = [...n.children.values()].sort((a, b) => b.count - a.count);
					const k = KIDS[depth] ?? 1;
					const shown = kids.slice(0, k);
					const rest = d3.sum(kids.slice(k), (c) => c.count);
					const cx = x + w + GAP;
					if (cx < W - 60) {
						for (const c of shown) d.kids.push(build(c, depth + 1, cx, c.word));
						if (rest > 0 && depth === 0) {
							d.kids.push({
								text: `+${rest} more`,
								count: rest,
								depth: depth + 1,
								x: cx,
								y: leafRow++ * RH,
								w: measure(`+${rest} more`, 12),
								size: 12,
								more: true,
								kids: [],
							});
						}
					}
				}
				d.y = d.kids.length ? d3.mean(d.kids, (c) => c.y)! : leafRow++ * RH;
				return d;
			}

			const tree = build(t, 0, 4, rootWord);
			const H = leafRow * RH + 10;
			const all: Drawn[] = [];
			const links: [Drawn, Drawn][] = [];
			(function walk(d: Drawn) {
				all.push(d);
				for (const c of d.kids) {
					links.push([d, c]);
					walk(c);
				}
			})(tree);

			host.replaceChildren();
			const root = d3
				.select(host)
				.append('svg')
				.attr('viewBox', `0 0 ${W} ${H}`)
				.attr('width', '100%')
				.attr('role', 'img')
				.attr(
					'aria-label',
					`Word tree of the phrases after “${rootWord}” in Alice’s Adventures in Wonderland. The most common continuations are ${tree.kids
						.filter((k) => !k.more)
						.slice(0, 4)
						.map((k) => `${k.text} (${k.count})`)
						.join(', ')}.`,
				)
				.style('max-width', `${W}px`)
				.style('height', 'auto')
				.style('display', 'block');
			const g = root.append('g').attr('transform', `translate(0,${RH / 2 + 4})`);
			g.append('g')
				.selectAll('path')
				.data(links)
				.join('path')
				.attr('d', ([a, b]) => {
					const x0 = a.x + a.w + 3;
					const x1 = b.x - 3;
					const m = (x0 + x1) / 2;
					return `M${x0},${a.y}C${m},${a.y} ${m},${b.y} ${x1},${b.y}`;
				})
				.style('fill', 'none')
				.style('stroke', v('axis'))
				.style('stroke-width', 1.5);
			g.append('g')
				.selectAll('text')
				.data(all)
				.join('text')
				.attr('x', (d) => d.x)
				.attr('y', (d) => d.y)
				.attr('dy', '0.35em')
				.style('font-size', (d) => `${d.size}px`)
				.style('font-weight', (d) => (d.depth === 0 ? '700' : '400'))
				.style('font-style', (d) => (d.more ? 'italic' : 'normal'))
				.style('fill', (d) => (d.more ? v('muted') : v('ink')))
				.text((d) => d.text);

			const ends = phrases.filter((p) => !p).length;
			const first = tree.kids.filter((k) => !k.more);
			out.textContent = `“${rootWord}” appears ${phrases.length} times. ${
				ends ? `${ends} times a punctuation mark follows it, so no branch is drawn. ` : ''
			}The most common next word is “${first[0].text.split(' ')[0]}” (${first[0].count}).`;
			const counts = d3
				.rollups(
					phrases.filter(Boolean),
					(v) => v.length,
					(p) => p.split(' ')[0],
				)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 15);
			dataTable(
				el,
				[
					{ label: `Word after “${rootWord}”`, value: (d: [string, number]) => d[0] },
					{ label: 'Times', value: (d) => d[1], numeric: true },
				],
				counts,
			);
		}

		select(
			row,
			'Start the tree at',
			(Object.keys(contexts) as Root[]).map((k) => ({ value: k, label: `“${k}”` })),
			draw,
			'said',
		);
		draw('said');
	},
};

export default figure;
