import * as d3 from 'd3';
import { dataTable, isNarrow, svg, v, type Figure } from './lib';

// One made-up work week, hours counted from Monday 00:00.
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const EVENTS = [
	{ name: 'Plan', start: 8, end: 11 },
	{ name: 'Build', start: 12, end: 2 * 24 + 16 },
	{ name: 'Test', start: 3 * 24 + 10, end: 3 * 24 + 14 },
	{ name: 'Fix', start: 3 * 24 + 15, end: 4 * 24 + 9 },
	{ name: 'Launch', start: 4 * 24 + 13, end: 4 * 24 + 14 },
];
type Ev = (typeof EVENTS)[number];
// Free positions for the connection, labels and brightness panels. They mean nothing on purpose.
const FREE = [
	[30, 30],
	[140, 100],
	[110, 24],
	[225, 50],
	[250, 118],
];
const when = (h: number) => `${DAYS[Math.floor(h / 24)]} ${String(h % 24).padStart(2, '0')}:00`;

const figure: Figure = {
	title: 'Six ways to carry time',
	caption:
		'The same five steps of a made-up work week, shown with each of the visual properties that can carry time: position, length, angle, connection, labels and brightness.',
	mount(el) {
		const narrow = isNarrow(el);
		// Phones: one panel per row, full width.
		const cols = narrow ? 1 : 2;
		const W = narrow ? el.clientWidth : 680;
		const pw = narrow ? W : 320;
		const ph = 150;
		const gapX = W - 2 * pw;
		const head = 40;
		const H = (6 / cols) * (ph + head) + 4;
		// Squeeze the free positions so the labels still fit a narrow panel.
		const sx = narrow ? Math.min(1, (pw - 70) / 250) : 1;
		const free = FREE.map(([fx, fy]) => [fx * sx, fy]);
		const root = svg(
			el,
			W,
			H,
			'Six small panels showing the same five events of a work week by position, length, angle, connection, labels and brightness.',
		);
		const x = d3.scaleLinear().domain([0, 5 * 24]).range([16, pw - 16]);

		const panels = [
			{ title: 'Position', note: 'When it starts, along a time axis', draw: position },
			{ title: 'Length', note: 'How long it lasts, as a bar', draw: length },
			{ title: 'Angle', note: 'Start time on a clock face; the day is lost', draw: angle },
			{ title: 'Connection', note: 'What comes after what', draw: connection },
			{ title: 'Labels', note: 'Exact dates, wherever the marks sit', draw: labels },
			{ title: 'Brightness', note: 'Older steps fade back', draw: brightness },
		];

		panels.forEach((p, i) => {
			const g = root.append('g').attr('transform', `translate(${(i % cols) * (pw + gapX)},${Math.floor(i / cols) * (ph + head)})`);
			g.append('text').attr('y', 14).style('font-size', '14px').style('font-weight', '700').style('fill', v('ink')).text(p.title);
			g.append('text').attr('y', 31).style('font-size', '12px').style('fill', v('muted')).text(p.note);
			p.draw(g.append('g').attr('transform', `translate(0,${head})`));
		});

		type G = d3.Selection<SVGGElement, unknown, null, undefined>;
		function ink(s: d3.Selection<SVGTextElement, any, any, any>) {
			return s.style('fill', v('ink')).style('font-size', '12px');
		}
		function dayAxis(g: G, y: number) {
			g.append('line').attr('x1', x(0)).attr('x2', x(120)).attr('y1', y).attr('y2', y).style('stroke', v('axis'));
			g.selectAll(null)
				.data(DAYS)
				.join('text')
				.attr('x', (_, i) => x(i * 24 + 12))
				.attr('y', y + 16)
				.attr('text-anchor', 'middle')
				.style('font-size', '12px')
				.style('fill', v('muted'))
				.text((d) => d);
			g.selectAll(null)
				.data(d3.range(6))
				.join('line')
				.attr('x1', (d) => x(d * 24))
				.attr('x2', (d) => x(d * 24))
				.attr('y1', y - 4)
				.attr('y2', y + 4)
				.style('stroke', v('axis'));
		}
		function position(g: G) {
			dayAxis(g, 100);
			const n = g.selectAll(null).data(EVENTS).join('g').attr('transform', (d, i) => `translate(${x(d.start)},${i % 2 ? 62 : 32})`);
			n.append('line').attr('y2', (_, i) => (i % 2 ? 38 : 68)).style('stroke', v('grid'));
			n.append('circle').attr('r', 5).style('fill', v('series-1'));
			ink(n.append('text')).attr('y', -9).attr('text-anchor', 'middle').text((d) => d.name);
		}
		function length(g: G) {
			dayAxis(g, 116);
			const n = g.selectAll(null).data(EVENTS).join('g').attr('transform', (d, i) => `translate(0,${4 + i * 21})`);
			n.append('rect')
				.attr('x', (d) => x(d.start))
				.attr('width', (d) => Math.max(3, x(d.end) - x(d.start)))
				.attr('height', 14)
				.attr('rx', 2)
				.style('fill', v('series-1'));
			ink(n.append('text'))
				.attr('x', (d) => (d.start > 60 ? x(d.start) - 5 : x(d.end) + 5))
				.attr('y', 7)
				.attr('dy', '0.35em')
				.attr('text-anchor', (d) => (d.start > 60 ? 'end' : 'start'))
				.text((d) => d.name);
		}
		function angle(g: G) {
			const r = 48;
			const c = g.append('g').attr('transform', `translate(${pw / 2},${ph / 2 + 2})`);
			c.append('circle').attr('r', r).style('fill', 'none').style('stroke', v('axis'));
			const a = (h: number) => ((h % 12) / 12) * 2 * Math.PI - Math.PI / 2;
			// Hour ticks all round; numbers only where no event label sits.
			c.selectAll(null)
				.data([6, 9])
				.join('text')
				.attr('x', (h) => Math.cos(a(h)) * (r - 12))
				.attr('y', (h) => Math.sin(a(h)) * (r - 12))
				.attr('dy', '0.35em')
				.attr('text-anchor', 'middle')
				.style('font-size', '12px')
				.style('fill', v('muted'))
				.text((h) => String(h));
			c.selectAll(null)
				.data(d3.range(12))
				.join('line')
				.attr('x1', (h) => Math.cos(a(h)) * (r - 4))
				.attr('y1', (h) => Math.sin(a(h)) * (r - 4))
				.attr('x2', (h) => Math.cos(a(h)) * r)
				.attr('y2', (h) => Math.sin(a(h)) * r)
				.style('stroke', v('axis'));
			const n = c.selectAll(null).data(EVENTS).join('g');
			n.append('line')
				.attr('x2', (d) => Math.cos(a(d.start)) * r)
				.attr('y2', (d) => Math.sin(a(d.start)) * r)
				.style('stroke', v('series-1'))
				.style('stroke-width', '2px');
			n.append('circle')
				.attr('cx', (d) => Math.cos(a(d.start)) * r)
				.attr('cy', (d) => Math.sin(a(d.start)) * r)
				.attr('r', 4.5)
				.style('fill', v('series-1'));
			ink(n.append('text'))
				.attr('x', (d) => Math.cos(a(d.start)) * (r + 10))
				.attr('y', (d) => Math.sin(a(d.start)) * (r + 10))
				.attr('dy', '0.35em')
				// Labels near the top of the dial go left, out of the way of a label just past the hour.
				.attr('text-anchor', (d) => (Math.cos(a(d.start)) < 0.2 ? 'end' : 'start'))
				.text((d) => `${d.name} ${String(d.start % 24).padStart(2, '0')}:00`);
		}
		function connection(g: G) {
			const defs = g.append('defs');
			defs.append('marker')
				.attr('id', 'fig92-arrow')
				.attr('viewBox', '0 0 10 10')
				.attr('refX', 9)
				.attr('refY', 5)
				.attr('markerWidth', 7)
				.attr('markerHeight', 7)
				.attr('orient', 'auto')
				.append('path')
				.attr('d', 'M0,0L10,5L0,10z')
				.style('fill', v('muted'));
			for (let i = 0; i < free.length - 1; i++) {
				const [x1, y1] = free[i];
				const [x2, y2] = free[i + 1];
				const d = Math.hypot(x2 - x1, y2 - y1);
				const k = 10 / d;
				g.append('line')
					.attr('x1', x1 + (x2 - x1) * k)
					.attr('y1', y1 + (y2 - y1) * k)
					.attr('x2', x2 - (x2 - x1) * k)
					.attr('y2', y2 - (y2 - y1) * k)
					.attr('marker-end', 'url(#fig92-arrow)')
					.style('stroke', v('muted'))
					.style('stroke-width', '1.5px');
			}
			nodes(g, () => 1);
		}
		function nodes(g: G, op: (d: Ev, i: number) => number, sub?: (d: Ev) => string) {
			const n = g.selectAll(null).data(EVENTS).join('g').attr('transform', (_, i) => `translate(${free[i][0]},${free[i][1]})`);
			n.append('circle').attr('r', 6).style('fill', v('series-1')).style('fill-opacity', op);
			ink(n.append('text'))
				.attr('x', 10)
				.attr('dy', '0.35em')
				.style('fill-opacity', (d, i) => Math.max(0.55, op(d, i)))
				.text((d) => d.name);
			if (sub)
				n.append('text')
					.attr('x', 10)
					.attr('y', 15)
					.attr('dy', '0.35em')
					.style('font-size', '12px')
					.style('fill', v('muted'))
					.text(sub);
		}
		function labels(g: G) {
			nodes(g, () => 1, (d) => when(d.start));
		}
		function brightness(g: G) {
			const now = 5 * 24;
			const age = d3.scaleLinear().domain([now, 0]).range([1, 0.15]);
			nodes(g, (d) => age(d.start));
		}

		dataTable(
			el,
			[
				{ label: 'Step', value: (d: Ev) => d.name },
				{ label: 'Starts', value: (d) => when(d.start) },
				{ label: 'Ends', value: (d) => when(d.end) },
				{ label: 'Hours', value: (d) => d.end - d.start, numeric: true },
			],
			EVENTS,
		);
	},
};

export default figure;
