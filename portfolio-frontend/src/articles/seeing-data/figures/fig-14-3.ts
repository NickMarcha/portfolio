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

/**
 * Line integral convolution: average the noise along a short streamline through each pixel.
 * res is the texture size; L is in pixels of the full RES texture. The velocity code is
 * inlined because this loop runs millions of times on the main thread.
 */
function lic(noise: Float32Array, res: number, L: number): Float32Array {
	const out = new Float32Array(res * res);
	const h = 0.6;
	const steps = Math.round((L * res) / RES / h);
	const k = 2 / (res - 1);
	const [A, B] = VORTICES;
	for (let j = 0; j < res; j++)
		for (let i = 0; i < res; i++) {
			let sum = noise[i + res * j];
			let n = 1;
			for (let sign = 1; sign >= -1; sign -= 2) {
				const sh = sign * h;
				let px = i;
				let py = j;
				for (let s = 0; s < steps; s++) {
					// Midpoint step (Runge-Kutta 2), so streaks follow the curves. Pixel y points down.
					let x = px * k - 1;
					let y = 1 - py * k;
					let dx = x - A.x;
					let dy = y - A.y;
					let r2 = dx * dx + dy * dy + 0.02;
					let u = 0.45 - (A.s * dy) / r2;
					let w = (A.s * dx) / r2;
					dx = x - B.x;
					dy = y - B.y;
					r2 = dx * dx + dy * dy + 0.02;
					u -= (B.s * dy) / r2;
					w += (B.s * dx) / r2;
					let m = Math.sqrt(u * u + w * w) || 1;
					x = (px + (sh * u) / m / 2) * k - 1;
					y = 1 - (py - (sh * w) / m / 2) * k;
					dx = x - A.x;
					dy = y - A.y;
					r2 = dx * dx + dy * dy + 0.02;
					u = 0.45 - (A.s * dy) / r2;
					w = (A.s * dx) / r2;
					dx = x - B.x;
					dy = y - B.y;
					r2 = dx * dx + dy * dy + 0.02;
					u -= (B.s * dy) / r2;
					w += (B.s * dx) / r2;
					m = Math.sqrt(u * u + w * w) || 1;
					px += (sh * u) / m;
					py -= (sh * w) / m;
					if (px < 0 || py < 0 || px > res - 1 || py > res - 1) break;
					sum += noise[Math.round(px) + res * Math.round(py)];
					n++;
				}
			}
			out[i + res * j] = sum / n;
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
		const fullNoise = Float32Array.from({ length: RES * RES }, () => (r() < 0.5 ? 0 : 1));
		// A full-size level, and a half-size one for quick previews while the slider moves.
		const level = (res: number) => {
			const step = RES / res;
			const noise = res === RES ? fullNoise : Float32Array.from({ length: res * res }, (_, k) => fullNoise[(k % res) * step + RES * Math.floor(k / res) * step]);
			const speed = new Float32Array(res * res);
			const w = (p: number) => (p / (res - 1)) * 2 - 1;
			for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) speed[i + res * j] = Math.hypot(...vel(w(i), -w(j)));
			return { res, noise, speed };
		};
		const full = level(RES);
		const preview = level(RES / 2);
		const maxSpeed = d3.quantile(Array.from(full.speed).sort(d3.ascending), 0.98)!;

		let L = 14;
		let colorBySpeed = false;
		let lv = full;
		let tex = lic(full.noise, RES, L);
		const out = readout(el);

		function paint() {
			// Averaging squeezes contrast towards grey; stretch it back.
			const mean = d3.mean(tex)!;
			const sd = d3.deviation(tex) || 1;
			const img = new ImageData(lv.res, lv.res);
			for (let k = 0; k < tex.length; k++) {
				const g = Math.min(1, Math.max(0, 0.5 + (tex[k] - mean) / (4 * sd)));
				if (colorBySpeed) {
					const c = d3.rgb(d3.interpolateViridis(Math.min(1, lv.speed[k] / maxSpeed)));
					const f = 0.45 + 0.75 * g;
					img.data.set([c.r * f, c.g * f, c.b * f, 255], k * 4);
				} else img.data.set([255 * g, 255 * g, 255 * g, 255], k * 4);
			}
			canvas.width = canvas.height = lv.res;
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
					: `Each pixel averages the noise along ${L} pixels of streamline in each direction, so pixels on the same streamline end up alike.${colorBySpeed ? ' Color shows speed: yellow is fast, dark purple is slow.' : ''}`;
		}

		// A full-size texture takes a few hundred milliseconds on a slow machine, so while the
		// slider moves show a half-size preview, and draw the full one once it rests.
		let frame = 0;
		let timer = 0;
		const compute = (target: typeof full) => {
			lv = target;
			tex = lic(lv.noise, lv.res, L);
			paint();
		};
		slider(row, 'Streak length', { min: 0, max: 30, step: 2, value: L, format: (n) => `${n} px` }, (n) => {
			L = n;
			cancelAnimationFrame(frame);
			clearTimeout(timer);
			frame = requestAnimationFrame(() => compute(preview));
			timer = window.setTimeout(() => compute(full), 250);
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
		return () => {
			cancelAnimationFrame(frame);
			clearTimeout(timer);
		};
	},
};

export default figure;
