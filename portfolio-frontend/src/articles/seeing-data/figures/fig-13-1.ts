import * as d3 from 'd3';
import { controls, dataTable, readout, slider, svg, styleAxis, v, type Figure } from './lib';
import { blit, densityColor, MATERIALS, N, opacityTF, phantom, render, sliceZ } from './vol-13';

const OPACITY = { skin: 0.25, tissue: 0, bone: 0.12, spots: 0.8 };
const BG: [number, number, number] = [0.08, 0.08, 0.08];

/** A titled square panel; children stack on top of each other. */
function panel(grid: HTMLElement, title: string) {
	const wrap = document.createElement('div');
	const h = document.createElement('p');
	h.textContent = title;
	h.style.cssText = 'margin:0 0 6px;font-size:14px;font-weight:700;';
	const box = document.createElement('div');
	box.style.cssText = 'position:relative;width:100%;aspect-ratio:1;border-radius:4px;overflow:hidden;background:#141414;';
	wrap.append(h, box);
	grid.append(wrap);
	return box;
}

function layer<K extends keyof HTMLElementTagNameMap>(box: HTMLElement, tag: K) {
	const e = document.createElement(tag);
	(e as HTMLElement).style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
	box.append(e);
	return e;
}

function nearest(d: number) {
	const below = [...MATERIALS].reverse().find((m) => m.density <= d);
	const above = MATERIALS.find((m) => m.density > d);
	if (!below) return `below ${above!.label.toLowerCase()} (${above!.density})`;
	if (!above) return `above ${below.label.toLowerCase()} (${below.density})`;
	return `between ${below.label.toLowerCase()} (${below.density}) and ${above.label.toLowerCase()} (${above.density})`;
}

