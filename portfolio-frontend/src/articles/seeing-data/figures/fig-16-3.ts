import * as d3 from 'd3';
import { button, controls, dataTable, gridY, readout, rng, select, styleAxis, svg, toggle, v, type Figure } from './lib';

// Part 1: a bar with an error bar, and two points at the same distance from the mean.
const MEAN = 50;
const SD = 10;
const POINTS = [
	{ name: 'A', value: 42, note: '8 below the mean' },
	{ name: 'B', value: 58, note: '8 above the mean' },
];

// Part 2: a synthetic hurricane forecast. Every track is a random walk in heading and speed.
const STEPS = 10; // 12-hour steps, 5 days
const KM_PER_UNIT = 10;
function ensemble(n: number) {
	const random = rng(2019);
	const normal = d3.randomNormal.source(random);
	const turn = normal(0, 5);
	const speed = normal(25, 4);
	return d3.range(n).map(() => {
		let x = 0;
		let y = 0;
		let heading = -40;
		const pts = [{ x, y }];
		for (let s = 0; s < STEPS; s++) {
			heading += 4 + turn();
			const sp = speed();
			x += Math.cos((heading * Math.PI) / 180) * sp;
			y += Math.sin((heading * Math.PI) / 180) * sp;
			pts.push({ x, y });
		}
		return pts;
	});
}
const TRACKS = ensemble(400);
const CENTER = d3.range(STEPS + 1).map((s) => ({
	x: d3.mean(TRACKS, (t) => t[s].x)!,
	y: d3.mean(TRACKS, (t) => t[s].y)!,
}));
// Like the official cone: a circle at each forecast time holding two thirds of the outcomes.
const RADIUS = CENTER.map((c, s) => d3.quantile(TRACKS.map((t) => Math.hypot(t[s].x - c.x, t[s].y - c.y)).sort(d3.ascending), 2 / 3)!);

type View = 'cone' | 'tracks';

