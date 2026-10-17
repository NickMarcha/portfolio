import * as d3 from 'd3';
import { controls, dataTable, isNarrow, readout, select, svg, toggle, v, type Figure } from './lib';

// Machado, Oliveira and Fernandes 2009, severity 1.0. Applied to linear RGB.
const MATRICES = {
	normal: null,
	protanopia: [
		[0.152286, 1.052583, -0.204868],
		[0.114503, 0.786281, 0.099216],
		[-0.003882, -0.048116, 1.051998],
	],
	deuteranopia: [
		[0.367322, 0.860646, -0.227968],
		[0.280085, 0.672501, 0.047413],
		[-0.01182, 0.04294, 0.968881],
	],
};
type Vision = keyof typeof MATRICES;

const toLinear = (c: number) => {
	const s = c / 255;
	return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const toSrgb = (l: number) => {
	const x = Math.max(0, Math.min(1, l));
	return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
};
function simulate(hex: string, vision: Vision) {
	const m = MATRICES[vision];
	if (!m) return hex;
	const c = d3.rgb(hex);
	const lin = [toLinear(c.r), toLinear(c.g), toLinear(c.b)];
	const [r, g, b] = m.map((row) => toSrgb(row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]));
	return d3.rgb(r, g, b).formatHex();
}

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

const LEVELS = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];
const MARKS = ['−−', '−', '0', '+', '++'];
const PALETTES = [
	{ name: 'Red to green (RdYlGn)', colors: ['#d7191c', '#fdae61', '#ffffbf', '#a6d96a', '#1a9641'] },
	{ name: 'Red to blue (RdBu), color-blind safe', colors: ['#ca0020', '#f4a582', '#f7f7f7', '#92c5de', '#0571b0'] },
];

// Made-up survey answers, percent per level.
const DATA = [
	{ q: 'The lectures were clear', p: [6, 14, 20, 38, 22] },
	{ q: 'The labs helped me learn', p: [4, 9, 17, 41, 29] },
	{ q: 'The workload was fair', p: [21, 30, 24, 18, 7] },
	{ q: 'I would recommend the course', p: [8, 12, 18, 35, 27] },
];

const VISION_LABEL: Record<Vision, string> = {
	normal: 'normal color vision',
	protanopia: 'protanopia',
	deuteranopia: 'deuteranopia',
};