const figure: Figure = {
	title: 'Three ways to show a scalar field',
	caption:
		'One synthetic volume of 64 × 64 × 64 voxels, shown three ways. A slice is exact but flat. An isoline (in 3D, an isosurface) outlines one value only. Direct volume rendering shows several layers at once, semi-transparently.',
	credit: 'Synthetic phantom: nested ellipsoids standing in for skin, bone and tissue. No real scan data.',
	mount(el) {
		const vol = phantom();
		let k = 32;
		let iso = 52;
		let yaw = 0.6;

		const row = controls(el);
		const grid = document.createElement('div');
		grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;max-width:700px;';
		el.append(grid);

		const sliceCanvas = layer(panel(grid, 'Slice'), 'canvas');
		sliceCanvas.width = sliceCanvas.height = 256;
		sliceCanvas.setAttribute('role', 'img');

		const isoBox = panel(grid, 'Isoline on the slice');
		const isoCanvas = layer(isoBox, 'canvas');
		isoCanvas.width = isoCanvas.height = 256;
		const isoSvg = d3
			.select(layer(isoBox, 'div'))
			.append('svg')
			.attr('viewBox', `0 0 ${N} ${N}`)
			.attr('preserveAspectRatio', 'none')
			.attr('role', 'img')
			.style('width', '100%')
			.style('height', '100%')
			.style('display', 'block');
		const isoPath = isoSvg
			.append('path')
			.style('fill', 'none')
			.style('stroke', v('highlight'))
			.style('stroke-width', '2.5px')
			.attr('vector-effect', 'non-scaling-stroke');

		const dvrCanvas = layer(panel(grid, 'Volume rendering'), 'canvas');
		dvrCanvas.width = dvrCanvas.height = 256;
		dvrCanvas.setAttribute('role', 'img');
		dvrCanvas.setAttribute(
			'aria-label',
			'Volume rendering of the phantom: a faint blue skin, a translucent green bone shell, and three bright yellow dense spots inside.',
		);

		// Color key for the slice and the rendering.
		const KW = 640;
		const key = svg(el, KW, 54, 'Color key: density 0 to 100 in viridis, dark purple low to yellow high.');
		key.style('margin-top', '10px');
		const kx = d3.scaleLinear().domain([0, 100]).range([20, KW - 20]);
		const grad = key.append('defs').append('linearGradient').attr('id', 'f13-1-grad');
		for (let i = 0; i <= 10; i++)
			grad
				.append('stop')
				.attr('offset', `${i * 10}%`)
				.attr('stop-color', densityColor(i * 10));
		key.append('rect').attr('x', 20).attr('y', 4).attr('width', KW - 40).attr('height', 12).attr('fill', 'url(#f13-1-grad)');
		const ax = key.append('g').attr('transform', 'translate(0,16)');
		styleAxis(
			ax.call(
				d3
					.axisBottom(kx)
					.tickValues(MATERIALS.map((m) => m.density))
					.tickFormat((d) => `${MATERIALS.find((m) => m.density === d)!.label} ${d}`),
			),
		);
		const isoMark = key.append('path').style('fill', v('highlight'));

		const out = readout(el);

		function drawSlice() {
			const s = sliceZ(vol, k);
			const small = new ImageData(N, N);
			const grey = new ImageData(N, N);
			for (let i = 0; i < N * N; i++) {
				const c = d3.rgb(densityColor(s[i]));
				small.data.set([c.r, c.g, c.b, 255], i * 4);
				const g = 20 + s[i] * 1.6;
				grey.data.set([g, g, g, 255], i * 4);
			}
			for (const [cv, im] of [
				[sliceCanvas, small],
				[isoCanvas, grey],
			] as const) {
				const off = document.createElement('canvas');
				off.width = off.height = N;
				off.getContext('2d')!.putImageData(im, 0, 0);
				const ctx = cv.getContext('2d')!;
				ctx.imageSmoothingEnabled = false; // show the voxels as they are
				ctx.drawImage(off, 0, 0, cv.width, cv.height);
			}
			const c = d3.contours().size([N, N]).thresholds([iso])(s)[0];
			isoPath.attr('d', d3.geoPath()(c));
			isoMark.attr('d', `M${kx(iso)},18 l-6,-12 h12 z`).attr('transform', 'translate(0,-6)');
			sliceCanvas.setAttribute('aria-label', `Slice ${k + 1} of ${N} through the phantom, colored by density.`);
			isoSvg.attr('aria-label', `Isoline at density ${iso} on slice ${k + 1}.`);
			const inside = s.filter((d) => d >= iso).length;
			out.textContent = `Slice ${k + 1} of ${N}. The isoline at density ${iso} sits ${nearest(iso)}; ${d3.format('.0%')(inside / s.length)} of this slice lies above it. Everything else about the slice is invisible to the isoline: it is either inside or outside.`;
		}

		let frame = 0;
		function drawVolume() {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				const { image } = render(vol, { size: 128, yaw, tf: opacityTF(OPACITY), background: BG });
				blit(dvrCanvas, image);
			});
		}

		slider(row, 'Slice', { min: 1, max: N, value: k + 1, format: (n) => `${n} / ${N}` }, (n) => {
			k = n - 1;
			drawSlice();
		});
		slider(row, 'Isovalue', { min: 5, max: 95, value: iso }, (n) => {
			iso = n;
			drawSlice();
		});
		slider(
			row,
			'Turn the volume',
			{ min: -180, max: 180, step: 5, value: Math.round((yaw * 180) / Math.PI), format: (n) => `${n}°` },
			(n) => {
				yaw = (n * Math.PI) / 180;
				drawVolume();
			},
		);

		drawSlice();
		drawVolume();
		dataTable(
			el,
			[
				{ label: 'Material in the phantom', value: (d) => d.label },
				{ label: 'Density', value: (d) => d.density, numeric: true },
				{ label: 'Opacity in the rendering', value: (d) => OPACITY[d.key], numeric: true },
			],
			[...MATERIALS],
		);
		return () => cancelAnimationFrame(frame);
	},
};

export default figure;
