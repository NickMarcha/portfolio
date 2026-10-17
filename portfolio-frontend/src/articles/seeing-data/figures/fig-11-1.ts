import * as d3 from 'd3';
import { controls, dataTable, gridY, isNarrow, readout, rng, slider, styleAxis, svg, v, viridis, type Figure } from './lib';

// A synthetic 2D stand-in for the engine cooling jacket: coolant flows left to right
// through a slab with four cylinder bores in it. Not simulation output; the numbers
// are made up so that heat collects at the bore walls and in slow water behind each bore.
// Exported so Figure 11.2 can reuse the same field.

export const NX = 64;
export const NY = 26;
export const CELL = 10;
const CELL_DEFAULT = CELL;
export const BORES = [12.5, 25.5, 38.5, 51.5].map((cx) => ({ cx, cy: NY / 2, r: 4.3 }));

export interface Cell {
	i: number;
	gx: number;
	gy: number;
	temp: number;
	speed: number;
	grad: number;
}

export function coolingField(): Cell[] {
	const rand = rng(252);
	const noise = d3.randomNormal.source(rand)(0, 1);
	const cells: Cell[] = [];
	const at = new Map<string, Cell>();
	for (let gy = 0; gy < NY; gy++)
		for (let gx = 0; gx < NX; gx++) {
			const x = gx + 0.5;
			const y = gy + 0.5;
			if (BORES.some((b) => Math.hypot(x - b.cx, y - b.cy) < b.r)) continue;
			// Uniform flow past cylinders (potential flow), plus a slow wake behind each bore.
			let u = 1;
			let w = 0;
			let wake = 1;
			let heat = 0;
			for (const b of BORES) {
				const dx = x - b.cx;
				const dy = y - b.cy;
				const r2 = dx * dx + dy * dy;
				const k = (b.r * b.r) / (r2 * r2);
				u -= k * (dx * dx - dy * dy);
				w -= 2 * k * dx * dy;
				if (dx > 0) wake *= 1 - 0.85 * Math.exp(-(dy * dy) / (b.r * b.r * 0.6)) * Math.exp(-dx / (2.2 * b.r));
				heat += Math.exp(-(Math.sqrt(r2) - b.r) / 2.2);
			}
			// Slower water near the top and bottom walls.
			const wall = Math.min(1, Math.min(y, NY - y) / 4);
			const speed = Math.max(0.02, Math.hypot(u, w) * wake * (0.15 + 0.85 * wall) * (1 + 0.05 * noise()));
			const temp = 82 + 34 * Math.min(heat, 1.2) + 14 * Math.max(0, 1 - speed / 1.1) ** 2 + (10 * x) / NX + 1.2 * noise();
			const c = { i: cells.length, gx, gy, temp, speed, grad: 0 };
			cells.push(c);
			at.set(`${gx},${gy}`, c);
		}
	// Derived attribute: size of the temperature gradient, by central differences over fluid cells.
	for (const c of cells) {
		const n = (dx: number, dy: number) => at.get(`${c.gx + dx},${c.gy + dy}`)?.temp;
		const gxv = ((n(1, 0) ?? c.temp) - (n(-1, 0) ?? c.temp)) / 2;
		const gyv = ((n(0, 1) ?? c.temp) - (n(0, -1) ?? c.temp)) / 2;
		c.grad = Math.hypot(gxv, gyv);
	}
	return cells;
}

/** Draws the jacket: cells, bores and the flow labels. Returns a function that recolors cells. cs is the cell size (smaller on phones). */
export function fieldView(
	root: d3.Selection<SVGSVGElement, unknown, null, undefined>,
	cells: Cell[],
	ox: number,
	oy: number,
	cs = CELL_DEFAULT,
) {
	const CELL = cs;
	const g = root.append('g').attr('transform', `translate(${ox},${oy})`);
	const rects = g
		.append('g')
		// Phone cells can be fractional; a hair of overlap then hides the seams crispEdges would leave.
		.attr('shape-rendering', cs === CELL_DEFAULT ? 'crispEdges' : null)
		.selectAll('rect')
		.data(cells)
		.join('rect')
		.attr('x', (c) => c.gx * CELL)
		.attr('y', (c) => c.gy * CELL)
		.attr('width', cs === CELL_DEFAULT ? CELL : CELL + 0.5)
		.attr('height', cs === CELL_DEFAULT ? CELL : CELL + 0.5);
	g.append('rect')
		.attr('width', NX * CELL)
		.attr('height', NY * CELL)
		.style('fill', 'none')
		.style('stroke', v('muted'));
	g.append('g')
		.selectAll('circle')
		.data(BORES)
		.join('circle')
		.attr('cx', (b) => b.cx * CELL)
		.attr('cy', (b) => b.cy * CELL)
		.attr('r', (b) => b.r * CELL + (cs < CELL_DEFAULT ? 1 : 3))
		.style('fill', v('surface'))
		.style('stroke', v('muted'));
	g.append('g')
		.selectAll('text')
		.data(BORES)
		.join('text')
		.attr('x', (b) => b.cx * CELL)
		.attr('y', (b) => b.cy * CELL)
		.attr('dy', '0.35em')
		.attr('text-anchor', 'middle')
		.style('fill', v('muted'))
		.style('font-size', '12px')
		// Phones: the bores are too small for "bore 1", so just the number.
		.text((_, i) => (cs < CELL_DEFAULT ? `${i + 1}` : `bore ${i + 1}`));
	const flow = g.append('g').style('fill', v('ink')).style('font-size', '12px');
	flow.append('text').attr('x', 0).attr('y', -6).text('coolant in →');
	flow
		.append('text')
		.attr('x', NX * CELL)
		.attr('y', -6)
		.attr('text-anchor', 'end')
		.text('→ out');
	return (selected: ((c: Cell) => boolean) | null) => {
		if (!selected) {
			const [lo, hi] = d3.extent(cells, (c) => c.temp) as [number, number];
			rects.style('fill', (c) => viridis((c.temp - lo) / (hi - lo)));
		} else rects.style('fill', (c) => (selected(c) ? v('highlight') : v('dim')));
	};
}

