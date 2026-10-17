import * as d3 from 'd3';
import { controls, dataTable, isNarrow, readout, select, svg, v, type Figure } from './lib';
import data from './data/8-5-folders.json';

interface Raw {
	name: string;
	size?: number;
	children?: Raw[];
}
type Node = d3.HierarchyNode<Raw>;
type RectNode = d3.HierarchyRectangularNode<Raw>;
type Idiom = 'indent' | 'tree' | 'treemap' | 'icicle' | 'sunburst';

const NOTES: Record<Idiom, string> = {
	indent:
		'Indentation: every name is easy to read, and depth is how far a row is pushed right. But the shape of the whole tree, and which folder is biggest, is hard to see.',
	tree: 'Tidy tree (Reingold-Tilford): same depth, same column; parents centered on their children; no crossings. The structure is clear, but sizes are gone, and a wider tree would need far more height.',
	treemap:
		'Treemap: each folder is a rectangle holding its children, and area is file size. The two photos fill most of the space at once. Small files nearly vanish, and the nesting depth takes effort to read.',
	icicle:
		'Icicle: each level hangs below its parent, and width is size. Depth is now easy to read, at the cost of the space the upper rows take.',
	sunburst:
		'Sunburst: the icicle bent into rings, with the root in the middle. Compact, but angles and curved areas are harder to compare than the icicle’s straight widths.',
};

const kb = (n: number) => `${n} KB`;

