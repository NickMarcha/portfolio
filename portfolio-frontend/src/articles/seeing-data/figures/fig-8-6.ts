import * as d3 from 'd3';
import { controls, dataTable, fmt, onThemeChange, readout, rng, toggle, token, type Figure } from './lib';

interface Raw {
	name: string;
	size?: number;
	children?: Raw[];
}
type RectNode = d3.HierarchyRectangularNode<Raw>;

// A made-up game project, bigger and deeper than Figure 8.5's website so the nesting has
// something to show. Each leaf of SPEC is a folder: [file count, extension, min KB, max KB].
type Spec = { [name: string]: Spec | [number, string, number, number] };
const SPEC: Spec = {
	src: {
		engine: { render: [24, 'ts', 3, 40], physics: [18, 'ts', 3, 30], audio: [10, 'ts', 2, 20], input: [8, 'ts', 2, 12] },
		game: {
			levels: [30, 'ts', 4, 40],
			entities: { player: [12, 'ts', 3, 25], enemies: [26, 'ts', 3, 25], items: [16, 'ts', 2, 15] },
			ai: [14, 'ts', 4, 30],
		},
		ui: { menus: [16, 'ts', 3, 20], hud: [12, 'ts', 2, 15], widgets: [20, 'ts', 2, 12] },
	},
	assets: {
		textures: {
			characters: { hero: [14, 'png', 40, 220], enemies: [24, 'png', 30, 180], npcs: [12, 'png', 30, 160] },
			terrain: [28, 'png', 40, 200],
			ui: [40, 'png', 4, 40],
		},
		sounds: { sfx: [60, 'wav', 10, 120], music: [6, 'ogg', 200, 450] },
		models: [18, 'glb', 60, 300],
	},
	docs: [12, 'md', 2, 20],
	tests: { unit: [30, 'ts', 2, 15], e2e: [10, 'ts', 4, 20] },
};

function build(name: string, spec: Spec, rand: () => number): Raw {
	return {
		name,
		children: Object.entries(spec).map(([k, s]) => {
			if (!Array.isArray(s)) return build(k, s, rand);
			const [n, ext, lo, hi] = s;
			// Log-uniform sizes: many small files, a few big ones.
			return {
				name: k,
				children: d3.range(n).map((i) => ({
					name: `${k}-${String(i + 1).padStart(2, '0')}.${ext}`,
					size: Math.round(lo * (hi / lo) ** rand()),
				})),
			};
		}),
	};
}
const data = build('my-game', SPEC, rng(86));

// Cushion parameters after van Wijk and van de Wetering 1999 (ridge height, falloff per level),
// with a flatter ridge and more ambient light so labels stay readable.
const H0 = 0.3;
const F = 0.85;
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
		'A made-up game project with a few hundred files in folders up to four levels deep, as a treemap with no borders between levels. Flat, the rectangles are a mosaic and the folders are invisible. With cushion shading, every level adds a ridge to the surface, so files in the same folder bulge together and the folder outlines appear as creases.',
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
				// The root's ridge spans the whole picture and only darkens the edges, so it is skipped.
				if (a.depth === 0) continue;
				const h = H0 * F ** (a.depth - 1);
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
		let cushion = false;
		const folders = tm.descendants().filter((d) => d.children && d.depth > 0);

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
				`Treemap of ${leaves.length} files in a made-up game project, ${cushion ? 'with cushion shading that shows the folder nesting' : 'flat, with the folder nesting invisible'}.`,
			);
			out.textContent = cushion
				? `Cushions on: the same ${leaves.length} files, but now files in one folder rise into one bump, and small bumps sit on bigger ones. The creases between bumps are the folder edges, so you can see which folders sit inside which.`
				: `Cushions off: ${leaves.length} rectangles of one color. You can read sizes, but not which files share a folder.`;
		}

		toggle(
			row,
			'Cushion shading',
			(on) => {
				cushion = on;
				draw();
			},
			false,
		);
		draw();
		const off = onThemeChange(draw);

		const path = (d: RectNode) =>
			d
				.ancestors()
				.reverse()
				.map((a) => a.data.name)
				.join('/');
		// One row per folder: a few hundred file rows would bury the structure the figure is about.
		dataTable(
			el,
			[
				{ label: 'Folder', value: (d: RectNode) => path(d) + '/' },
				{ label: 'Files', value: (d) => d.leaves().length, numeric: true },
				{ label: 'Size (KB)', value: (d) => fmt.int(d.value!), numeric: true },
			],
			folders.sort((a, b) => d3.ascending(path(a), path(b))),
		);
		return off;
	},
};

export default figure;
