import { dataTable, isNarrow, svg, v, type Figure } from './lib';

const ITEMS = [
	{ name: 'dog', sets: 'Mammals' },
	{ name: 'whale', sets: 'Mammals' },
	{ name: 'house cat', sets: 'Mammals, Cats' },
	{ name: 'lynx', sets: 'Mammals, Cats' },
	{ name: 'sparrow', sets: 'Birds' },
	{ name: 'penguin', sets: 'Birds' },
];

interface Circle {
	label: string;
	cx: number;
	cy: number;
	r: number;
	color: string;
	lx: number;
	ly: number;
	anchor: string;
}
interface Note {
	x: number;
	y: number;
	lines: string[];
	empty?: boolean;
}

const figure: Figure = {
	title: 'Venn and Euler',
	caption:
		'The same three sets. The Venn diagram draws all seven regions inside the circles, and four of them are empty. The Euler diagram draws only what exists.',
	credit: 'Made-up example and members.',
	mount(el) {
		const narrow = isNarrow(el);
		// Phones: the two panels stack, and the geometry (not the text) shrinks to fit the width.
		const W = narrow ? el.clientWidth : 680;
		const k = narrow ? Math.min(1, (W - 4) / 335) : 1;
		// Shrunk geometry would run into the subtitle, so it starts lower.
		const gy = narrow ? 16 : 0;
		const PH = Math.round(360 * k) + gy;
		const H = narrow ? 2 * PH + 16 : 360;
		const px = narrow ? (W - 335 * k) / 2 : 0;
		const root = svg(
			el,
			W,
			H,
			narrow ? 'Top, a Venn diagram of mammals, birds and cats with all seven regions and four of them empty. Below, an Euler diagram with cats inside mammals and birds separate.' : 'Left, a Venn diagram of mammals, birds and cats with all seven regions and four of them empty. Right, an Euler diagram with cats inside mammals and birds separate.',
		);

		const panel = (
			x: number,
			y: number,
			title: string,
			sub: string,
			circles: Circle[],
			notes: Note[],
		) => {
			const g = root.append('g').attr('transform', `translate(${x},${y})`);
			g.append('text')
				.attr('x', 165 * k)
				.attr('y', 20)
				.attr('text-anchor', 'middle')
				.style('fill', v('ink'))
				.style('font-size', '15px')
				.style('font-weight', '700')
				.text(title);
			g.append('text')
				.attr('x', 165 * k)
				.attr('y', 38)
				.attr('text-anchor', 'middle')
				.style('fill', v('muted'))
				.style('font-size', '13px')
				.text(sub);
			g.append('g')
				.selectAll('circle')
				.data(circles)
				.join('circle')
				.attr('cx', (c) => c.cx * k)
				.attr('cy', (c) => c.cy * k + gy)
				.attr('r', (c) => c.r * k)
				.style('fill', (c) => c.color)
				.style('fill-opacity', 0.14)
				.style('stroke', (c) => c.color)
				.style('stroke-width', 2);
			g.append('g')
				.selectAll('text')
				.data(circles)
				.join('text')
				.attr('x', (c) => c.lx * k)
				.attr('y', (c) => c.ly * k + gy)
				.attr('text-anchor', (c) => c.anchor)
				.style('fill', v('ink'))
				.style('font-size', '14px')
				.style('font-weight', '600')
				.text((c) => c.label);
			const n = g
				.append('g')
				.selectAll('text')
				.data(notes)
				.join('text')
				.attr('x', (d) => d.x * k)
				.attr('y', (d) => d.y * k + gy - ((d.lines.length - 1) * 15) / 2)
				.attr('text-anchor', 'middle')
				.attr('dy', '0.35em')
				.style('fill', (d) => (d.empty ? v('muted') : v('ink')))
				.style('font-size', (d) => (d.empty ? '12px' : '13px'))
				.style('font-style', (d) => (d.empty ? 'italic' : 'normal'));
			n.selectAll('tspan')
				.data((d) => d.lines.map((s) => ({ s, x: d.x * k })))
				.join('tspan')
				.attr('x', (t) => t.x)
				.attr('dy', (_, i) => (i === 0 ? '0.35em' : '15px'))
				.text((t) => t.s);
		};

		const M = v('series-1');
		const B = v('series-2');
		const C = v('series-3');

		panel(
			px,
			0,
			'Venn',
			'every possible overlap is drawn',
			[
				{ label: 'Mammals', cx: 120, cy: 150, r: 92, color: M, lx: 40, ly: 62, anchor: 'middle' },
				{ label: 'Birds', cx: 212, cy: 150, r: 92, color: B, lx: 292, ly: 62, anchor: 'middle' },
				{ label: 'Cats', cx: 166, cy: 232, r: 92, color: C, lx: 166, ly: 346, anchor: 'middle' },
			],
			[
				{ x: 78, y: 128, lines: ['dog', 'whale'] },
				{ x: 256, y: 128, lines: ['sparrow', 'penguin'] },
				{ x: 166, y: 104, lines: ['empty'], empty: true },
				{ x: 166, y: 180, lines: ['empty'], empty: true },
				{ x: 112, y: 218, lines: ['house cat', 'lynx'] },
				{ x: 222, y: 218, lines: ['empty'], empty: true },
				{ x: 166, y: 282, lines: ['empty'], empty: true },
			],
		);
		panel(
			narrow ? px : 350,
			narrow ? PH + 16 : 0,
			'Euler',
			'only the overlaps that exist',
			[
				{ label: 'Mammals', cx: 115, cy: 200, r: 100, color: M, lx: 115, ly: 86, anchor: 'middle' },
				{ label: 'Cats', cx: 130, cy: 236, r: 46, color: C, lx: 130, ly: 214, anchor: 'middle' },
				{ label: 'Birds', cx: 268, cy: 170, r: 56, color: B, lx: 268, ly: 100, anchor: 'middle' },
			],
			[
				{ x: 92, y: 140, lines: ['dog', 'whale'] },
				{ x: 130, y: 248, lines: ['house cat', 'lynx'] },
				{ x: 268, y: 172, lines: ['sparrow', 'penguin'] },
			],
		);

		dataTable(
			el,
			[
				{ label: 'Animal', value: (d: (typeof ITEMS)[number]) => d.name },
				{ label: 'Sets', value: (d) => d.sets },
			],
			ITEMS,
		);
	},
};

export default figure;
