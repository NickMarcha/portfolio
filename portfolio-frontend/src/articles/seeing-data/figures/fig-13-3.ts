import * as d3 from 'd3';
import { controls, dataTable, isNarrow, readout, select, slider, styleAxis, svg, v, type Figure } from './lib';

// Part B: one ray's samples. Opacity per density follows a simple transfer function.
const OPACITY: Record<number, number> = { 0: 0, 20: 0.15, 40: 0.03, 65: 0.4, 90: 0.8 };
const RAY = [0, 0, 20, 20, 40, 65, 65, 40, 40, 90, 90, 40, 40, 40, 65, 65, 40, 20, 0, 0].map((d, i) => ({
	i: i + 1,
	density: d,
	alpha: OPACITY[d],
	rgb: d3.rgb(d3.interpolateViridis(d / 100)),
}));
const STOP = 0.95;

/** Front to back: accumulated opacity after each sample, and where the ray could stop. */
function frontToBack() {
	let A = 0;
	const acc = RAY.map((s) => (A += (1 - A) * s.alpha));
	const stop = acc.findIndex((a) => a >= STOP);
	return { acc, stop };
}

function composite(order: 'ftb' | 'btf', upTo: number) {
	let r = 0;
	let g = 0;
	let b = 0;
	let A = 0;
	const seq = order === 'ftb' ? RAY.slice(0, upTo) : RAY.slice(RAY.length - upTo).reverse();
	for (const s of seq) {
		if (order === 'ftb') {
			const w = (1 - A) * s.alpha;
			r += w * s.rgb.r;
			g += w * s.rgb.g;
			b += w * s.rgb.b;
			A += w;
		} else {
			// Back to front: paint each sample over what's behind it.
			r = s.alpha * s.rgb.r + (1 - s.alpha) * r;
			g = s.alpha * s.rgb.g + (1 - s.alpha) * g;
			b = s.alpha * s.rgb.b + (1 - s.alpha) * b;
			A = s.alpha + (1 - s.alpha) * A;
		}
	}
	// Colors are premultiplied by opacity; undo that for display.
	const c = A > 0 ? d3.rgb(r / A, g / A, b / A) : d3.rgb(0, 0, 0);
	return { color: c.formatHex(), A };
}

/** Phones: lets a controls row's sliders shrink so label, slider and value fit the width. */
function fitSliders(row: HTMLElement) {
	for (const l of row.querySelectorAll<HTMLLabelElement>('label')) l.style.maxWidth = '100%';
	for (const i of row.querySelectorAll<HTMLInputElement>('input[type=range]')) {
		i.style.minWidth = '0';
		i.style.flex = '1 1 60px';
	}
}

