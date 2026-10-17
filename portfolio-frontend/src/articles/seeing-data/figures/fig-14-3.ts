import * as d3 from 'd3';
import { controls, dataTable, readout, rng, slider, svg, toggle, v, type Figure } from './lib';

type P = [number, number];

// Two vortices turning opposite ways, in a gentle wind from the left.
const VORTICES = [
	{ x: -0.42, y: 0.12, s: 0.35 },
	{ x: 0.45, y: -0.15, s: -0.35 },
];
function vel(x: number, y: number): P {
	let u = 0.45;
	let w = 0;
	for (const c of VORTICES) {
		const dx = x - c.x;
		const dy = y - c.y;
		const r2 = dx * dx + dy * dy + 0.02;
		u += (-c.s * dy) / r2;
		w += (c.s * dx) / r2;
	}
	return [u, w];
}

const RES = 240;
const toWorld = (p: number) => (p / (RES - 1)) * 2 - 1;

/** Line integral convolution: average the noise along a short streamline through each pixel. */
function lic(noise: Float32Array, L: number): Float32Array {
	const out = new Float32Array(RES * RES);
	const h = 0.6;
	const steps = Math.round(L / h);
	const sample = (px: number, py: number) => {
		const i = Math.min(RES - 1, Math.max(0, Math.round(px)));
		const j = Math.min(RES - 1, Math.max(0, Math.round(py)));
		return noise[i + RES * j];
	};
	// Direction in pixel space (y down), normalized.
	const dir = (px: number, py: number): P => {
		const [u, w] = vel(toWorld(px), -toWorld(py));
		const m = Math.hypot(u, w) || 1;
		return [u / m, -w / m];
	};
	for (let j = 0; j < RES; j++)
		for (let i = 0; i < RES; i++) {
			let sum = noise[i + RES * j];
			let n = 1;
			for (const sign of [1, -1]) {
				let px = i;
				let py = j;
				for (let s = 0; s < steps; s++) {
					// Midpoint step (Runge-Kutta 2), so streaks follow the curves.
					const [a, b] = dir(px, py);
					const [c, d] = dir(px + (sign * h * a) / 2, py + (sign * h * b) / 2);
					px += sign * h * c;
					py += sign * h * d;
					if (px < 0 || py < 0 || px > RES - 1 || py > RES - 1) break;
					sum += sample(px, py);
					n++;
				}
			}
			out[i + RES * j] = sum / n;
		}
	return out;
}

