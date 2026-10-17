import * as d3 from 'd3';
import { controls, dataTable, isNarrow, readout, select, svg, type Figure } from './lib';
import { brushHistogram, CELL, coolingField, fieldView, fitSliders, NX, NY, type Cell, type Range } from './fig-11-1';

type Op = 'and' | 'or' | 'not';
type Attr = 'speed' | 'grad';

const OPS: Record<Op, { label: string; test: (a: boolean, b: boolean) => boolean; word: string }> = {
	and: { label: 'A AND B (both)', test: (a, b) => a && b, word: 'AND' },
	or: { label: 'A OR B (either)', test: (a, b) => a || b, word: 'OR' },
	not: { label: 'A NOT B (subtract)', test: (a, b) => a && !b, word: 'NOT' },
};

const ATTRS: Record<Attr, { label: string; option: string; unit: string; step: number; digits: number; initial: (lo: number, hi: number) => Range }> = {
	speed: {
		label: 'Speed',
		option: 'Speed (measured)',
		unit: '× inlet',
		step: 0.1,
		digits: 2,
		initial: (lo) => [lo, 0.4],
	},
	grad: {
		label: 'Gradient',
		option: 'Temperature gradient (derived, level three)',
		unit: '°C per cell',
		step: 1,
		digits: 1,
		initial: (_, hi) => [5, hi],
	},
};

const figure: Figure = {
	title: 'Combining brushes',
	caption:
		'Level two. Hot AND slow leaves the places where coolant sits still behind each bore and heats up. Switch B to the temperature gradient, an attribute derived from the data, for a taste of level three.',
	credit:
		'Synthetic data: a made-up 2D stand-in for the engine cooling jacket, not simulation output. Levels after Muigg et al. 2008; brush logic after Doleisch, Gasser and Hauser 2003.',
	mount(el) {
		const narrow = isNarrow(el);
		const W = narrow ? el.clientWidth : 680;
		const cs = narrow ? (W - 2) / NX : CELL;
		const cells = coolingField();
		const ox = (W - NX * cs) / 2;
		const FH = NY * cs + 26;
		const HH = 110;
		// Phones: histogram B goes under A, full width, instead of beside it.
		const HW = narrow ? W - 44 - 12 : 270;
		const BX = narrow ? 44 : 44 + HW + 56;
		const BY = narrow ? FH + 34 + HH + 66 : FH + 34;
		const H = BY + HH + 42;

		const rowOps = controls(el);
		const rowA = controls(el);
		const rowB = controls(el);
		const root = svg(
			el,
			W,
			H,
			'A 2D cooling jacket drawn as a grid of cells, with two histograms below: temperature (brush A) and a second attribute (brush B). Cells that match the combined brushes are highlighted.',
		);
		const paint = fieldView(root, cells, ox, 22, cs);
		const out = readout(el);

		let op: Op = 'and';
		let attr: Attr = 'speed';
		let ra: Range;
		let rb: Range;
		const valB = (c: Cell) => (attr === 'speed' ? c.speed : c.grad);
		const inA = (c: Cell) => c.temp >= ra[0] && c.temp <= ra[1];
		const inB = (c: Cell) => valB(c) >= rb[0] && valB(c) <= rb[1];

		const ha = brushHistogram({
			root,
			row: rowA,
			x: 44,
			y: FH + 34,
			w: HW,
			h: HH,
			label: 'A: Temperature',
			unit: '°C',
			values: cells.map((c) => c.temp),
			step: 2,
			digits: 0,
			initial: [112, Math.ceil(d3.max(cells, (c) => c.temp)! / 2) * 2],
			onChange: (r) => {
				ra = r;
				update();
			},
		});
		ra = [112, ha.full[1]];
		if (narrow) fitSliders(rowA);

		let hb: ReturnType<typeof brushHistogram>;
		function buildB() {
			hb?.remove();
			rowB.replaceChildren();
			const a = ATTRS[attr];
			const values = cells.map(valB);
			const lo = Math.floor(d3.min(values)! / a.step) * a.step;
			const hi = Math.ceil(d3.max(values)! / a.step) * a.step;
			rb = a.initial(lo, hi);
			hb = brushHistogram({
				root,
				row: rowB,
				x: BX,
				y: BY,
				w: HW,
				h: HH,
				label: `B: ${a.label}`,
				unit: a.unit,
				values,
				step: a.step,
				digits: a.digits,
				initial: rb,
				onChange: (r) => {
					rb = r;
					update();
				},
			});
			if (narrow) fitSliders(rowB);
		}

		function update() {
			if (!hb) return;
			const t = OPS[op].test;
			const res = cells.filter((c) => t(inA(c), inB(c)));
			paint((c) => t(inA(c), inB(c)));
			ha.setOverlay(res.map((c) => c.temp));
			hb.setOverlay(res.map(valB));
			const nA = cells.filter(inA).length;
			const nB = cells.filter(inB).length;
			const a = ATTRS[attr];
			const fr = (r: Range, d: number) => `${r[0].toFixed(d)}–${r[1].toFixed(d)}`;
			out.textContent = `A (temperature ${fr(ra, 0)} °C) has ${nA} cells. B (${a.label.toLowerCase()} ${fr(rb, a.digits)} ${a.unit}) has ${nB}. A ${OPS[op].word} B: ${res.length} of ${cells.length} cells.`;
			dataTable(
				el,
				[
					{ label: 'Selection', value: (d: { k: string; n: number }) => d.k },
					{ label: 'Cells', value: (d) => d.n, numeric: true },
				],
				[
					{ k: `A: temperature ${fr(ra, 0)} °C`, n: nA },
					{ k: `B: ${a.label.toLowerCase()} ${fr(rb, a.digits)} ${a.unit}`, n: nB },
					...(Object.keys(OPS) as Op[]).map((o) => ({
						k: OPS[o].label,
						n: cells.filter((c) => OPS[o].test(inA(c), inB(c))).length,
					})),
				],
			);
		}

		const selOp = select(
			rowOps,
			'Combine',
			(Object.keys(OPS) as Op[]).map((k) => ({ value: k, label: OPS[k].label })),
			(k) => {
				op = k;
				update();
			},
			op,
		);
		const selB = select(
			rowOps,
			'B is',
			(Object.keys(ATTRS) as Attr[]).map((k) => ({ value: k, label: ATTRS[k].option })),
			(k) => {
				attr = k;
				buildB();
				update();
			},
			attr,
		);
		if (narrow) for (const s of [selOp, selB]) s.style.maxWidth = `${W - 70}px`;
		buildB();
		update();
	},
};

export default figure;