export type Range = [number, number];

/**
 * A histogram with a d3 brush, plus two range sliders that do the same job from
 * the keyboard. Returns setOverlay, which draws the currently selected cells
 * on top of the full distribution, as a linked view.
 */
export function brushHistogram(opts: {
	root: d3.Selection<SVGSVGElement, unknown, null, undefined>;
	row: HTMLElement;
	x: number;
	y: number;
	w: number;
	h: number;
	label: string;
	unit: string;
	values: number[];
	step: number;
	digits: number;
	initial: Range;
	onChange: (r: Range) => void;
}) {
	const { w, h, values, step } = opts;
	const lo = Math.floor(d3.min(values)! / step) * step;
	const hi = Math.ceil(d3.max(values)! / step) * step;
	const x = d3.scaleLinear().domain([lo, hi]).range([0, w]);
	const bins = d3
		.bin()
		.domain([lo, hi])
		.thresholds(d3.range(lo, hi, step))(values);
	const y = d3
		.scaleLinear()
		.domain([0, d3.max(bins, (b) => b.length)!])
		.nice()
		.range([h, 0]);
	const g = opts.root.append('g').attr('transform', `translate(${opts.x},${opts.y})`);
	gridY(g.append('g'), y, w, 3);
	styleAxis(g.append('g').call(d3.axisLeft(y).ticks(3)));
	styleAxis(g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(5)));
	g.append('text')
		.attr('x', w)
		.attr('y', h + 32)
		.attr('text-anchor', 'end')
		.style('fill', v('muted'))
		.style('font-size', '12px')
		.text(`${opts.label} (${opts.unit})`);
	g.append('text')
		.attr('x', 0)
		.attr('y', -8)
		.style('fill', v('muted'))
		.style('font-size', '12px')
		.text('cells');
	const bw = (b: d3.Bin<number, number>) => Math.max(0, x(b.x1!) - x(b.x0!) - 1);
	g.append('g')
		.selectAll('rect')
		.data(bins)
		.join('rect')
		.attr('x', (b) => x(b.x0!) + 0.5)
		.attr('width', bw)
		.attr('y', (b) => y(b.length))
		.attr('height', (b) => h - y(b.length))
		.style('fill', v('dim'));
	const over = g.append('g');
	const fmtv = (n: number) => n.toFixed(opts.digits);

	let range: Range = opts.initial;
	const brush = d3
		.brushX()
		.extent([
			[0, 0],
			[w, h],
		])
		.on('brush end', (e: d3.D3BrushEvent<unknown>) => {
			if (!e.sourceEvent) return;
			const s = e.selection as [number, number] | null;
			const snap = (n: number) => Math.round(n / (step / 2)) * (step / 2);
			range = s ? [snap(x.invert(s[0])), snap(x.invert(s[1]))] : [lo, hi];
			fromIn.value = String(range[0]);
			toIn.value = String(range[1]);
			fromIn.dispatchEvent(new Event('sync'));
			opts.onChange(range);
		});
	const brushG = g.append('g').call(brush);
	brushG.selectAll('.selection').style('fill', v('highlight')).style('fill-opacity', 0.12).style('stroke', v('highlight'));

	const sopts = { min: lo, max: hi, step: step / 2, format: (n: number) => `${fmtv(n)} ${opts.unit}` };
	const fromIn = slider(opts.row, `${opts.label} from`, { ...sopts, value: range[0] }, (n) => {
		range = [Math.min(n, range[1]), range[1]];
		moveBrush();
	});
	const toIn = slider(opts.row, 'to', { ...sopts, value: range[1] }, (n) => {
		range = [range[0], Math.max(n, range[0])];
		moveBrush();
	});
	// Keep the sliders' printed values in step when the brush moves them.
	fromIn.addEventListener('sync', () => {
		for (const inp of [fromIn, toIn]) {
			const s = sopts.format(Number(inp.value));
			inp.parentElement!.querySelector('output')!.textContent = s;
			inp.setAttribute('aria-valuetext', s);
		}
	});
	function moveBrush() {
		brushG.call(brush.move, range[0] <= lo && range[1] >= hi ? null : [x(range[0]), x(range[1])]);
		opts.onChange(range);
	}
	if (range[0] > lo || range[1] < hi) brushG.call(brush.move, [x(range[0]), x(range[1])]);

	return {
		bins,
		full: [lo, hi] as Range,
		remove: () => g.remove(),
		setOverlay(sel: number[]) {
			const ob = d3
				.bin()
				.domain([lo, hi])
				.thresholds(d3.range(lo, hi, step))(sel);
			over
				.selectAll('rect')
				.data(ob)
				.join('rect')
				.attr('x', (b) => x(b.x0!) + 0.5)
				.attr('width', bw)
				.attr('y', (b) => y(b.length))
				.attr('height', (b) => h - y(b.length))
				.style('fill', v('highlight'))
				.style('pointer-events', 'none');
			return ob;
		},
	};
}