const figure: Figure = {
	title: 'Classify after interpolating, composite front to back',
	caption:
		'Top: coloring two voxels first and blending the colors loses the membrane between them; blending the densities first finds it. Bottom: compositing front to back can stop once the pixel is nearly opaque.',
	credit: 'Compositing after Levoy 1988.',
	mount(el) {
		// ---------- Part A: pre- vs post-interpolative classification ----------
		const rowA = controls(el);
		// Phones: the row titles move above the plot and strips, so these get the full width.
		const narrow = isNarrow(el);
		const W = narrow ? el.clientWidth : 680;
		const HA = narrow ? 264 : 250;
		const L = narrow ? 40 : 200;
		const R = narrow ? W - 8 : W - 30;
		const rootA = svg(el, W, HA, 'Pre- and post-interpolative classification between two voxels with densities 0 and 100.');
		const x = d3.scaleLinear().domain([0, 1]).range([L, R]);
		const yD = d3.scaleLinear().domain([0, 100]).range(narrow ? [100, 40] : [92, 26]);
		let glow = 50;
		const WIDTH = 4;
		const tf = (d: number) => Math.max(0, 1 - Math.abs(d - glow) / WIDTH);

		const text = (g: d3.Selection<SVGSVGElement, unknown, null, undefined>, xx: number, yy: number, t: string, o: { anchor?: string; bold?: boolean; muted?: boolean } = {}) =>
			g
				.append('text')
				.attr('x', xx)
				.attr('y', yy)
				.attr('text-anchor', o.anchor ?? 'start')
				.style('fill', o.muted ? v('muted') : v('ink'))
				.style('font-size', '14px')
				.style('font-weight', o.bold ? 700 : 400)
				.text(t);

		if (narrow) text(rootA, 0, 14, 'Density along the ray');
		else {
			text(rootA, 0, 50, 'Density along');
			text(rootA, 0, 68, 'the ray');
		}
		styleAxis(rootA.append('g').attr('transform', `translate(${L - 8},0)`).call(d3.axisLeft(yD).tickValues([0, 50, 100])));
		const glowLine = rootA.append('line').attr('x1', L).attr('x2', R).style('stroke', v('highlight')).style('stroke-dasharray', '4 4');
		rootA.append('line')
			.attr('x1', x(0))
			.attr('y1', yD(0))
			.attr('x2', x(1))
			.attr('y2', yD(100))
			.style('stroke', v('ink'))
			.style('stroke-width', '2px');
		const cross = rootA.append('circle').attr('r', 5).style('fill', v('highlight'));
		for (const [t, d, name] of [
			[0, 0, 'Voxel A: 0'],
			[1, 100, 'Voxel B: 100'],
		] as const) {
			rootA.append('circle').attr('cx', x(t)).attr('cy', yD(d)).attr('r', 7).style('fill', v('series-1'));
			text(rootA, x(t) + (t ? 0 : 14), yD(d) + (t ? -12 : 18), name, { anchor: t ? 'end' : 'start' });
		}

		const strips = [
			{ y: narrow ? 148 : 126, title: 'Classify, then', title2: 'interpolate (pre)', alpha: (t: number) => (1 - t) * tf(0) + t * tf(100) },
			{ y: narrow ? 218 : 186, title: 'Interpolate, then', title2: 'classify (post)', alpha: (t: number) => tf(100 * t) },
		];
		const N = 200;
		const stripG = strips.map((s) => {
			if (narrow) text(rootA, 0, s.y - 8, `${s.title} ${s.title2}`);
			else {
				text(rootA, 0, s.y + 16, s.title);
				text(rootA, 0, s.y + 34, s.title2);
			}
			rootA.append('rect')
				.attr('x', L)
				.attr('y', s.y)
				.attr('width', R - L)
				.attr('height', 40)
				.style('fill', 'none')
				.style('stroke', v('axis'));
			return rootA
				.append('g')
				.selectAll('rect')
				.data(d3.range(N))
				.join('rect')
				.attr('x', (i) => x(i / N))
				.attr('width', (R - L) / N + 0.6)
				.attr('y', s.y + 1)
				.attr('height', 38)
				.style('fill', v('highlight'));
		});
		const outA = readout(el);

		function drawA() {
			glowLine.attr('y1', yD(glow)).attr('y2', yD(glow));
			cross.attr('cx', x(glow / 100)).attr('cy', yD(glow));
			strips.forEach((s, k) => stripG[k].style('fill-opacity', (i) => s.alpha((i + 0.5) / N)));
			const pre = Math.max(tf(0), tf(100));
			outA.textContent =
				pre === 0
					? `The transfer function makes only density ${glow} glow. Voxels A and B are both transparent, so blending their colors gives nothing (top strip). Blending the densities first passes through ${glow} at ${glow}% of the way, and the membrane shows (bottom strip).`
					: `Density ${glow} is so close to a voxel's own value that the voxel itself glows, so even pre-classification shows a smear. Move the slider back towards the middle.`;
		}
		slider(rowA, 'Glowing density', { min: 2, max: 98, value: glow }, (n) => {
			glow = n;
			drawA();
		});
		if (narrow) fitSliders(rowA);
		drawA();

		// ---------- Part B: front-to-back compositing and early ray termination ----------
		const sep = document.createElement('hr');
		sep.style.cssText = 'border:none;border-top:1px solid var(--border);margin:18px 0 12px;';
		el.append(sep);
		const rowB = controls(el);
		// Phones: the samples span the full width and the pixel moves under the chart.
		const HB = narrow ? 284 : 270;
		const BL = narrow ? 46 : 60;
		const BR = narrow ? W - 4 : W - 90;
		const rootB = svg(el, W, HB, 'Twenty samples along one ray, with the accumulated opacity of the pixel after each sample.');
		const bx = d3
			.scaleBand<number>()
			.domain(RAY.map((s) => s.i))
			.range([BL, BR])
			.paddingInner(0.12);
		const by = d3.scaleLinear().domain([0, 1]).range(narrow ? [214, 100] : [230, 110]);
		text(rootB, 0, 20, 'Eye', { bold: true });
		text(rootB, BR, 20, 'Far side', { anchor: 'end', bold: true });
		const cells = rootB
			.append('g')
			.selectAll('g')
			.data(RAY)
			.join('g')
			.attr('transform', (s) => `translate(${bx(s.i)},34)`);
		cells
			.append('rect')
			.attr('width', bx.bandwidth())
			.attr('height', bx.bandwidth())
			.style('fill', 'none')
			.style('stroke', v('axis'));
		cells
			.append('rect')
			.attr('class', 'fill')
			.attr('width', bx.bandwidth())
			.attr('height', bx.bandwidth())
			.attr('fill', (s) => s.rgb.formatHex())
			.attr('fill-opacity', (s) => s.alpha);
		const skip = cells
			.append('path')
			.attr('d', `M3,3 L${bx.bandwidth() - 3},${bx.bandwidth() - 3} M${bx.bandwidth() - 3},3 L3,${bx.bandwidth() - 3}`)
			.style('stroke', v('muted'))
			.style('stroke-width', '1.5px');
		cells
			.append('text')
			.attr('x', bx.bandwidth() / 2)
			.attr('y', bx.bandwidth() + 16)
			.attr('text-anchor', 'middle')
			.style('fill', v('muted'))
			.style('font-size', '12px')
			// Phones: cells are too narrow for every number.
			.text((s) => (!narrow || s.i === 1 || s.i % 5 === 0 ? s.i : ''));

		styleAxis(rootB.append('g').attr('transform', `translate(${BL - 6},0)`).call(d3.axisLeft(by).ticks(4).tickFormat(d3.format('.0%'))));
		rootB.append('line').attr('x1', BL).attr('x2', BR).attr('y1', by(STOP)).attr('y2', by(STOP)).style('stroke', v('muted')).style('stroke-dasharray', '4 4');
		if (narrow) text(rootB, BR, by(STOP) + 18, `${STOP * 100}%`, { anchor: 'end', muted: true });
		else text(rootB, W - 86, by(STOP) + 5, `${STOP * 100}%`, { muted: true });
		text(rootB, BL, narrow ? 88 : 104, 'Opacity of the pixel so far', { muted: true });
		const accLine = rootB.append('path').style('fill', 'none').style('stroke', v('series-1')).style('stroke-width', '2px');
		const accDots = rootB.append('g');
		// The pixel itself, on the right.
		const pxX = narrow ? W / 2 : W - 64;
		const pxY = narrow ? 236 : 160;
		if (narrow) text(rootB, pxX - 10, pxY + 29, 'Pixel', { anchor: 'end', bold: true });
		else text(rootB, W - 40, 150, 'Pixel', { anchor: 'middle', bold: true });
		rootB.append('rect').attr('x', pxX).attr('y', pxY).attr('width', 48).attr('height', 48).style('fill', 'none').style('stroke', v('axis'));
		const pixel = rootB.append('rect').attr('x', pxX).attr('y', pxY).attr('width', 48).attr('height', 48);

		let order: 'ftb' | 'btf' = 'ftb';
		let upTo = RAY.length;
		const { acc, stop } = frontToBack();
		const outB = readout(el);

		function drawB() {
			const n = RAY.length;
			const limit = order === 'ftb' ? Math.min(upTo, stop + 1) : upTo;
			// Which samples are done, and which never need computing.
			const done = (s: (typeof RAY)[number]) => (order === 'ftb' ? s.i <= limit : s.i > n - limit);
			const skipped = (s: (typeof RAY)[number]) => order === 'ftb' && upTo > stop + 1 && s.i > stop + 1;
			cells.select('.fill').attr('fill-opacity', (s) => (done(s) ? s.alpha : s.alpha * 0.25));
			skip.style('display', (s) => (skipped(s) ? null : 'none'));
			let pts: [number, number][];
			if (order === 'ftb') {
				pts = RAY.slice(0, limit).map((s, k) => [bx(s.i)! + bx.bandwidth() / 2, by(acc[k])]);
			} else {
				pts = [];
				for (let k = 1; k <= limit; k++) {
					const s = RAY[n - k];
					pts.push([bx(s.i)! + bx.bandwidth() / 2, by(composite('btf', k).A)]);
				}
			}
			accLine.attr('d', pts.length ? d3.line()(pts) : null);
			accDots
				.selectAll('circle')
				.data(pts)
				.join('circle')
				.attr('cx', (p) => p[0])
				.attr('cy', (p) => p[1])
				.attr('r', 4)
				.style('fill', v('series-1'));
			const px = composite(order, limit);
			pixel.attr('fill', px.color).attr('fill-opacity', px.A);
			const pct = d3.format('.0%');
			if (order === 'ftb') {
				outB.textContent =
					upTo > stop + 1
						? `Front to back: after sample ${stop + 1} the pixel is ${pct(acc[stop])} opaque. Nothing behind can change it by more than ${pct(1 - acc[stop])}, so the ray stops. ${n - stop - 1} of ${n} samples are never computed (crossed out).`
						: `Front to back: ${limit} of ${n} samples composited, pixel ${pct(px.A)} opaque.`;
			} else {
				outB.textContent =
					upTo === n
						? `Back to front: all ${n} samples had to be composited, starting from the far side. The pixel ends up the same as front to back (${pct(px.A)} opaque), but there was no point at which the ray could stop.`
						: `Back to front: ${limit} of ${n} samples composited from the far side, pixel ${pct(px.A)} opaque. Every sample still ahead can cover what is there.`;
			}
		}

		select(
			rowB,
			'Order',
			[
				{ value: 'ftb', label: 'Front to back' },
				{ value: 'btf', label: 'Back to front' },
			],
			(o) => {
				order = o as 'ftb' | 'btf';
				drawB();
			},
			'ftb',
		);
		slider(rowB, 'Samples processed', { min: 0, max: RAY.length, value: upTo }, (k) => {
			upTo = k;
			drawB();
		});
		if (narrow) fitSliders(rowB);
		drawB();

		dataTable(
			el,
			[
				{ label: 'Sample (from the eye)', value: (s) => s.i, numeric: true },
				{ label: 'Density', value: (s) => s.density, numeric: true },
				{ label: 'Opacity', value: (s) => s.alpha, numeric: true },
				{ label: 'Pixel opacity after it, front to back', value: (s) => d3.format('.0%')(acc[s.i - 1]), numeric: true },
			],
			RAY,
		);
	},
};

export default figure;