const figure: Figure = {
	title: 'Where a boundary is drawn, people see a category',
	caption:
		'Top: points A and B are equally far from the mean, but the one inside the bar looks like it belongs and the one above looks like an outlier. Bottom: a made-up hurricane forecast drawn as a cone and as a sample of possible tracks. The cone’s outline is easy to read as a storm that grows; the tracks show a spread of paths.',
	credit: 'Synthetic data, no real storm or map. Error-bar demo from the INF252 lecture; tracks after Liu et al. 2019.',
	mount(el) {
		// ---------- Part 1 ----------
		const row1 = controls(el);
		const W = 680;
		const H1 = 250;
		const m = { top: 16, right: 20, bottom: 28, left: 48 };
		const ih1 = H1 - m.top - m.bottom;
		const root1 = svg(el, W, H1, `A bar at ${MEAN} with an error bar of plus and minus ${SD}. Point A at ${POINTS[0].value} sits inside the bar, point B at ${POINTS[1].value} sits above it. Both are 8 from the mean.`);
		const g1 = root1.append('g').attr('transform', `translate(${m.left},${m.top})`);
		const y = d3.scaleLinear().domain([0, 80]).range([ih1, 0]);
		gridY(g1.append('g'), y, 520, 4);
		styleAxis(g1.append('g').call(d3.axisLeft(y).ticks(4)));
		const bx = 60;
		const bw = 120;
		g1.append('rect').attr('x', bx).attr('width', bw).attr('y', y(MEAN)).attr('height', ih1 - y(MEAN)).style('fill', v('dim'));
		const cx = bx + bw / 2;
		g1.append('line').attr('x1', cx).attr('x2', cx).attr('y1', y(MEAN - SD)).attr('y2', y(MEAN + SD)).style('stroke', v('ink')).style('stroke-width', 2);
		for (const e of [MEAN - SD, MEAN + SD])
			g1.append('line').attr('x1', cx - 12).attr('x2', cx + 12).attr('y1', y(e)).attr('y2', y(e)).style('stroke', v('ink')).style('stroke-width', 2);
		// The distribution the bar summarises, as a density curve beside it. Hidden at first.
		const dist = g1.append('g').style('display', 'none');
		const dens = d3.range(MEAN - 3 * SD, MEAN + 3 * SD + 0.1, 0.5).map((t) => [t, Math.exp(-0.5 * ((t - MEAN) / SD) ** 2)] as [number, number]);
		dist.append('path')
			.attr(
				'd',
				d3
					.area<[number, number]>()
					.y((d) => y(d[0]))
					.x0(330)
					.x1((d) => 330 + d[1] * 70)
					.curve(d3.curveBasis)(dens),
			)
			.style('fill', v('series-1'))
			.style('fill-opacity', 0.3)
			.style('stroke', v('series-1'))
			.style('stroke-width', 2);
		dist.append('text')
			.attr('x', 408)
			.attr('y', y(MEAN))
			.attr('dy', '0.35em')
			.style('fill', v('ink'))
			.style('font-size', '13px')
			.text('Spread of the data');
		const px = cx + 40;
		for (const p of POINTS) {
			g1.append('circle').attr('cx', px).attr('cy', y(p.value)).attr('r', 6).style('fill', v('highlight'));
			g1.append('text')
				.attr('x', px + 12)
				.attr('y', y(p.value))
				.attr('dy', '0.35em')
				.style('fill', v('ink'))
				.style('font-size', '13px')
				.text(`${p.name}: ${p.value}, ${p.note}`);
		}
		const out1 = readout(el);
		const say1 = (on: boolean) =>
			(out1.textContent = on
				? 'The curve is the spread the error bar stands for. A and B sit at the same height on it, so they are equally likely. The bar’s edge is just where the mean happens to be.'
				: 'Which point is more likely to come from this data? Most people pick A, because it is inside the bar.');
		toggle(row1, 'Show the spread behind the bar', (on) => {
			dist.style('display', on ? '' : 'none');
			say1(on);
		});
		say1(false);

		// ---------- Part 2 ----------
		const row2 = controls(el);
		row2.style.marginTop = '20px';
		// Frame the cone (plus a margin); the odd sampled track that strays further is clipped.
		const xMin = d3.min(CENTER, (c, i) => c.x - RADIUS[i])!;
		const xMax = d3.max(CENTER, (c, i) => c.x + RADIUS[i])!;
		const yMin = d3.min(CENTER, (c, i) => c.y - RADIUS[i])!;
		const yMax = d3.max(CENTER, (c, i) => c.y + RADIUS[i])!;
		const k = (W - 100) / (xMax - xMin);
		const H2 = Math.round((yMax - yMin) * k + 110);
		const sx = (vx: number) => 50 + (vx - xMin) * k;
		const sy = (vy: number) => 60 + (vy - yMin) * k;
		const root2 = svg(el, W, H2, `A synthetic hurricane forecast over five days. The storm starts at the lower left and heads up and to the right, curving right. The uncertainty widens from zero to about ${Math.round((RADIUS[STEPS] * KM_PER_UNIT) / 10) * 10} kilometres by day five.`);
		const clipId = `clip-16-3-${Math.random().toString(36).slice(2)}`;
		root2.append('clipPath').attr('id', clipId).append('rect').attr('width', W).attr('height', H2);
		const g2 = root2.append('g').attr('clip-path', `url(#${clipId})`);
		const coneG = g2.append('g');
		const outline = coneG.append('g');
		const fill = coneG.append('g');
		const circles = d3.range(1, STEPS * 16 + 1).map((i) => {
			// Interpolate between forecast times so the cone edge is smooth.
			const s = i / 16;
			const a = Math.floor(s);
			const b = Math.min(STEPS, a + 1);
			const f = s - a;
			return {
				x: CENTER[a].x + (CENTER[b].x - CENTER[a].x) * f,
				y: CENTER[a].y + (CENTER[b].y - CENTER[a].y) * f,
				r: RADIUS[a] + (RADIUS[b] - RADIUS[a]) * f,
			};
		});
		outline
			.selectAll('circle')
			.data(circles)
			.join('circle')
			.attr('cx', (d) => sx(d.x))
			.attr('cy', (d) => sy(d.y))
			.attr('r', (d) => d.r * k + 1.5)
			.style('fill', v('ink'));
		fill
			.selectAll('circle')
			.data(circles)
			.join('circle')
			.attr('cx', (d) => sx(d.x))
			.attr('cy', (d) => sy(d.y))
			.attr('r', (d) => d.r * k)
			.style('fill', v('dim'));
		const line = d3
			.line<{ x: number; y: number }>()
			.x((d) => sx(d.x))
			.y((d) => sy(d.y));
		coneG.append('path').attr('d', line(CENTER)).style('fill', 'none').style('stroke', v('ink')).style('stroke-width', 2).style('stroke-dasharray', '5 4');
		const tracksG = g2.append('g');
		const marks = coneG.append('g');
		[0, 2, 4, 6, 8, 10].forEach((s) => {
			marks.append('circle').attr('cx', sx(CENTER[s].x)).attr('cy', sy(CENTER[s].y)).attr('r', 4).style('fill', v('ink'));
			if (s > 0)
				marks.append('text')
					.attr('x', sx(CENTER[s].x) - 4)
					.attr('text-anchor', 'end')
					.attr('y', sy(CENTER[s].y) - 10)
					.style('fill', v('ink'))
					.style('font-size', '13px')
					.text(`Day ${s / 2}`);
		});
		g2.append('circle').attr('cx', sx(0)).attr('cy', sy(0)).attr('r', 5).style('fill', v('ink'));
		g2.append('text')
			.attr('x', sx(0))
			.attr('y', sy(0) + 22)
			.attr('text-anchor', 'middle')
			.style('fill', v('ink'))
			.style('font-size', '13px')
			.text('Storm now');
		// Scale bar
		const bar = root2.append('g').attr('transform', `translate(${W - 160},${H2 - 20})`);
		bar.append('line').attr('x2', (100 / KM_PER_UNIT) * k * 2).style('stroke', v('muted')).style('stroke-width', 2);
		bar.append('text').attr('y', -6).style('fill', v('muted')).style('font-size', '12px').text('200 km');

		let seed = 1;
		function drawSample() {
			const pick = rng(seed);
			const sample = d3.range(12).map(() => TRACKS[Math.floor(pick() * TRACKS.length)]);
			tracksG
				.selectAll('path')
				.data(sample)
				.join('path')
				.attr('d', (t) => line(t))
				.style('fill', 'none')
				.style('stroke', v('series-1'))
				.style('stroke-width', 2)
				.style('stroke-opacity', 0.85);
		}
		const out2 = readout(el);
		let newBtn: HTMLButtonElement;
		function show(view: View) {
			coneG.style('display', view === 'cone' ? '' : 'none');
			tracksG.style('display', view === 'tracks' ? '' : 'none');
			newBtn.disabled = view !== 'tracks';
			out2.textContent =
				view === 'cone'
					? 'The cone holds the storm’s centre about two times in three. It says nothing about the storm’s size, yet the widening outline is easy to read as a storm that grows, and its edge as a safe line.'
					: 'Each line is one possible path for the storm’s centre, drawn from the same forecast. The spread is visible, and there is no edge to mistake for a boundary.';
		}
		select<View>(
			row2,
			'Show the forecast as',
			[
				{ value: 'cone', label: 'A cone' },
				{ value: 'tracks', label: 'A sample of tracks' },
			],
			show,
			'cone',
		);
		newBtn = button(row2, 'Draw another sample', () => {
			seed += 1;
			drawSample();
		});
		drawSample();
		show('cone');

		dataTable(
			el,
			[
				{ label: 'Forecast day', value: (d) => d.day },
				{ label: 'Cone radius (km)', value: (d) => Math.round(d.r * KM_PER_UNIT), numeric: true },
			],
			RADIUS.map((r, s) => ({ day: (s / 2).toFixed(1), r })),
			'Show the cone’s widths',
		);
	},
};

export default figure;