const figure: Figure = {
	title: 'One folder, drawn five ways',
	caption:
		'A small website project: three folders, some subfolders and fifteen files, sized in kilobytes. Drawn as indentation, a node-link tidy tree, a treemap, an icicle plot and a sunburst. The data never changes; what you can see easily does.',
	mount(el) {
		// Phone: same five drawings at 1 unit = 1px; the tree gives its labels less room.
		const narrow = isNarrow(el);
		const W = narrow ? el.clientWidth : 680;
		const H = 440;
		const raw = data as Raw;
		// Original order for the outline views, biggest-first for the space-filling ones.
		const outline = d3.hierarchy(raw).sum((d) => d.size ?? 0);
		const sized = () =>
			d3
				.hierarchy(raw)
				.sum((d) => d.size ?? 0)
				.sort((a, b) => b.value! - a.value!);

		const tops = raw.children!.filter((c) => c.children).map((c) => c.name);
		const color = (d: Node) => {
			const top = d.ancestors().find((a) => a.depth === 1);
			const k = top ? tops.indexOf(top.data.name) : -1;
			return k < 0 ? v('dim') : v(`series-${k + 1}`);
		};
		const isFile = (d: Node) => !d.children;
		const label = (d: Node) => (isFile(d) ? d.data.name : `${d.data.name}/`);

		const row = controls(el);
		const root = svg(el, W, H, 'A folder tree of a small website project, drawn as an indented list.');
		const stage = root.append('g');
		const out = readout(el);

		const text = <T extends d3.BaseType>(s: d3.Selection<T, any, any, any>) =>
			s.style('fill', v('ink')).style('font-size', '13px');
		const halo = <T extends d3.BaseType>(s: d3.Selection<T, any, any, any>) =>
			s
				.style('paint-order', 'stroke')
				.style('stroke', v('surface'))
				.style('stroke-width', '3px')
				.style('stroke-linejoin', 'round');

		function indent() {
			const rows: Node[] = [];
			outline.eachBefore((d) => rows.push(d));
			const rh = (H - 8) / rows.length;
			const g = stage
				.selectAll('g')
				.data(rows)
				.join('g')
				.attr('transform', (_, i) => `translate(0,${8 + i * rh})`);
			g.append('rect')
				.attr('x', (d) => (narrow ? 2 : 16) + d.depth * (narrow ? 18 : 26))
				.attr('y', 2)
				.attr('width', 11)
				.attr('height', 11)
				.attr('rx', (d) => (isFile(d) ? 6 : 2))
				.style('fill', color)
				.style('fill-opacity', (d) => (isFile(d) ? 1 : 0.4))
				.style('stroke', color);
			text(g.append('text'))
				.attr('x', (d) => (narrow ? 20 : 34) + d.depth * (narrow ? 18 : 26))
				.attr('y', 8)
				.attr('dy', '0.35em')
				.style('font-weight', (d) => (isFile(d) ? null : '700'))
				.text(label);
			g.append('text')
				.attr('x', W - (narrow ? 2 : 20))
				.attr('y', 8)
				.attr('dy', '0.35em')
				.attr('text-anchor', 'end')
				.style('font-size', '13px')
				.style('fill', (d) => (isFile(d) ? v('ink') : v('muted')))
				.text((d) => kb(d.value!));
		}

		function tree() {
			const t = d3.tree<Raw>().size([H - 30, narrow ? W - 160 : W - 260])(outline.copy());
			const g = stage.append('g').attr('transform', `translate(${narrow ? 62 : 76},15)`);
			g.append('g')
				.selectAll('path')
				.data(t.links())
				.join('path')
				.attr(
					'd',
					d3
						.linkHorizontal<d3.HierarchyPointLink<Raw>, d3.HierarchyPointNode<Raw>>()
						.x((d) => d.y)
						.y((d) => d.x),
				)
				.style('fill', 'none')
				.style('stroke', v('axis'))
				.style('stroke-width', '1.5px');
			const n = g
				.append('g')
				.selectAll('g')
				.data(t.descendants())
				.join('g')
				.attr('transform', (d) => `translate(${d.y},${d.x})`);
			n.append('circle')
				.attr('r', 5)
				.style('fill', color)
				.style('stroke', v('surface'))
				.style('stroke-width', '1.5px');
			halo(text(n.append('text')))
				// Phone: inner folders are labelled above their node, so they don't run into the next column.
				.attr('x', (d) => (isFile(d) ? 9 : narrow && d.depth > 0 ? 0 : -9))
				.attr('dy', (d) => (narrow && !isFile(d) && d.depth > 0 ? '-0.7em' : '0.35em'))
				.attr('text-anchor', (d) => (isFile(d) ? 'start' : narrow && d.depth > 0 ? 'middle' : 'end'))
				.text(label);
		}

		function treemap() {
			const t = d3.treemap<Raw>().size([W, H]).paddingOuter(3).paddingTop(19).paddingInner(2).round(true)(sized());
			const g = stage
				.selectAll('g')
				.data(t.descendants())
				.join('g')
				.attr('transform', (d) => `translate(${d.x0},${d.y0})`);
			g.append('rect')
				.attr('width', (d) => d.x1 - d.x0)
				.attr('height', (d) => d.y1 - d.y0)
				.style('fill', (d) => (d.depth === 0 ? v('grid') : color(d)))
				.style('fill-opacity', (d) => (d.depth === 0 ? 1 : isFile(d) ? 0.5 : 0.18));
			const fits = (d: RectNode) => d.x1 - d.x0 > label(d).length * 7 + 8 && d.y1 - d.y0 > 17;
			text(g.filter(fits).append('text'))
				.attr('x', 5)
				.attr('y', 13)
				.style('font-weight', (d) => (isFile(d) ? null : '700'))
				.text(label);
			g.filter((d) => isFile(d) && fits(d) && d.y1 - d.y0 > 36)
				.append('text')
				.attr('x', 5)
				.attr('y', 30)
				.style('fill', v('ink'))
				.style('font-size', '12px')
				.text((d) => kb(d.value!));
		}

		function icicle() {
			const t = d3.partition<Raw>().size([W, H]).padding(2)(sized());
			const g = stage
				.selectAll('g')
				.data(t.descendants())
				.join('g')
				.attr('transform', (d) => `translate(${d.x0},${d.y0})`);
			g.append('rect')
				.attr('width', (d) => Math.max(0.5, d.x1 - d.x0))
				.attr('height', (d) => d.y1 - d.y0)
				.style('fill', (d) => (d.depth === 0 ? v('grid') : color(d)))
				.style('fill-opacity', (d) => (d.depth === 0 ? 1 : isFile(d) ? 0.5 : 0.25));
			text(g.filter((d) => d.x1 - d.x0 > label(d).length * 7 + 8).append('text'))
				.attr('x', 5)
				.attr('y', 18)
				.style('font-weight', (d) => (isFile(d) ? null : '700'))
				.text(label);
		}

		function sunburst() {
			const R = Math.min(W, H) / 2 - 4;
			const t = d3.partition<Raw>().size([2 * Math.PI, R])(sized());
			const g = stage.append('g').attr('transform', `translate(${W / 2},${H / 2})`);
			const arc = d3
				.arc<RectNode>()
				.startAngle((d) => d.x0)
				.endAngle((d) => d.x1)
				.innerRadius((d) => d.y0)
				.outerRadius((d) => d.y1 - 1)
				.padAngle(0.006);
			g.selectAll('path')
				.data(t.descendants())
				.join('path')
				.attr('d', arc)
				.style('fill', (d) => (d.depth === 0 ? v('grid') : color(d)))
				.style('fill-opacity', (d) => (d.depth === 0 ? 1 : isFile(d) ? 0.5 : 0.25));
			const fits = (d: RectNode) => (d.x1 - d.x0) * ((d.y0 + d.y1) / 2) > label(d).length * 7 + 6 || d.depth === 0;
			halo(text(g.append('g').selectAll('text').data(t.descendants().filter(fits)).join('text')))
				.attr('transform', (d) => {
					if (d.depth === 0) return '';
					const a = (d.x0 + d.x1) / 2 - Math.PI / 2;
					const r = (d.y0 + d.y1) / 2;
					return `translate(${Math.cos(a) * r},${Math.sin(a) * r})`;
				})
				.attr('dy', '0.35em')
				.attr('text-anchor', 'middle')
				.style('font-weight', (d) => (isFile(d) ? null : '700'))
				.text(label);
		}

		const DRAW: Record<Idiom, () => void> = { indent, tree, treemap, icicle, sunburst };
		const ARIA: Record<Idiom, string> = {
			indent: 'an indented list',
			tree: 'a node-link tidy tree',
			treemap: 'a treemap with area showing file size',
			icicle: 'an icicle plot with width showing file size',
			sunburst: 'a sunburst with angle showing file size',
		};
		function show(idiom: Idiom) {
			stage.selectAll('*').remove();
			DRAW[idiom]();
			root.attr('aria-label', `A folder tree of a small website project, drawn as ${ARIA[idiom]}.`);
			out.textContent = NOTES[idiom];
		}

		select<Idiom>(
			row,
			'Draw it as',
			[
				{ value: 'indent', label: 'Indentation' },
				{ value: 'tree', label: 'Node-link (tidy tree)' },
				{ value: 'treemap', label: 'Treemap' },
				{ value: 'icicle', label: 'Icicle' },
				{ value: 'sunburst', label: 'Sunburst' },
			],
			show,
			'indent',
		);
		show('indent');

		const rows: Node[] = [];
		outline.eachBefore((d) => d.depth > 0 && rows.push(d));
		dataTable(
			el,
			[
				{
					label: 'Path',
					value: (d: Node) =>
						d
							.ancestors()
							.reverse()
							.map((a) => a.data.name)
							.join('/') + (isFile(d) ? '' : '/'),
				},
				{ label: 'Kind', value: (d) => (isFile(d) ? 'File' : 'Folder') },
				{ label: 'Size (KB)', value: (d) => d.value!, numeric: true },
			],
			rows,
		);
	},
};

export default figure;
