import type * as d3 from 'd3';
import { isNarrow, svg, v, type Figure } from './lib';

/** Greedy word wrap to at most n characters per line. */
function wrap(s: string, n: number): string[] {
	const out: string[] = [];
	for (const w of s.split(' ')) {
		const last = out[out.length - 1];
		if (last !== undefined && last.length + 1 + w.length <= n) out[out.length - 1] = `${last} ${w}`;
		else out.push(w);
	}
	return out;
}

// Data products (boxes) and the steps between them (arrows), with the sunshine map
// from the next section as a running example.
const PRODUCTS = [
	{ name: 'Raw data', eg: '382 cities × 12 months, one row per city' },
	{ name: 'Processed data', eg: 'one row per city and month, names fixed' },
	{ name: 'Focus data', eg: 'the month picked by the slider' },
	{ name: 'Marks and visual properties', eg: 'country shapes with a fill color' },
	{ name: 'Image', eg: 'the map on screen' },
];
const STEPS = ['Data analysis', 'Filtering', 'Mapping', 'Rendering'];

const figure: Figure = {
	title: 'The visualization pipeline',
	caption:
		'Each step turns one data product into the next. Domain knowledge and the task sit over the whole chain, and the choices made early on, in analysis and filtering, already shape the picture. The grey notes follow my sunshine map, described below.',
	credit: 'After the INF252 course slides.',
	mount(el) {
		// Phone layout: SVG as wide as the body, the "shape every step" label turned to run
		// along the bracket, and the grey notes wrapped onto two lines.
		const narrow = isNarrow(el);
		const W = narrow ? el.clientWidth : 460;
		const x0 = narrow ? 4 : 16;
		const boxW = narrow ? W - x0 - 44 : 300;
		const wrapAt = narrow ? Math.floor((boxW - 20) / 6.6) : 99;
		const lines = (s: string) => wrap(s, wrapAt);
		const boxH = narrow ? 50 + 16 * (Math.max(...PRODUCTS.map((p) => lines(p.eg).length)) - 1) : 50;
		const gap = 42;
		const ctxW = narrow ? (W - x0 * 2 - 12) / 2 : 200;
		const ctxWrap = narrow ? Math.floor((ctxW - 20) / 6.6) : 99;
		const ctxH = narrow ? 50 + 16 * (Math.max(...['what the numbers mean', 'the question you ask'].map((s) => wrap(s, ctxWrap).length)) - 1) : 50;
		const top = ctxH + 42;
		const H = top + PRODUCTS.length * boxH + (PRODUCTS.length - 1) * gap + 12;
		const root = svg(
			el,
			W,
			H,
			'Diagram of the visualization pipeline. Raw data goes through data analysis to processed data, filtering to focus data, mapping to marks and visual properties, and rendering to an image. Domain and task sit above and frame every step.',
		);
		const defs = root.append('defs');
		defs.append('marker')
			.attr('id', 'fig21-arrow')
			.attr('viewBox', '0 0 10 10')
			.attr('refX', 9)
			.attr('refY', 5)
			.attr('markerWidth', 7)
			.attr('markerHeight', 7)
			.attr('orient', 'auto')
			.append('path')
			.attr('d', 'M0,0 L10,5 L0,10 z')
			.style('fill', v('muted'));

		const multi = (t: d3.Selection<SVGTextElement, unknown, null, undefined>, x: number, ls: string[]) =>
			ls.forEach((l, i) => t.append('tspan').attr('x', x).attr('dy', i ? 16 : 0).text(l));

		// Domain and task: two boxes on top, a bracket down the right side over every step.
		const ctx = [
			{ name: 'Domain', eg: 'what the numbers mean', x: x0 },
			{ name: 'Task', eg: 'the question you ask', x: x0 + ctxW + (narrow ? 12 : 20) },
		];
		const cg = root.append('g');
		for (const c of ctx) {
			cg.append('rect')
				.attr('x', c.x)
				.attr('y', 8)
				.attr('width', ctxW)
				.attr('height', ctxH)
				.attr('rx', 6)
				.style('fill', 'none')
				.style('stroke', v('series-2'))
				.style('stroke-width', 2)
				.style('stroke-dasharray', '6 4');
			cg.append('text').attr('x', c.x + 12).attr('y', 30).style('fill', v('ink')).style('font-size', '15px').style('font-weight', '700').text(c.name);
			multi(cg.append('text').attr('y', 48).style('fill', v('muted')).style('font-size', '13px'), c.x + 12, wrap(c.eg, ctxWrap));
		}
		const bx = x0 + boxW + (narrow ? 4 : 24);
		const bTop = top;
		const bBot = H - 12;
		const cTop = 8 + ctxH;
		cg.append('path')
			.attr('d', `M${ctx[0].x + ctxW / 2},${cTop} V${top - 18} H${bx + 20} M${ctx[1].x + ctxW / 2},${cTop} V${top - 18} M${bx + 20},${top - 18} V${bBot} M${bx + 20},${bTop} H${bx + 10} M${bx + 20},${bBot} H${bx + 10}`)
			.style('fill', 'none')
			.style('stroke', v('series-2'))
			.style('stroke-width', 2)
			.style('stroke-dasharray', '6 4');
		if (narrow) {
			cg.append('text')
				.attr('transform', `translate(${bx + 24},${(bTop + bBot) / 2}) rotate(90)`)
				.attr('text-anchor', 'middle')
				.style('fill', v('ink'))
				.style('font-size', '13px')
				.text('shape every step');
		} else {
			cg.append('text')
				.attr('x', bx + 30)
				.attr('y', (bTop + bBot) / 2 - 8)
				.style('fill', v('ink'))
				.style('font-size', '13px')
				.text('shape');
			cg.append('text')
				.attr('x', bx + 30)
				.attr('y', (bTop + bBot) / 2 + 10)
				.style('fill', v('ink'))
				.style('font-size', '13px')
				.text('every step');
		}

		const g = root.append('g');
		PRODUCTS.forEach((p, i) => {
			const y = top + i * (boxH + gap);
			g.append('rect')
				.attr('x', x0)
				.attr('y', y)
				.attr('width', boxW)
				.attr('height', boxH)
				.attr('rx', 6)
				.style('fill', i === PRODUCTS.length - 1 ? v('series-1') : v('surface'))
				.style('fill-opacity', i === PRODUCTS.length - 1 ? 0.15 : 1)
				.style('stroke', v('series-1'))
				.style('stroke-width', 2);
			g.append('text').attr('x', x0 + 12).attr('y', y + 21).style('fill', v('ink')).style('font-size', '15px').style('font-weight', '700').text(p.name);
			multi(g.append('text').attr('y', y + 40).style('fill', v('muted')).style('font-size', '13px'), x0 + 12, lines(p.eg));
			if (i < STEPS.length) {
				const ay = y + boxH;
				g.append('line')
					.attr('x1', x0 + 40)
					.attr('x2', x0 + 40)
					.attr('y1', ay + 2)
					.attr('y2', ay + gap - 2)
					.attr('marker-end', 'url(#fig21-arrow)')
					.style('stroke', v('muted'))
					.style('stroke-width', 2);
				g.append('text')
					.attr('x', x0 + 56)
					.attr('y', ay + gap / 2 + 5)
					.style('fill', v('ink'))
					.style('font-size', '14px')
					.style('font-style', 'italic')
					.text(STEPS[i]);
			}
		});
	},
};

export default figure;
