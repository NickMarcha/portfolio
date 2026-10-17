import { svg, v, type Figure } from './lib';

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
		const W = 460;
		const boxW = 300;
		const boxH = 50;
		const gap = 42;
		const top = 92;
		const x0 = 16;
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

		// Domain and task: two boxes on top, a bracket down the right side over every step.
		const ctx = [
			{ name: 'Domain', eg: 'what the numbers mean', x: x0 },
			{ name: 'Task', eg: 'the question you ask', x: x0 + 220 },
		];
		const cg = root.append('g');
		for (const c of ctx) {
			cg.append('rect')
				.attr('x', c.x)
				.attr('y', 8)
				.attr('width', 200)
				.attr('height', 50)
				.attr('rx', 6)
				.style('fill', 'none')
				.style('stroke', v('series-2'))
				.style('stroke-width', 2)
				.style('stroke-dasharray', '6 4');
			cg.append('text').attr('x', c.x + 12).attr('y', 30).style('fill', v('ink')).style('font-size', '15px').style('font-weight', '700').text(c.name);
			cg.append('text').attr('x', c.x + 12).attr('y', 48).style('fill', v('muted')).style('font-size', '13px').text(c.eg);
		}
		const bx = x0 + boxW + 24;
		const bTop = top;
		const bBot = H - 12;
		cg.append('path')
			.attr('d', `M${x0 + 100},58 V${top - 18} H${bx + 20} M${x0 + 320},58 V${top - 18} M${bx + 20},${top - 18} V${bBot} M${bx + 20},${bTop} H${bx + 10} M${bx + 20},${bBot} H${bx + 10}`)
			.style('fill', 'none')
			.style('stroke', v('series-2'))
			.style('stroke-width', 2)
			.style('stroke-dasharray', '6 4');
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
			g.append('text').attr('x', x0 + 12).attr('y', y + 40).style('fill', v('muted')).style('font-size', '13px').text(p.eg);
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