/** Phones: lets a controls row's sliders shrink so label, slider and value fit the width. */
export function fitSliders(row: HTMLElement) {
	for (const l of row.querySelectorAll<HTMLLabelElement>('label')) l.style.maxWidth = '100%';
	for (const i of row.querySelectorAll<HTMLInputElement>('input[type=range]')) {
		i.style.minWidth = '0';
		i.style.flex = '1 1 60px';
	}
}

const figure: Figure = {
	title: 'Show and brush',
	caption:
		'Level one of interactive visual analysis. Brushing values in the histogram and seeing where they occur in the jacket is feature localization.',
	credit:
		'Synthetic data: a made-up 2D stand-in for the engine cooling jacket used in the course, not simulation output. Levels after Muigg et al. 2008.',
	mount(el) {
		const narrow = isNarrow(el);
		const W = narrow ? el.clientWidth : 680;
		const cs = narrow ? (W - 2) / NX : CELL;
		const cells = coolingField();
		const temps = cells.map((c) => c.temp);
		const ox = (W - NX * cs) / 2;
		const FH = NY * cs + 26;
		const HH = 130;
		const H = FH + HH + 70;

		const row = controls(el);
		const root = svg(
			el,
			W,
			H,
			'A 2D cooling jacket with four cylinder bores, drawn as a grid of cells, above a histogram of cell temperatures. Cells whose temperature falls in the brushed range are highlighted.',
		);
		const paint = fieldView(root, cells, ox, 22, cs);
		const out = readout(el);

		let hist: ReturnType<typeof brushHistogram>;
		function update(r: Range) {
			const full = r[0] <= hist.full[0] && r[1] >= hist.full[1];
			const inR = (c: Cell) => c.temp >= r[0] && c.temp <= r[1];
			paint(full ? null : inR);
			const sel = full ? [] : cells.filter(inR);
			const ob = hist.setOverlay(sel.map((c) => c.temp));
			out.textContent = full
				? `No brush: every cell is colored by temperature (viridis, dark is cool, yellow is hot). Brush the histogram or use the sliders.`
				: `${sel.length} of ${cells.length} cells are between ${r[0].toFixed(0)} and ${r[1].toFixed(0)} °C.` +
					(r[0] >= 110 ? ' The hottest cells hug the bore walls, where the water slows down just in front of and behind each bore.' : '');
			dataTable(
				el,
				[
					{ label: 'Temperature (°C)', value: (b: d3.Bin<number, number>) => `${b.x0}–${b.x1}` },
					{ label: 'Cells', value: (b) => b.length, numeric: true },
					{ label: 'Selected', value: (b) => ob.find((o) => o.x0 === b.x0)?.length ?? 0, numeric: true },
				],
				hist.bins,
			);
		}
		hist = brushHistogram({
			root,
			row,
			x: 48,
			y: FH + 34,
			w: W - 48 - (narrow ? 12 : 20),
			h: HH,
			label: 'Temperature',
			unit: '°C',
			values: temps,
			step: 2,
			digits: 0,
			initial: [116, Math.ceil(d3.max(temps)! / 2) * 2],
			onChange: update,
		});
		if (narrow) fitSliders(row);
		update([116, hist.full[1]]);
	},
};

export default figure;
