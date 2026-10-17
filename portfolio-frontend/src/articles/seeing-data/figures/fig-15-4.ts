import * as d3 from 'd3';
import { type Figure, v } from './lib';

// Author-controlled steps: solid lines and filled nodes in series 1.
// Reader-chosen paths: dashed lines and hollow nodes in series 2. Never hue alone.
type G = d3.Selection<SVGGElement, unknown, null, undefined>;

function node(g: G, x: number, y: number, author: boolean, r = 7) {
	g.append('circle')
		.attr('cx', x)
		.attr('cy', y)
		.attr('r', r)
		.style('fill', author ? v('series-1') : v('surface'))
		.style('stroke', author ? v('series-1') : v('series-2'))
		.style('stroke-width', 2);
}
function edge(g: G, x1: number, y1: number, x2: number, y2: number, author: boolean) {
	g.append('line')
		.attr('x1', x1)
		.attr('y1', y1)
		.attr('x2', x2)
		.attr('y2', y2)
		.style('stroke', author ? v('series-1') : v('series-2'))
		.style('stroke-width', 2)
		.style('stroke-dasharray', author ? 'none' : '4 3');
}

const STRUCTURES = [
	{
		name: 'Martini glass',
		text: 'A narrow stem: the author tells the story step by step. Then the glass opens and the reader explores freely.',
		label: 'Diagram: four author-led steps in a row, then many reader paths fanning out from the last one.',
		draw(g: G) {
			const xs = [16, 46, 76, 106];
			for (let i = 1; i < xs.length; i++) edge(g, xs[i - 1], 60, xs[i], 60, true);
			const ends = [18, 39, 60, 81, 102];
			for (const y of ends) edge(g, 106, 60, 186, y, false);
			for (const x of xs) node(g, x, 60, true);
			for (const y of ends) node(g, 186, y, false, 6);
		},
	},
	{
		name: 'Interactive slideshow',
		text: 'The author sets the order of the slides. Inside each slide, the reader can stop and explore.',
		label: 'Diagram: four slides in a fixed row, each with two small reader paths branching off below.',
		draw(g: G) {
			const xs = [22, 74, 126, 178];
			for (let i = 1; i < xs.length; i++) edge(g, xs[i - 1] + 14, 40, xs[i] - 14, 40, true);
			for (const x of xs) {
				edge(g, x, 50, x - 10, 92, false);
				edge(g, x, 50, x + 10, 92, false);
				node(g, x - 10, 92, false, 5);
				node(g, x + 10, 92, false, 5);
				g.append('rect')
					.attr('x', x - 14)
					.attr('y', 28)
					.attr('width', 28)
					.attr('height', 22)
					.attr('rx', 3)
					.style('fill', v('series-1'));
			}
		},
	},
	{
		name: 'Drill-down story',
		text: 'The author sets a general theme. The reader picks which parts to open, and in what order.',
		label: 'Diagram: one central author node with five reader paths around it, two of which branch again.',
		draw(g: G) {
			const cx = 100;
			const cy = 60;
			const spokes = d3.range(5).map((i) => (i / 5) * 2 * Math.PI - Math.PI / 2);
			for (const [i, a] of spokes.entries()) {
				const x = cx + Math.cos(a) * 44;
				const y = cy + Math.sin(a) * 44;
				edge(g, cx, cy, x, y, false);
				if (i === 1 || i === 3) {
					const x2 = cx + Math.cos(a) * 82;
					const y2 = cy + Math.sin(a) * 50;
					edge(g, x, y, x2, y2, false);
					node(g, x2, y2, false, 5);
				}
				node(g, x, y, false, 6);
			}
			node(g, cx, cy, true, 10);
		},
	},
];

const figure: Figure = {
	title: 'From author-driven to reader-driven',
	caption:
		'Segel and Heer place data stories on a spectrum. Three common structures sit in between, each mixing a fixed path set by the author with room for the reader to explore.',
	credit: 'After Segel and Heer 2010.',
	mount(el) {
		// The spectrum, in HTML so its text stays readable on phones.
		const spec = document.createElement('div');
		spec.style.cssText =
			'display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; margin-bottom: 14px; font-size: 14px;';
		const bar = document.createElement('div');
		bar.setAttribute('aria-hidden', 'true');
		bar.style.cssText = `grid-column: 1 / -1; height: 8px; border-radius: 4px; background: linear-gradient(to right, ${v('series-1')}, ${v('series-2')});`;
		const left = document.createElement('div');
		left.innerHTML =
			'<strong>Author-driven</strong><br>Fixed order, lots of explanation, little interaction. Like a documentary, or the NYT’s “My Life With Long Covid”.';
		const right = document.createElement('div');
		right.style.textAlign = 'right';
		right.innerHTML =
			'<strong>Reader-driven</strong><br>No fixed order, little explanation, lots of interaction. Like a dashboard, or the OECD Better Life Index.';
		spec.append(bar, left, right);
		el.append(spec);

		const cards = document.createElement('div');
		cards.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;';
		for (const s of STRUCTURES) {
			const card = document.createElement('div');
			card.style.cssText = 'border: 1px solid var(--viz-axis); border-radius: 6px; padding: 10px 12px;';
			const root = d3
				.select(card)
				.append('svg')
				.attr('viewBox', '0 0 200 110')
				.attr('width', '100%')
				.attr('role', 'img')
				.attr('aria-label', s.label)
				.style('max-width', '240px')
				.style('display', 'block')
				.style('margin', '0 auto 6px');
			s.draw(root.append('g') as unknown as G);
			const h = document.createElement('p');
			h.style.cssText = 'margin: 0 0 4px; font-weight: 700;';
			h.textContent = s.name;
			const p = document.createElement('p');
			p.style.cssText = 'margin: 0; font-size: 14px;';
			p.textContent = s.text;
			card.append(h, p);
			cards.append(card);
		}
		el.append(cards);

		const key = document.createElement('p');
		key.style.cssText = 'margin: 10px 0 0; font-size: 13px; color: var(--viz-muted);';
		key.innerHTML = `<svg width="34" height="10" aria-hidden="true" style="display: inline-block; vertical-align: middle"><line x1="2" y1="5" x2="32" y2="5" style="stroke: ${v('series-1')}; stroke-width: 2"/></svg> solid, filled: the author’s path &nbsp; <svg width="34" height="10" aria-hidden="true" style="display: inline-block; vertical-align: middle"><line x1="2" y1="5" x2="32" y2="5" style="stroke: ${v('series-2')}; stroke-width: 2; stroke-dasharray: 4 3"/></svg> dashed, hollow: the reader’s choice`;
		el.append(key);
	},
};

export default figure;
