import * as d3 from 'd3';
import { button, controls, dataTable, gridY, readout, slider, styleAxis, svg, v, type Figure } from './lib';
import raw from './data/15-1-co2.json';

// [year, month, ppm], monthly means at Mauna Loa, 2005-2024
const DATA = (raw as [number, number, number][]).map(([y, m, ppm]) => ({ t: y + (m - 0.5) / 12, y, m, ppm }));

const figure: Figure = {
	title: 'Banking to 45 degrees',
	caption:
		'Twenty years of monthly CO₂ readings from Mauna Loa. Banked so the typical line segment sits at 45 degrees, the shape of the yearly cycle shows: CO₂ drops quickly each summer and climbs back slowly.',
	credit:
		'Data: Mauna Loa monthly mean CO₂, Xin Lan, NOAA Global Monitoring Laboratory (gml.noaa.gov/ccgg/trends), and Ralph Keeling, Scripps Institution of Oceanography; freely available US government data. Method after Cleveland, McGill and McGill 1988.',
	mount(el) {
		const W = 680;
		const m = { top: 16, right: 20, bottom: 32, left: 52 };
		const iw = W - m.left - m.right;

		// Slopes of the segments in data units normalised to the axis ranges, so that the
		// angle on screen is atan(|s| * height / width).
		const tExt = d3.extent(DATA, (d) => d.t) as [number, number];
		const vExt = d3.extent(DATA, (d) => d.ppm) as [number, number];
		const slopes = d3.pairs(DATA).map(([a, b]) => {
			const dv = (b.ppm - a.ppm) / (vExt[1] - vExt[0]);
			const dt = (b.t - a.t) / (tExt[1] - tExt[0]);
			return Math.abs(dv / dt);
		});
		const medianAngle = (aspect: number) =>
			(d3.median(slopes.map((s) => Math.atan(s * aspect)))! * 180) / Math.PI;
		const banked = 1 / d3.median(slopes)!;

		const row = controls(el);
		const root = svg(el, W, 200, 'Line chart of monthly carbon dioxide at Mauna Loa from 2005 to 2024, rising from about 379 to 425 parts per million with a yearly up-and-down cycle.');
		const g = root.append('g').attr('transform', `translate(${m.left},${m.top})`);
		const grid = g.append('g');
		const xAxis = g.append('g');
		const yAxis = g.append('g');
		const path = g
			.append('path')
			.style('fill', 'none')
			.style('stroke', v('series-1'))
			.style('stroke-width', 2)
			.style('stroke-linejoin', 'round');
		g
			.append('text')
			.attr('x', -8)
			.attr('y', -4)
			.attr('text-anchor', 'end')
			.style('fill', v('muted'))
			.style('font-size', '12px')
			.text('ppm');
		const out = readout(el);

		const x = d3.scaleLinear().domain(tExt).range([0, iw]);
		function draw(aspect: number) {
			const ih = Math.round(iw * aspect);
			const H = ih + m.top + m.bottom;
			root.attr('viewBox', `0 0 ${W} ${H}`);
			const y = d3.scaleLinear().domain(vExt).range([ih, 0]);
			const ticks = ih < 120 ? 2 : 5;
			gridY(grid, y, iw, ticks);
			styleAxis(xAxis.attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).ticks(8).tickFormat(d3.format('d'))));
			styleAxis(yAxis.call(d3.axisLeft(y).ticks(ticks)));
			path.attr(
				'd',
				d3
					.line<(typeof DATA)[number]>()
					.x((d) => x(d.t))
					.y((d) => y(d.ppm))(DATA),
			);
			const a = medianAngle(aspect);
			const verdict =
				Math.abs(a - 45) < 4
					? 'Banked: now you can see that each summer’s drop is steeper than the slow rise through autumn, winter and spring.'
					: a > 45
						? 'Too tall: nearly every segment is close to vertical, so the steep summer drop and the slower rise look much the same.'
						: 'Too flat: the segments are nearly level and the yearly cycle shrinks to a ripple on the trend.';
			out.textContent = `Height is ${Math.round(aspect * 100)}% of the width. The typical (median) line segment sits at ${Math.round(a)}°. ${verdict}`;
		}

		const input = slider(
			row,
			'Height as share of width',
			{ min: 0.04, max: 1, step: 0.01, value: 0.6, format: (n) => `${Math.round(n * 100)}%` },
			draw,
		);
		button(row, 'Bank to 45°', () => {
			const a = Math.round(banked * 100) / 100;
			input.value = String(a);
			input.dispatchEvent(new Event('input'));
		});
		draw(0.6);

		dataTable(
			el,
			[
				{ label: 'Year', value: (d) => String(d.y) },
				{ label: 'Month', value: (d) => String(d.m) },
				{ label: 'CO₂ (ppm)', value: (d) => d.ppm.toFixed(2), numeric: true },
			],
			DATA,
		);
	},
};

export default figure;
