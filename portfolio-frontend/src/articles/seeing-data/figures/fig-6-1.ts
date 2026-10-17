import * as d3 from 'd3';
import { button, controls, dataTable, gridY, readout, styleAxis, svg, v, type Figure } from './lib';

// CIEDE2000 color difference: about 1 is one just-noticeable step.
function de2000(c1: string, c2: string) {
	const p = d3.lab(c1);
	const q = d3.lab(c2);
	const rad = Math.PI / 180;
	const C1 = Math.hypot(p.a, p.b);
	const C2 = Math.hypot(q.a, q.b);
	const Cb7 = ((C1 + C2) / 2) ** 7;
	const G = 0.5 * (1 - Math.sqrt(Cb7 / (Cb7 + 25 ** 7)));
	const a1 = (1 + G) * p.a;
	const a2 = (1 + G) * q.a;
	const Cp1 = Math.hypot(a1, p.b);
	const Cp2 = Math.hypot(a2, q.b);
	const hue = (x: number, y: number) => (x === 0 && y === 0 ? 0 : (Math.atan2(y, x) / rad + 360) % 360);
	const h1 = hue(a1, p.b);
	const h2 = hue(a2, q.b);
	let dh = 0;
	if (Cp1 * Cp2 !== 0) {
		dh = h2 - h1;
		if (dh > 180) dh -= 360;
		else if (dh < -180) dh += 360;
	}
	const dL = q.l - p.l;
	const dC = Cp2 - Cp1;
	const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dh / 2) * rad);
	const Lb = (p.l + q.l) / 2;
	const Cpb = (Cp1 + Cp2) / 2;
	let hb = h1 + h2;
	if (Cp1 * Cp2 !== 0) {
		if (Math.abs(h1 - h2) > 180) hb += hb < 360 ? 360 : -360;
		hb /= 2;
	}
	const T =
		1 -
		0.17 * Math.cos((hb - 30) * rad) +
		0.24 * Math.cos(2 * hb * rad) +
		0.32 * Math.cos((3 * hb + 6) * rad) -
		0.2 * Math.cos((4 * hb - 63) * rad);
	const SL = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2);
	const SC = 1 + 0.045 * Cpb;
	const SH = 1 + 0.015 * Cpb * T;
	const Cpb7 = Cpb ** 7;
	const RT = -2 * Math.sqrt(Cpb7 / (Cpb7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hb - 275) / 25) ** 2)) * rad);
	return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}

const grey = (c: string) => d3.lab(d3.lab(c).l, 0, 0).formatHex();

const MAPS = [
	{ id: 'viridis', label: 'Viridis', f: d3.interpolateViridis },
	{ id: 'by', label: 'Navy to yellow, mixed in RGB', f: d3.interpolateRgb('#000080', '#ffff00') },
	{ id: 'rg', label: 'Red to green, mixed in RGB', f: d3.interpolateRgb('#d7191c', '#1a9641') },
];

const STEPS = 16;