const figure: Figure = {
	title: 'Arrows against texture',
	caption:
		'The same flow, two vortices in a gentle wind, drawn as a hedgehog of arrows and as line integral convolution. The arrows show direction but leave gaps; the texture shows every swirl, but not which way along a streak the flow goes.',
	credit: 'LIC after Cabral and Leedom 1993.',
	mount(el) {
		const row = controls(el);
		const grid = document.createElement('div');
		grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;';
		el.append(grid);
		const panel = (title: string) => {
			const wrap = document.createElement('div');
			const h = document.createElement('p');
			h.textContent = title;
			h.style.cssText = 'margin:0 0 6px;font-size:14px;font-weight:700;';
			wrap.append(h);
			grid.append(wrap);
			return wrap;
		};

		// Hedgehog: one arrow per grid point, all the same length so slow regions stay visible.
		const S = 320;
		const hog = svg(panel('Hedgehog (arrow glyphs)'), S, S, 'Arrow glyphs on a 15 by 15 grid showing two vortices in a wind from the left.');
		hog.style('max-width', '100%');
		hog.append('rect').attr('width', S).attr('height', S).style('fill', 'none').style('stroke', v('axis'));
		const sc = d3.scaleLinear().domain([-1, 1]).range([0, S]);
		const G = 15;
		const pts = d3.cross(d3.range(G), d3.range(G)).map(([i, j]) => [-1 + (2 * (i + 0.5)) / G, -1 + (2 * (j + 0.5)) / G] as P);
		const len = (S / G) * 0.42;
		hog.append('g')
			.selectAll('path')
			.data(pts)
			.join('path')
			.attr('d', ([x, y]) => {
				const [u, w] = vel(x, y);
				const m = Math.hypot(u, w);
				const dx = (u / m) * len;
				const dy = (-w / m) * len;
				const cx = sc(x);
				const cy = sc(-y);
				const a = Math.atan2(dy, dx);
				const x1 = cx + dx;
				const y1 = cy + dy;
				return `M${cx - dx},${cy - dy}L${x1},${y1}M${x1},${y1}l${-5 * Math.cos(a - 0.5)},${-5 * Math.sin(a - 0.5)}M${x1},${y1}l${-5 * Math.cos(a + 0.5)},${-5 * Math.sin(a + 0.5)}`;
			})
			.style('stroke', v('ink'))
			.style('stroke-width', '1.5px')
			.style('fill', 'none');

		const licWrap = panel('Line integral convolution');
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = RES;
		canvas.style.cssText = 'width:100%;max-width:320px;aspect-ratio:1;display:block;border-radius:2px;';
		canvas.setAttribute('role', 'img');
		licWrap.append(canvas);

		// Seeded white noise, so the texture is the same on every load.
		const r = rng(14);
		const noise = Float32Array.from({ length: RES * RES }, () => (r() < 0.5 ? 0 : 1));
		const speed = new Float32Array(RES * RES);
		for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++) speed[i + RES * j] = Math.hypot(...vel(toWorld(i), -toWorld(j)));
		const maxSpeed = d3.quantile(Array.from(speed).sort(d3.ascending), 0.98)!;

		let L = 14;
		let colorBySpeed = false;
		let tex = lic(noise, L);
		const out = readout(el);

		function paint() {
			// Averaging squeezes contrast towards grey; stretch it back.
			const mean = d3.mean(tex)!;
			const sd = d3.deviation(tex) || 1;
			const img = new ImageData(RES, RES);
			for (let k = 0; k < tex.length; k++) {
				const g = Math.min(1, Math.max(0, 0.5 + (tex[k] - mean) / (4 * sd)));
				if (colorBySpeed) {
					const c = d3.rgb(d3.interpolateViridis(Math.min(1, speed[k] / maxSpeed)));
					const f = 0.45 + 0.75 * g;
					img.data.set([c.r * f, c.g * f, c.b * f, 255], k * 4);
				} else img.data.set([255 * g, 255 * g, 255 * g, 255], k * 4);
			}
			canvas.getContext('2d')!.putImageData(img, 0, 0);
			canvas.setAttribute(
				'aria-label',
				L === 0
					? 'Plain black and white noise, before any smearing.'
					: `Line integral convolution texture: streaks swirl around two vortices${colorBySpeed ? ', colored by speed' : ''}.`,
			);
			out.textContent =
				L === 0
					? 'Streak length 0: this is the raw noise the method starts from.'
					: `Each pixel averages the noise along ${L} pixels of streamline in each direction, so pixels on the same streamline end up alike.`;
		}

		let frame = 0;
		slider(row, 'Streak length', { min: 0, max: 30, step: 2, value: L, format: (n) => `${n} px` }, (n) => {
			L = n;
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				tex = lic(noise, L);
				paint();
			});
		});
		toggle(row, 'Color by speed', (on) => {
			colorBySpeed = on;
			paint();
		});
		paint();

		const coarse = d3.cross(d3.range(-1, 1.01, 0.5), d3.range(1, -1.01, -0.5)).map(([x, y]) => {
			const [u, w] = vel(x, y);
			return { x, y, u, w };
		});
		const f = d3.format('.2f');
		dataTable(
			el,
			[
				{ label: 'x', value: (d) => f(d.x), numeric: true },
				{ label: 'y', value: (d) => f(d.y), numeric: true },
				{ label: 'Velocity x', value: (d) => f(d.u), numeric: true },
				{ label: 'Velocity y', value: (d) => f(d.w), numeric: true },
			],
			coarse,
			'Show the field on a coarse grid',
		);
		return () => cancelAnimationFrame(frame);
	},
};

export default figure;
