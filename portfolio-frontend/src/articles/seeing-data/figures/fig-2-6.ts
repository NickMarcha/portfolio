import * as d3 from 'd3';
import { button, controls, dataTable, diverging, fmt, isNarrow, onThemeChange, readout, rng, svg, v, type Figure } from './lib';

const NX = 80;
const NY = 50;

// Synthetic terrain: a few seeded Gaussian hills and basins, scaled to ±1,200 m.
function terrain(): number[] {
	const r = rng(252);
	const bumps = Array.from({ length: 14 }, (_, i) => ({
		x: r() * NX,
		y: r() * NY,
		s: 4 + r() * 8,
		h: (i % 2 === 0 ? -1 : 1) * (0.5 + r()),
	}));
	const z = d3.range(NX * NY).map((k) => {
		const x = k % NX;
		const y = Math.floor(k / NX);
		return d3.sum(bumps, (b) => b.h * Math.exp(-((x - b.x) ** 2 + (y - b.y) ** 2) / (2 * b.s * b.s)));
	});
	// Scale land and sea separately so the peak is +1,200 m and the deepest point -1,200 m.
	const hi = d3.max(z)!;
	const lo = -d3.min(z)!;
	return z.map((d) => Math.round((d > 0 ? d / hi : d / lo) * 1200));
}

function pad(z: number[]): number[] {
	const out: number[] = [];
	for (let y = -1; y <= NY; y++)
		for (let x = -1; x <= NX; x++) out.push(z[Math.min(NY - 1, Math.max(0, y)) * NX + Math.min(NX - 1, Math.max(0, x))]);
	return out;
}

const figure: Figure = {
	title: 'Flip the sign, swap the colors',
	caption:
		'A made-up landscape, above and below sea level, on a diverging color scale: red above sea level, blue below, grey at the coast. Negate the data and land becomes sea. The colors swap and the coastline stays put, so the picture changes exactly as much as the data did.',
	credit: 'After Kindlmann and Scheidegger 2014. Synthetic data.',
	mount(el) {
		let z = terrain();
		let negated = false;
		const M = 1200;
		// Phone layout: cells shrink so the grid fits the body width at 1 unit = 1 px.
		const narrow = isNarrow(el);
		const CELL = narrow ? el.clientWidth / NX : 8;
		const W = NX * CELL;
		const LW = narrow ? Math.min(320, W - 16) : 320;
		const H = NY * CELL + 56;

		const row = controls(el);
		const root = svg(el, W, H, 'Map of a made-up landscape colored by elevation, blue below sea level and red above.');
		// Contours run on a grid padded by one cell and are clipped back, so the border of
		// the grid doesn't show up as a coastline.
		const path = d3.geoPath(d3.geoIdentity().scale(CELL).translate([-CELL, -CELL]));
		root.append('clipPath').attr('id', 'fig26-clip').append('rect').attr('width', W).attr('height', NY * CELL);
		const map = root.append('g').attr('clip-path', 'url(#fig26-clip)');
		const bands = map.append('g');
		const coast = map.append('path').style('fill', 'none').style('stroke', v('ink')).style('stroke-width', 2);
		const thresholds = d3.range(-M, M + 1, 200);

		// Legend
		const lg = root.append('g').attr('transform', `translate(${W / 2 - LW / 2},${NY * CELL + 16})`);
		const lx = d3.scaleLinear().domain([-M, M]).range([0, LW]);
		const swatches = lg.append('g');
		lg.append('g')
			.selectAll('text')
			.data([
				{ x: -M, t: `${fmt.int(-M)} m`, a: 'start' },
				{ x: 0, t: 'sea level', a: 'middle' },
				{ x: M, t: `+${fmt.int(M)} m`, a: 'end' },
			])
			.join('text')
			.attr('x', (d) => lx(d.x))
			.attr('y', 32)
			.attr('text-anchor', (d) => d.a)
			.style('fill', v('muted'))
			.style('font-size', '12px')
			.text((d) => d.t);

		const out = readout(el);

		function draw() {
			const color = diverging();
			const c = (lo: number) => color((lo + 100 + M) / (2 * M));
			const zp = pad(z);
			const contours = d3.contours().size([NX + 2, NY + 2]).thresholds(thresholds.slice(0, -1))(zp);
			bands
				.selectAll('path')
				.data(contours)
				.join('path')
				.attr('d', path)
				.style('fill', (d) => c(d.value));
			coast.attr('d', path(d3.contours().size([NX + 2, NY + 2]).thresholds([0])(zp)[0]));
			swatches
				.selectAll('rect')
				.data(thresholds.slice(0, -1))
				.join('rect')
				.attr('x', (d) => lx(d))
				.attr('width', lx(200) - lx(0))
				.attr('height', 12)
				.style('fill', (d) => c(d));

			const land = z.filter((d) => d > 0).length / z.length;
			const hi = d3.max(z)!;
			const lo = d3.min(z)!;
			out.textContent = `${negated ? 'Negated. ' : ''}Highest point ${fmt.int(hi)} m, deepest point ${fmt.int(lo)} m, ${fmt.pct(land)} of the area above sea level.`;
			root.attr('aria-label', `Map of a made-up landscape colored by elevation, ${fmt.pct(land)} above sea level (red), the rest below (blue).${negated ? ' The data is negated.' : ''}`);
			dataTable(
				el,
				[
					{ label: 'Measure', value: (d) => d[0] },
					{ label: 'Value', value: (d) => d[1], numeric: true },
				],
				[
					['Highest point (m)', fmt.int(hi)],
					['Deepest point (m)', fmt.int(lo)],
					['Area above sea level', fmt.pct(land)],
					['Grid cells', fmt.int(z.length)],
				],
				'Show summary numbers',
			);
		}

		const b = button(row, 'Negate the data', () => {
			z = z.map((d) => -d);
			negated = !negated;
			b.setAttribute('aria-pressed', String(negated));
			draw();
		});
		b.setAttribute('aria-pressed', 'false');

		draw();
		return onThemeChange(draw);
	},
};

export default figure;
