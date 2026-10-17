import * as d3 from 'd3';
import { isNarrow, svg, v, type Figure } from './lib';

const STEPS = [
	{ title: '1. Reconstruction', lines: ['Estimate the value at', 'each sample from the', 'voxels around it.'] },
	{ title: '2. Classification', lines: ['The transfer function', 'turns each value into', 'a color and opacity.'] },
	{ title: '3. Shading', lines: ['The gradient acts as', 'the surface normal', 'for the lighting.'] },
	{ title: '4. Compositing', lines: ['Blend the samples', 'along the ray into', 'one pixel.'] },
];

const figure: Figure = {
	title: 'How a volume becomes an image',
	caption:
		'A ray leaves the eye, passes through one pixel of the screen and through the volume, taking samples at regular steps. Each sample goes through the same four steps, and the ray ends as one pixel color.',
	credit: 'After Levoy 1988.',
	mount(el) {
		const narrow = isNarrow(el);
		// Phones: the ray diagram is squeezed into the real width and the four steps stack, one per row.
		const W = narrow ? el.clientWidth : 680;
		const BOX = 160;
		const BGAP = 24;
		const top = narrow ? 290 : 264;
		const H = narrow ? top + 4 * BOX + 3 * BGAP + 4 : 430;
		const root = svg(
			el,
			W,
			H,
			'Diagram: a ray from an eye passes through a screen pixel and a grid of voxels, sampling between them. Below, the four pipeline steps: reconstruction, classification, shading, compositing.',
		);
		const label = (x: number, y: number, t: string, anchor = 'middle', weight = 400) =>
			root
				.append('text')
				.attr('x', x)
				.attr('y', y)
				.attr('text-anchor', anchor)
				.style('fill', v('ink'))
				.style('font-size', '14px')
				.style('font-weight', weight)
				.text(t);

		// --- Top: eye, screen, voxel grid, ray, samples ---
		const eyeX = narrow ? 22 : 34;
		const rayY = 112;
		root.append('path')
			.attr('d', `M${eyeX - 14},${rayY} Q${eyeX},${rayY - 14} ${eyeX + 14},${rayY} Q${eyeX},${rayY + 14} ${eyeX - 14},${rayY}Z`)
			.style('fill', 'none')
			.style('stroke', v('ink'))
			.style('stroke-width', '2px');
		root.append('circle').attr('cx', eyeX + 2).attr('cy', rayY).attr('r', 4).style('fill', v('ink'));
		label(eyeX, rayY + 34, 'Eye');

		const scrX = narrow ? 58 : 104;
		root.append('line').attr('x1', scrX).attr('x2', scrX).attr('y1', 40).attr('y2', 196).style('stroke', v('muted')).style('stroke-width', '3px');
		root.append('rect').attr('x', scrX - 5).attr('y', rayY - 9).attr('width', 10).attr('height', 18).style('fill', v('highlight'));
		label(scrX, 30, 'Screen');

		// A 2D cross-section of the voxel grid with a round blob of higher density.
		const cols = 9;
		const rows = 6;
		const gx = d3.scaleLinear().domain([0, cols - 1]).range(narrow ? [92, W - 16] : [170, 470]);
		const gy = d3.scaleLinear().domain([0, rows - 1]).range([36, 200]);
		const dens = (i: number, j: number) => 100 * Math.exp(-((i - 4.6) ** 2 + (j - 2.4) ** 2) / 5);
		for (let i = 0; i < cols; i++) {
			root.append('line').attr('x1', gx(i)).attr('x2', gx(i)).attr('y1', gy(0)).attr('y2', gy(rows - 1)).style('stroke', v('grid'));
		}
		for (let j = 0; j < rows; j++) {
			root.append('line').attr('x1', gx(0)).attr('x2', gx(cols - 1)).attr('y1', gy(j)).attr('y2', gy(j)).style('stroke', v('grid'));
		}
		const voxels = d3.cross(d3.range(cols), d3.range(rows));
		root.append('g')
			.selectAll('circle')
			.data(voxels)
			.join('circle')
			.attr('cx', ([i]) => gx(i))
			.attr('cy', ([, j]) => gy(j))
			.attr('r', narrow ? 5 : 6)
			.attr('fill', ([i, j]) => d3.interpolateViridis(dens(i, j) / 100))
			// A muted ring keeps the darkest voxels visible on the dark theme.
			.style('stroke', v('muted'))
			.style('stroke-width', '1px');
		label(narrow ? W / 2 : 320, 226, 'Voxels (dot color = density)');

		// The ray, slightly tilted, runs between two rows of voxels so the samples fall between them.
		const rayEnd = { x: narrow ? W - 4 : 520, y: rayY + 10 };
		const rayAt = (t: number) => ({ x: eyeX + 16 + t * (rayEnd.x - eyeX - 16), y: rayY + t * (rayEnd.y - rayY) });
		root.append('line')
			.attr('x1', eyeX + 16)
			.attr('y1', rayY)
			.attr('x2', rayEnd.x)
			.attr('y2', rayEnd.y)
			.style('stroke', v('ink'))
			.style('stroke-width', '2px');
		root.append('path').attr('d', `M${rayEnd.x},${rayEnd.y} l-10,-6 l1,12z`).style('fill', v('ink'));
		const samples = d3.range(0.31, 0.93, narrow ? 0.068 : 0.048).map(rayAt);
		root.append('g')
			.selectAll('circle')
			.data(samples)
			.join('circle')
			.attr('cx', (d) => d.x)
			.attr('cy', (d) => d.y)
			.attr('r', narrow ? 4 : 4.5)
			.style('fill', v('highlight'))
			.style('stroke', v('surface'))
			.style('stroke-width', '1.5px');
		if (narrow) {
			// No room to the right of the grid, so the sample key goes under the voxel label.
			label(W / 2 - 70, 250, 'Samples at regular steps', 'start');
			root.append('circle').attr('cx', W / 2 - 80).attr('cy', 245).attr('r', 4.5).style('fill', v('highlight'));
		} else {
			label(560, 92, 'Samples at', 'start');
			label(560, 110, 'regular steps', 'start');
			root.append('circle').attr('cx', 550).attr('cy', 87).attr('r', 4.5).style('fill', v('highlight'));
		}

		// --- Bottom: the four steps ---
		const PW = 152; // width the step pictures are drawn for
		const bw = narrow ? W : PW;
		const gap = narrow ? 0 : (W - 4 * bw) / 3;
		const boxes = root.append('g');
		STEPS.forEach((s, k) => {
			const x0 = narrow ? 0 : k * (bw + gap);
			const y0 = narrow ? top + k * (BOX + BGAP) : top;
			const g = boxes.append('g').attr('transform', `translate(${x0},${y0})`);
			g.append('rect').attr('width', bw).attr('height', BOX).attr('rx', 6).style('fill', 'none').style('stroke', v('axis'));
			g.append('text').attr('x', 10).attr('y', 22).style('fill', v('ink')).style('font-size', '14px').style('font-weight', 700).text(s.title);
			s.lines.forEach((t, i) =>
				g.append('text').attr('x', 10).attr('y', 116 + i * 16).style('fill', v('ink')).style('font-size', '13px').text(t),
			);
			const pic = g.append('g').attr('transform', `translate(${(bw - PW) / 2},34)`);
			if (k === 0) {
				// A cell: four voxels and a sample inside, weighted by distance.
				const c = [
					[46, 6],
					[106, 6],
					[46, 62],
					[106, 62],
				];
				for (const [cx, cy] of c) pic.append('line').attr('x1', 86).attr('y1', 26).attr('x2', cx).attr('y2', cy).style('stroke', v('muted')).style('stroke-dasharray', '3 3');
				for (const [cx, cy] of c) pic.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 6).style('fill', v('dim'));
				pic.append('circle').attr('cx', 86).attr('cy', 26).attr('r', 4.5).style('fill', v('highlight'));
			} else if (k === 1) {
				// Mini transfer function: opacity peak over a color ramp.
				const tx = d3.scaleLinear().domain([0, 100]).range([18, PW - 18]);
				const ty = d3.scaleLinear().domain([0, 1]).range([56, 4]);
				const tf = (d: number) => Math.max(0, 1 - Math.abs(d - 70) / 14) * 0.9 + Math.max(0, 1 - Math.abs(d - 25) / 10) * 0.25;
				pic.append('path')
					.attr('d', d3.line<number>().x(tx).y((d) => ty(tf(d)))(d3.range(0, 101, 1)))
					.style('fill', 'none')
					.style('stroke', v('ink'))
					.style('stroke-width', '2px');
				d3.range(0, 100, 5).forEach((d) =>
					pic.append('rect').attr('x', tx(d)).attr('y', 60).attr('width', tx(5) - tx(0) + 0.5).attr('height', 8).attr('fill', d3.interpolateViridis(d / 100)),
				);
			} else if (k === 2) {
				// A curved boundary with the gradient arrow as its normal.
				pic.append('path').attr('d', 'M20,62 Q76,-6 132,62').style('fill', v('dim')).style('stroke', v('muted'));
				pic.append('line').attr('x1', 76).attr('y1', 28).attr('x2', 76).attr('y2', 0).style('stroke', v('ink')).style('stroke-width', '2px');
				pic.append('path').attr('d', 'M76,-4 l-5,9 h10z').style('fill', v('ink'));
				pic.append('text').attr('x', 84).attr('y', 10).style('fill', v('ink')).style('font-size', '13px').text('gradient');
			} else {
				// Semi-transparent samples stacking into one pixel.
				const cs = [0.15, 0.3, 0.5, 0.75];
				cs.forEach((a, i) =>
					pic.append('rect').attr('x', 10 + i * 16).attr('y', 14 + i * 6).attr('width', 30).attr('height', 30).style('fill', v('highlight')).style('fill-opacity', a),
				);
				pic.append('text').attr('x', 100).attr('y', 42).style('fill', v('ink')).style('font-size', '18px').text('→');
				pic.append('rect').attr('x', 128).attr('y', 26).attr('width', 16).attr('height', 16).style('fill', v('highlight'));
			}
			if (k < 3 && narrow)
				root.append('path')
					.attr('d', `M${W / 2},${y0 + BOX + 3} v${BGAP - 10} l-5,-1 l5,7 l5,-7 l-5,1`)
					.style('fill', v('muted'))
					.style('stroke', v('muted'));
			else if (k < 3)
				root.append('path')
					.attr('d', `M${x0 + bw + 3},${top + 80} h${gap - 10} l-1,-5 l7,5 l-7,5 l1,-5`)
					.style('fill', v('muted'))
					.style('stroke', v('muted'));
		});
		label(W / 2, top - 12, 'For every sample on the ray:');
	},
};

export default figure;