const figure: Figure = {
	title: 'A red-green palette through color-blind eyes',
	caption:
		'The same made-up survey drawn twice. Under protanopia or deuteranopia, the red-green palette’s “disagree” and “agree” become almost the same yellow-brown, and with deuteranopia so do the two ends. The red-blue palette keeps every pair apart. Labels in the bars fix it for any palette.',
	credit:
		'Made-up data. Palettes: ColorBrewer, Harrower and Brewer 2003. Simulation: Machado, Oliveira and Fernandes 2009, full severity. Difference is CIEDE2000, where 1 is about one just-noticeable step.',
	mount(el) {
		const narrow = isNarrow(el);
		const row = controls(el);
		let vision: Vision = 'normal';
		let labelled = false;

		const wrap = document.createElement('div');
		wrap.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px 24px; justify-content: center;';
		el.append(wrap);
		const out = readout(el);

		const W = narrow ? el.clientWidth : 330;
		const barH = 24;
		const rowH = 52;
		const legendTop = 34 + DATA.length * rowH + 6;
		const H = legendTop + LEVELS.length * 22 + 4;
		const x = d3.scaleLinear().domain([0, 100]).range([0, W]);

		const panels = PALETTES.map((pal) => {
			const root = svg(wrap, W, H, `Stacked bar chart of answers to four survey statements, colored with the ${pal.name} palette.`).style('flex', `1 1 ${W - 40}px`);
			root.append('text').attr('y', 18).style('fill', v('ink')).style('font-size', '15px').style('font-weight', '700').text(narrow ? pal.name.replace(/ \(\w+\)/, '') : pal.name);
			const rows = root
				.selectAll('g.q')
				.data(DATA)
				.join('g')
				.attr('class', 'q')
				.attr('transform', (_, i) => `translate(0,${34 + i * rowH})`);
			rows.append('text').attr('y', 13).style('fill', v('ink')).style('font-size', '14px').text((d) => d.q);
			const segs = rows
				.selectAll('g.s')
				.data((d) => {
					let acc = 0;
					return d.p.map((p, k) => ({ k, p, x0: (acc += p) - p }));
				})
				.join('g')
				.attr('class', 's');
			const rects = segs
				.append('rect')
				.attr('x', (d) => x(d.x0) + 0.5)
				.attr('y', 20)
				.attr('width', (d) => Math.max(0, x(d.p) - 1))
				.attr('height', barH)
				.style('stroke', v('axis'))
				.style('stroke-width', 0.5);
			const marks = segs
				.append('text')
				.attr('x', (d) => x(d.x0 + d.p / 2))
				.attr('y', 20 + barH / 2 + 5)
				.attr('text-anchor', 'middle')
				.style('font-size', '14px')
				.style('font-weight', '700')
				.text((d) => MARKS[d.k]);

			const legend = root
				.selectAll('g.l')
				.data(LEVELS)
				.join('g')
				.attr('class', 'l')
				.attr('transform', (_, i) => `translate(0,${legendTop + i * 22})`);
			const swatches = legend.append('rect').attr('width', 26).attr('height', 16).attr('rx', 2).style('stroke', v('axis')).style('stroke-width', 0.5);
			const swMarks = legend
				.append('text')
				.attr('x', 13)
				.attr('y', 13)
				.attr('text-anchor', 'middle')
				.style('font-size', '12px')
				.style('font-weight', '700')
				.text((_, i) => MARKS[i]);
			legend.append('text').attr('x', 34).attr('y', 13).style('fill', v('ink')).style('font-size', '13px').text((d) => d);
			return { pal, rects, marks, swatches, swMarks };
		});

		function draw() {
			for (const p of panels) {
				const col = p.pal.colors.map((c) => simulate(c, vision));
				const ink = (k: number) => (d3.lab(col[k]).l > 55 ? '#111' : '#fff');
				p.rects.style('fill', (d) => col[d.k]);
				p.marks.style('fill', (d) => ink(d.k)).style('display', (d) => (labelled && x(d.p) > 18 ? null : 'none'));
				p.swatches.style('fill', (_, i) => col[i]);
				p.swMarks.style('fill', (_, i) => ink(i)).style('display', labelled ? 'inline' : 'none');
			}
			const ends = PALETTES.map((pal) => de2000(simulate(pal.colors[0], vision), simulate(pal.colors[4], vision)));
			const near = PALETTES.map((pal) => de2000(simulate(pal.colors[1], vision), simulate(pal.colors[3], vision)));
			out.textContent =
				`With ${VISION_LABEL[vision]}, “strongly disagree” and “strongly agree” differ by ${ends[0].toFixed(0)} in the red-green palette and ${ends[1].toFixed(0)} in the red-blue one. ` +
				`“Disagree” and “agree” differ by ${near[0].toFixed(0)} and ${near[1].toFixed(0)}.` +
				(vision !== 'normal' ? ' Under about 10, two colors are easy to mix up.' : '');
		}

		const sel = select<Vision>(
			row,
			'Simulate',
			[
				{ value: 'normal', label: 'Normal color vision' },
				{ value: 'protanopia', label: 'Protanopia (no red cones)' },
				{ value: 'deuteranopia', label: 'Deuteranopia (no green cones)' },
			],
			(val) => {
				vision = val;
				draw();
			},
			'normal',
		);
		// Long option names would push the select past a phone's edge.
		if (narrow) sel.style.maxWidth = `${el.clientWidth - 80}px`;
		toggle(row, 'Label the bars', (on) => {
			labelled = on;
			draw();
		});
		draw();

		dataTable(
			el,
			[{ label: 'Statement', value: (d: (typeof DATA)[number]) => d.q }, ...LEVELS.map((l, k) => ({ label: `${l} (%)`, value: (d: (typeof DATA)[number]) => d.p[k], numeric: true }))],
			DATA,
		);
	},
};

export default figure;
