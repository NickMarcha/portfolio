import * as d3 from 'd3';
import { controls, dataTable, gridY, readout, styleAxis, svg, toggle, v, type Figure } from './lib';

// Matplotlib's classic jet, as piecewise-linear RGB ramps.
function jet(t: number) {
	const c = (x: number) => Math.round(255 * Math.max(0, Math.min(1, x)));
	return d3.rgb(c(1.5 - Math.abs(4 * t - 3)), c(1.5 - Math.abs(4 * t - 2)), c(1.5 - Math.abs(4 * t - 1))).formatHex();
}

const MAPS = [
	{ id: 'jet', label: 'Jet (rainbow)', f: jet },
	{ id: 'viridis', label: 'Viridis', f: d3.interpolateViridis },
];

const grey = (c: string) => d3.lab(d3.lab(c).l, 0, 0).formatHex();
const L = (c: string) => d3.lab(c).l;

// A smooth synthetic surface: one hill, one basin and a gentle slope.
const GW = 160;
const GH = 100;
const gauss = (x: number, y: number, cx: number, cy: number, s: number) =>
	Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s));
const raw = d3.range(GW * GH).map((i) => {
	const x = (i % GW) / (GW - 1);
	const y = Math.floor(i / GW) / (GH - 1);
	return 0.9 * gauss(x, y, 0.28, 0.42, 0.14) - 0.75 * gauss(x, y, 0.74, 0.58, 0.16) + 0.25 * x - 0.1 * y;
});
const [zMin, zMax] = d3.extent(raw) as [number, number];
const FIELD = raw.map((z) => (z - zMin) / (zMax - zMin));
const iMax = d3.maxIndex(FIELD);
const iMin = d3.minIndex(FIELD);

function image(f: (t: number) => string, toGrey: boolean) {
	const canvas = document.createElement('canvas');
	canvas.width = GW;
	canvas.height = GH;
	const ctx = canvas.getContext('2d')!;
	const img = ctx.createImageData(GW, GH);
	FIELD.forEach((t, i) => {
		const c = d3.rgb(toGrey ? grey(f(t)) : f(t));
		img.data.set([c.r, c.g, c.b, 255], i * 4);
	});
	ctx.putImageData(img, 0, 0);
	return canvas.toDataURL();
}

