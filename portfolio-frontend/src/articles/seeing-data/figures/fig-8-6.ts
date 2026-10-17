import * as d3 from 'd3';
import { controls, dataTable, onThemeChange, readout, toggle, token, type Figure } from './lib';
import data from './data/8-5-folders.json';

interface Raw {
	name: string;
	size?: number;
	children?: Raw[];
}
type RectNode = d3.HierarchyRectangularNode<Raw>;

// Cushion parameters after van Wijk and van de Wetering 1999 (ridge height, falloff per level),
// with a flatter ridge and more ambient light so labels stay readable.
const H0 = 0.2;
const F = 0.8;
const LIGHT = (() => {
	// Light from the top left; screen y points down, so both x and y components are negative.
	const l = [-0.09759, -0.19518, 0.9759];
	const n = Math.hypot(...l);
	return l.map((c) => c / n);
})();
const IA = 0.25;
const IS = 0.8;

const figure: Figure = {
	title: 'Flat and cushion treemaps',
	caption:
		'The same folder tree as a treemap with no borders between levels. Flat, the rectangles are a mosaic and the folders are invisible. With cushion shading, every level adds a ridge to the surface, so files in the same folder bulge together and the folder outlines appear as creases.',
	credit: 'Shading after van Wijk and van de Wetering 1999.',
	mount(el) {
		const W = 680;
		const H = 400;
		const dpr = Math.min(2, window.devicePixelRatio || 1);

		const root = d3
			.hierarchy(data as Raw)
			.sum((d) => d.size ?? 0)
			.sort((a, b) => b.value! - a.value!);
		const tm = d3.treemap<Raw>().size([W, H]).tile(d3.treemapSquarify)(root);
		const leaves = tm.leaves();

		// Each leaf's surface is z = s2*x^2 + s1*x (and the same in y), summed over its ancestors' ridges.
		const surf = leaves.map((leaf) => {
			const s = { x1: 0, x2: 0, y1: 0, y2: 0 };
			for (const a of leaf.ancestors()) {
				const h = H0 * F ** a.depth;
				const w = a.x1 - a.x0;
				const hgt = a.y1 - a.y0;
				if (w > 0) {
					s.x1 += (4 * h * (a.x1 + a.x0)) / w;
					s.x2 -= (4 * h) / w;
				}
				if (hgt > 0) {
					s.y1 += (4 * h * (a.y1 + a.y0)) / hgt;
					s.y2 -= (4 * h) / hgt;
				}
			}
			return s;
		});

		const row = controls(el);
		const canvas = document.createElement('canvas');
		canvas.width = W * dpr;
		canvas.height = H * dpr;
		canvas.setAttribute('role', 'img');
		canvas.style.cssText = `display:block;width:100%;max-width:${W}px;height:auto;`;
		el.append(canvas);
		const ctx = canvas.getContext('2d')!;
		const out = readout(el);
		let cushion = true;

		function draw() {
			const surface = d3.rgb(token('surface') || '#ffffff');
			// A light tint of series 1 in both themes, so the shading has room to darken and dark labels stay readable.
			const base = d3.rgb(d3.interpolateRgb(token('series-1'), '#ffffff')(0.35));
			const ink = '#1a1a1a';
			const img = ctx.createImageData(canvas.width, canvas.height);
			const px = img.data;
			for (let i = 0; i < px.length; i += 4) {
				px[i] = surface.r;
				px[i + 1] = surface.g;
				px[i + 2] = surface.b;
				px[i + 3] = 255;
			}
			leaves.forEach((leaf, k) => {
				const s = surf[k];
				// Flat mode keeps a hairline gap so the leaves still read as separate tiles.
				const gap = cushion ? 0 : 1;
				const x0 = Math.round(leaf.x0 * dpr);
				const x1 = Math.round(leaf.x1 * dpr) - gap * dpr;
				const y0 = Math.round(leaf.y0 * dpr);
				const y1 = Math.round(leaf.y1 * dpr) - gap * dpr;
				for (let py = y0; py < y1; py++) {
					const y = (py + 0.5) / dpr;
					const ny = -(2 * s.y2 * y + s.y1);
					for (let pxx = x0; pxx < x1; pxx++) {
						let k2 = 1;
						if (cushion) {
							const x = (pxx + 0.5) / dpr;
							const nx = -(2 * s.x2 * x + s.x1);
							const cos = (nx * LIGHT[0] + ny * LIGHT[1] + LIGHT[2]) / Math.sqrt(nx * nx + ny * ny + 1);
							k2 = IA + Math.max(0, IS * cos);
						}
						const o = (py * canvas.width + pxx) * 4;
						px[o] = base.r * k2;
						px[o + 1] = base.g * k2;
						px[o + 2] = base.b * k2;
					}
				}
			});
			ctx.putImageData(img, 0, 0);
			ctx.save();
			ctx.scale(dpr, dpr);
			ctx.font = '13px Atkinson, sans-serif';
			ctx.fillStyle = ink;
			ctx.strokeStyle = 'rgba(255,255,255,0.85)';
			ctx.lineWidth = 3;
			ctx.lineJoin = 'round';
			ctx.textBaseline = 'top';
			for (const leaf of leaves) {
				const w = leaf.x1 - leaf.x0;
				const name = leaf.data.name;
				if (w > ctx.measureText(name).width + 12 && leaf.y1 - leaf.y0 > 24) {
					ctx.strokeText(name, leaf.x0 + 6, leaf.y0 + 6);
					ctx.fillText(name, leaf.x0 + 6, leaf.y0 + 6);
				}
			}
			ctx.restore();
			canvas.setAttribute(
				'aria-label',
				`Treemap of a small website project's files, ${cushion ? 'with cushion shading that shows the folder nesting' : 'flat, with the folder nesting invisible'}.`,
			);
			out.textContent = cushion
				? 'Cushions on: the code files bunch into a few bumps on the right, one per folder, and the two photos share one ridge from the images folder.'
				: 'Cushions off: fifteen rectangles of one color. You can read sizes, but not which files share a folder.';
		}

		toggle(
			row,
			'Cushion shading',
			(on) => {
				cushion = on;
				draw();
			},
			true,
		);
		draw();
		const off = onThemeChange(draw);

		const path = (d: RectNode) =>
			d
				.ancestors()
				.reverse()
				.map((a) => a.data.name)
				.join('/');
		dataTable(
			el,
			[
				{ label: 'File', value: (d: RectNode) => path(d) },
				{ label: 'Size (KB)', value: (d) => d.value!, numeric: true },
			],
			leaves,
		);
		return off;
	},
};

export default figure;
