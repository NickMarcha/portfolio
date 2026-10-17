import * as d3 from 'd3';
import { button, controls, dataTable, readout, reducedMotion, rng, select, svg, v, type Figure } from './lib';
import data from './data/8-1-miserables.json';

interface N extends d3.SimulationNodeDatum {
	i: number;
	name: string;
	degree: number;
	weight: number;
}
interface L extends d3.SimulationLinkDatum<N> {
	value: number;
}

// "Mme.Thenardier" -> "Mme. Thenardier"
const pretty = (s: string) => s.replace(/\.(?=\S)/g, '. ');

const figure: Figure = {
	title: 'Les Misérables as dots and lines',
	caption:
		'Characters in Victor Hugo’s novel, linked when they appear in the same chapter. A force-directed layout pulls linked characters together, and the groups form on their own. Start again from new random positions: the network is the same, the picture is not. Drag a character to pull on the springs.',
	credit:
		'Data: Les Misérables co-appearance network from D. E. Knuth, The Stanford GraphBase (1993), via vega-datasets. Layout: d3-force.',
	mount(el) {
		const W = 680;
		const H = 470;
		const pad = 14;

		const nodes: N[] = data.nodes.map((n, i) => ({ i, name: pretty(n.name), degree: 0, weight: 0 }));
		const links: L[] = data.links.map((l) => ({ source: l.source, target: l.target, value: l.value }));
		const nbrs = nodes.map(() => new Set<number>());
		for (const l of data.links) {
			nodes[l.source].degree++;
			nodes[l.target].degree++;
			nodes[l.source].weight += l.value;
			nodes[l.target].weight += l.value;
			nbrs[l.source].add(l.target);
			nbrs[l.target].add(l.source);
		}
		const labelled = new Set([...nodes].sort((a, b) => b.weight - a.weight).slice(0, 8).map((n) => n.i));
		labelled.add(0); // Myriel, so the separate bishop cluster has a name
		const r = d3.scaleSqrt().domain([1, d3.max(nodes, (n) => n.degree)!]).range([4, 11]);
		const w = d3.scaleLinear().domain([1, d3.max(links, (l) => l.value)!]).range([1, 5]);

		const row = controls(el);
		const root = svg(
			el,
			W,
			H,
			'Node-link diagram of 77 Les Misérables characters and their 254 co-appearance links, laid out by a force simulation.',
		);
		const linkG = root.append('g').attr('stroke-linecap', 'round');
		const nodeG = root.append('g');
		const labelG = root.append('g').style('pointer-events', 'none');
		const out = readout(el);

		let selected = -1;
		let run = 1;
		let sim: d3.Simulation<N, L> | null = null;

		const linkSel = linkG
			.selectAll('line')
			.data(links)
			.join('line')
			.style('stroke-width', (d) => `${w(d.value)}px`);
		const nodeSel = nodeG
			.selectAll<SVGCircleElement, N>('circle')
			.data(nodes)
			.join('circle')
			.attr('r', (d) => r(d.degree))
			.style('stroke', v('surface'))
			.style('stroke-width', '1.5px')
			.style('cursor', 'grab');
		nodeSel.append('title').text((d) => `${d.name}: ${d.degree} co-stars`);
		const labelSel = labelG
			.selectAll('text')
			.data(nodes)
			.join('text')
			.attr('dy', '0.35em')
			.style('font-size', '13px')
			.style('fill', v('ink'))
			.style('paint-order', 'stroke')
			.style('stroke', v('surface'))
			.style('stroke-width', '3px')
			.style('stroke-linejoin', 'round')
			.text((d) => d.name);

		function paint() {
			const on = selected >= 0;
			const near = (i: number) => i === selected || (on && nbrs[selected].has(i));
			linkSel
				.style('stroke', (d) =>
					on && ((d.source as N).i === selected || (d.target as N).i === selected) ? v('highlight') : v('dim'),
				)
				.style('stroke-opacity', (d) =>
					!on ? 0.8 : (d.source as N).i === selected || (d.target as N).i === selected ? 0.9 : 0.25,
				);
			nodeSel
				.style('fill', (d) => (d.i === selected ? v('highlight') : v('series-1')))
				.style('fill-opacity', (d) => (!on || near(d.i) ? 1 : 0.25));
			labelSel.style('display', (d) => (d.i === selected || (!on && labelled.has(d.i)) ? null : 'none'));
			if (on) {
				const n = nodes[selected];
				out.textContent = `${n.name} shares at least one chapter with ${n.degree} other characters. They stay lit; everyone else fades.`;
			} else {
				out.textContent =
					run === 1
						? 'Layout 1, from a fixed starting seed, so it looks the same on every visit.'
						: `Layout ${run}, from new random starting positions. Same 77 characters and 254 links, different picture.`;
			}
		}

		function place() {
			for (const n of nodes) {
				const rr = r(n.degree);
				n.x = Math.max(pad + rr, Math.min(W - pad - rr, n.x!));
				n.y = Math.max(pad + rr, Math.min(H - pad - rr, n.y!));
			}
			linkSel
				.attr('x1', (d) => (d.source as N).x!)
				.attr('y1', (d) => (d.source as N).y!)
				.attr('x2', (d) => (d.target as N).x!)
				.attr('y2', (d) => (d.target as N).y!);
			nodeSel.attr('cx', (d) => d.x!).attr('cy', (d) => d.y!);
			labelSel
				.attr('x', (d) => d.x! + (d.x! > W - 120 ? -1 : 1) * (r(d.degree) + 4))
				.attr('y', (d) => d.y!)
				.attr('text-anchor', (d) => (d.x! > W - 120 ? 'end' : 'start'));
		}

		function start(seed: number) {
			sim?.stop();
			const rand = rng(seed);
			for (const n of nodes) {
				n.x = pad + rand() * (W - 2 * pad);
				n.y = pad + rand() * (H - 2 * pad);
				n.vx = n.vy = 0;
				n.fx = n.fy = null;
			}
			sim = d3
				.forceSimulation(nodes)
				.randomSource(rng(seed + 1))
				.force(
					'link',
					d3
						.forceLink<N, L>(links)
						.id((d) => d.i)
						.distance((d) => 60 - 4 * Math.min(8, d.value)),
				)
				.force('charge', d3.forceManyBody().strength(-150))
				.force('x', d3.forceX(W / 2).strength(0.035))
				.force('y', d3.forceY(H / 2).strength(0.07))
				.force('collide', d3.forceCollide<N>((d) => r(d.degree) + 1.5))
				.on('tick', place);
			if (reducedMotion()) {
				sim.stop();
				sim.tick(320);
				place();
			}
			paint();
		}

		nodeSel.call(
			d3
				.drag<SVGCircleElement, N>()
				.on('start', (e, d) => {
					if (!e.active && !reducedMotion()) sim?.alphaTarget(0.3).restart();
					d.fx = d.x;
					d.fy = d.y;
				})
				.on('drag', (e, d) => {
					d.fx = Math.max(pad, Math.min(W - pad, e.x));
					d.fy = Math.max(pad, Math.min(H - pad, e.y));
					if (reducedMotion()) {
						// No running simulation: move the node and its links straight away.
						d.x = d.fx;
						d.y = d.fy;
						place();
					}
				})
				.on('end', (e, d) => {
					if (!e.active) sim?.alphaTarget(0);
					d.fx = d.fy = null;
				}),
		);

		const byName = [...nodes].sort((a, b) => a.name.localeCompare(b.name));
		const pick = select(
			row,
			'Highlight',
			[{ value: '-1', label: 'Nobody' }, ...byName.map((n) => ({ value: String(n.i), label: n.name }))],
			(val) => {
				selected = Number(val);
				paint();
			},
			'-1',
		);
		nodeSel.on('click', (_, d) => {
			selected = selected === d.i ? -1 : d.i;
			pick.value = String(selected);
			paint();
		});
		button(row, 'Start again from new random positions', () => {
			run++;
			start(1000 + run * 7);
		});

		start(1000);
		dataTable(
			el,
			[
				{ label: 'Character', value: (d: N) => d.name },
				{ label: 'Co-stars', value: (d: N) => d.degree, numeric: true },
				{ label: 'Co-appearances, summed over pairs', value: (d: N) => d.weight, numeric: true },
			],
			[...nodes].sort((a, b) => b.weight - a.weight),
		);
		return () => sim?.stop();
	},
};

export default figure;