const figure: Figure = {
	title: 'The same smooth surface in jet and in viridis',
	caption:
		'Both maps show one gently curving surface with a single hill and a single basin. Jet paints bright bands around yellow and cyan that are not in the data. In greyscale, jet’s hill and basin both turn dark, because its lightness rises and then falls again, while viridis keeps low dark and high light.',
	credit: 'Synthetic data. Jet as defined in matplotlib; viridis: van der Walt and Smith 2015. Lightness is CIELAB L*.',
	mount(el) {
		const row = controls(el);
		const wrap = document.createElement('div');
		wrap.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px 20px; justify-content: center;';
		el.append(wrap);

		const PW = 330;
		const IH = (PW * GH) / GW;
		const PH = 26 + IH + 46;
		const panels = MAPS.map((cm) => {
			const root = svg(wrap, PW, PH, `A smooth surface with one hill and one basin, colored with ${cm.label}.`).style('flex', `1 1 ${PW - 40}px`);
			root.append('text').attr('x', 0).attr('y', 17).style('fill', v('ink')).style('font-size', '15px').style('font-weight', '700').text(cm.label);
			const pic = root.append('image').attr('x', 0).attr('y', 26).attr('width', PW).attr('height', IH).attr('preserveAspectRatio', 'none');
			// Mark the true highest and lowest points so the greyscale view can be checked against them.
			for (const [i, name] of [
				[iMax, 'highest'],
				[iMin, 'lowest'],
			] as const) {
				const cx = ((i % GW) / (GW - 1)) * PW;
				const cy = 26 + (Math.floor(i / GW) / (GH - 1)) * IH;
				root.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 5).style('fill', 'none').style('stroke', '#fff').style('stroke-width', 2.5);
				root.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 5).style('fill', 'none').style('stroke', '#000').style('stroke-width', 1);
				root
					.append('text')
					.attr('x', cx + 9)
					.attr('y', cy + 5)
					.style('fill', '#000')
					.style('stroke', '#fff')
					.style('stroke-width', 4)
					.style('stroke-linejoin', 'round')
					.style('paint-order', 'stroke')
					.style('font-size', '14px')
					.style('font-weight', '700')
					.text(name);
			}
			const barY = 26 + IH + 8;
			const bar = root.append('image').attr('x', 0).attr('y', barY).attr('width', PW).attr('height', 12).attr('preserveAspectRatio', 'none');
			for (const [t, label, anchor] of [
				[0, 'low', 'start'],
				[1, 'high', 'end'],
			] as const) {
				root.append('text').attr('x', t * PW).attr('y', barY + 30).attr('text-anchor', anchor).style('fill', v('muted')).style('font-size', '13px').text(label);
			}
			return { cm, pic, bar };
		});

		function barImage(f: (t: number) => string, toGrey: boolean) {
			const canvas = document.createElement('canvas');
			canvas.width = 256;
			canvas.height = 1;
			const ctx = canvas.getContext('2d')!;
			for (let i = 0; i < 256; i++) {
				const c = f(i / 255);
				ctx.fillStyle = toGrey ? grey(c) : c;
				ctx.fillRect(i, 0, 1, 1);
			}
			return canvas.toDataURL();
		}

		// Lightness profile of each colormap.
		const W = 480;
		const H = 250;
		const m = { top: 30, right: 70, bottom: 40, left: 44 };
		const iw = W - m.left - m.right;
		const ih = H - m.top - m.bottom;
		const chart = svg(el, W, H, 'Line chart of lightness along each colormap. Viridis rises steadily; jet rises to a peak near the middle and falls again.').style('margin', '14px auto 0');
		const g = chart.append('g').attr('transform', `translate(${m.left},${m.top})`);
		const x = d3.scaleLinear().domain([0, 1]).range([0, iw]);
		const y = d3.scaleLinear().domain([0, 100]).range([ih, 0]);
		gridY(g.append('g'), y, iw, 5);
		styleAxis(g.append('g').call(d3.axisLeft(y).ticks(5)));
		styleAxis(g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).ticks(5)));
		g.append('text').attr('x', -40).attr('y', -14).style('fill', v('ink')).style('font-size', '14px').text('Lightness of each colormap (0 black, 100 white)');
		g.append('text').attr('x', iw).attr('y', ih + 34).attr('text-anchor', 'end').style('fill', v('muted')).style('font-size', '13px').text('Data value, low to high');
		const ts = d3.range(65).map((i) => i / 64);
		MAPS.forEach((cm, k) => {
			const color = v(`series-${k + 1}`);
			g.append('path')
				.datum(ts)
				.attr('d', d3.line<number>().x((t) => x(t)).y((t) => y(L(cm.f(t)))))
				.style('fill', 'none')
				.style('stroke', color)
				.style('stroke-width', 2.5)
				.style('stroke-dasharray', k === 0 ? 'none' : '7 4');
			g.append('text')
				.attr('x', iw + 8)
				.attr('y', y(L(cm.f(1))) + 5)
				.style('fill', v('ink'))
				.style('font-size', '14px')
				.text(k === 0 ? 'Jet' : 'Viridis');
		});

		const out = readout(el);
		function draw(toGrey: boolean) {
			for (const p of panels) {
				p.pic.attr('href', image(p.cm.f, toGrey));
				p.bar.attr('href', barImage(p.cm.f, toGrey));
			}
			const jHi = L(jet(1)).toFixed(0);
			const jLo = L(jet(0)).toFixed(0);
			const jMid = d3.max(ts, (t) => L(jet(t)))!.toFixed(0);
			const vHi = L(d3.interpolateViridis(1)).toFixed(0);
			const vLo = L(d3.interpolateViridis(0)).toFixed(0);
			out.textContent = toGrey
				? `Greyscale. In jet the hill becomes a dark pit inside a bright ring: its lowest value has lightness ${jLo}, its highest ${jHi}, and the lightest color sits in the middle of the range (${jMid}). Viridis runs from ${vLo} to ${vHi}, so dark still means low.`
				: 'Color. Jet draws a bright yellow ring around the hill and a cyan band around the basin, edges the smooth data does not have. Viridis changes evenly.';
		}
		toggle(row, 'Show in greyscale', draw);
		draw(false);

		dataTable(
			el,
			[
				{ label: 'Data value', value: (t: number) => t.toFixed(1), numeric: true },
				{ label: 'Jet lightness', value: (t) => L(jet(t)).toFixed(0), numeric: true },
				{ label: 'Viridis lightness', value: (t) => L(d3.interpolateViridis(t)).toFixed(0), numeric: true },
			],
			d3.range(11).map((i) => i / 10),
			'Show the lightness values',
		);
	},
};

export default figure;