const figure: Figure = {
	title: 'Two tests for a colormap',
	caption:
		'Each colormap is cut into 16 equal steps. A good one gets lighter at every step, and every step looks about as different as the next (in the step chart, 1 is roughly one just-noticeable difference). Viridis passes both. The navy-to-yellow blend passes the first and fails the second. The red-to-green blend fails both.',
	credit: 'Viridis: van der Walt and Smith 2015. Lightness is CIELAB L*; step size is the CIEDE2000 color difference.',
	mount(el) {
		const row = controls(el);
		row.setAttribute('role', 'group');
		row.setAttribute('aria-label', 'Colormap');

		// Color bar and its greyscale twin, as HTML so the labels stay readable on phones.
		const strips = ['Colormap', 'The same colormap in greyscale'].map((label) => {
			const cap = document.createElement('div');
			cap.textContent = label;
			cap.style.cssText = 'font-size: 14px; margin: 2px 0;';
			const bar = document.createElement('div');
			bar.setAttribute('aria-hidden', 'true');
			bar.style.cssText = 'height: 30px; border-radius: 3px; margin-bottom: 8px;';
			el.append(cap, bar);
			return bar;
		});

		// Two small charts that sit side by side, or stack on narrow screens.
		const wrap = document.createElement('div');
		wrap.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px 24px; justify-content: center; margin-top: 8px;';
		el.append(wrap);
		const out = readout(el);
		const CW = 330;
		const CH = 270;
		const cw = CW - 52 - 12;
		const ch = CH - 30 - 44;
		const chart = (label: string) =>
			svg(wrap, CW, CH, label)
				.style('flex', `1 1 ${CW - 40}px`)
				.append('g')
				.attr('transform', 'translate(44,30)');
		const gL = chart('Line chart of lightness along the colormap.');
		const gR = chart('Bar chart of how big each of the 16 steps looks.');
		const x = d3.scaleLinear().domain([0, 1]).range([0, cw]);
		const yL = d3.scaleLinear().domain([0, 100]).range([ch, 0]);
		const yR = d3.scaleLinear().domain([0, 16]).range([ch, 0]);
		gridY(gL.append('g'), yL, cw, 5);
		gridY(gR.append('g'), yR, cw, 4);
		styleAxis(gL.append('g').call(d3.axisLeft(yL).ticks(5)));
		styleAxis(gR.append('g').call(d3.axisLeft(yR).ticks(4)));
		for (const [g, label] of [
			[gL, 'Lightness (0 black, 100 white)'],
			[gR, 'Size of each step'],
		] as const) {
			styleAxis(g.append('g').attr('transform', `translate(0,${ch})`).call(d3.axisBottom(x).ticks(5)));
			g.append('text')
				.attr('x', -40)
				.attr('y', -14)
				.style('fill', v('ink'))
				.style('font-size', '14px')
				.text(label);
			g.append('text')
				.attr('x', cw)
				.attr('y', ch + 36)
				.attr('text-anchor', 'end')
				.style('fill', v('muted'))
				.style('font-size', '13px')
				.text('Position along the colormap');
		}
		const line = gL.append('path').style('fill', 'none').style('stroke', v('ink')).style('stroke-width', 2);
		const dots = gL.append('g');
		const stepBars = gR.append('g');

		const buttons: HTMLButtonElement[] = [];
		function show(id: string) {
			const cm = MAPS.find((d) => d.id === id)!;
			for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.id === id));
			const stops = d3.range(33).map((i) => cm.f(i / 32));
			strips[0].style.background = `linear-gradient(to right, ${stops.join(', ')})`;
			strips[1].style.background = `linear-gradient(to right, ${stops.map(grey).join(', ')})`;

			const pts = d3.range(STEPS + 1).map((i) => ({ t: i / STEPS, c: cm.f(i / STEPS), L: d3.lab(cm.f(i / STEPS)).l }));
			line.attr(
				'd',
				d3
					.line<(typeof pts)[number]>()
					.x((d) => x(d.t))
					.y((d) => yL(d.L))(pts),
			);
			dots
				.selectAll('circle')
				.data(pts)
				.join('circle')
				.attr('cx', (d) => x(d.t))
				.attr('cy', (d) => yL(d.L))
				.attr('r', 5)
				.style('fill', (d) => d.c)
				.style('stroke', v('ink'))
				.style('stroke-width', 1);

			const steps = d3.range(STEPS).map((i) => ({ t: i / STEPS, c: cm.f((i + 0.5) / STEPS), d: de2000(pts[i].c, pts[i + 1].c) }));
			const bw = cw / STEPS;
			stepBars
				.selectAll('rect')
				.data(steps)
				.join('rect')
				.attr('x', (d) => x(d.t) + 1.5)
				.attr('width', bw - 3)
				.attr('y', (d) => yR(Math.min(16, d.d)))
				.attr('height', (d) => ch - yR(Math.min(16, d.d)))
				.attr('rx', 1)
				.style('fill', (d) => d.c)
				.style('stroke', v('axis'))
				.style('stroke-width', 0.75);

			const rising = pts.every((p, i) => i === 0 || p.L > pts[i - 1].L);
			const lo = d3.min(steps, (s) => s.d)!;
			const hi = d3.max(steps, (s) => s.d)!;
			out.textContent =
				`${cm.label}: lightness ${rising ? 'rises at every step' : 'does not rise at every step'}, from ${pts[0].L.toFixed(0)} to ${pts[STEPS].L.toFixed(0)}` +
				` (lowest ${d3.min(pts, (p) => p.L)!.toFixed(0)}, highest ${d3.max(pts, (p) => p.L)!.toFixed(0)}). ` +
				`Step sizes run from ${lo.toFixed(1)} to ${hi.toFixed(1)}, so the biggest step is ${(hi / lo).toFixed(1)} times the smallest.`;

			dataTable(
				el,
				[
					{ label: 'Step', value: (d: (typeof steps)[number]) => `${(d.t * STEPS + 1).toFixed(0)}` },
					{ label: 'Lightness at start', value: (d) => pts[Math.round(d.t * STEPS)].L.toFixed(1), numeric: true },
					{ label: 'Step size', value: (d) => d.d.toFixed(1), numeric: true },
				],
				steps,
			);
		}

		for (const cm of MAPS) {
			const b = button(row, cm.label, () => show(cm.id));
			b.dataset.id = cm.id;
			buttons.push(b);
		}
		show('viridis');
	},
};

export default figure;
