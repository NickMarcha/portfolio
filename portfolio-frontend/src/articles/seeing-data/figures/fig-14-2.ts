import * as d3 from 'd3';
import { button, controls, dataTable, isNarrow, readout, reducedMotion, slider, svg, toggle, v, type Figure } from './lib';

type P = [number, number];

// Unsteady wind: stronger higher up, and swinging up and down over time.
const PERIOD = 6;
const vel = ([, y]: P, t: number): P => [1 + 0.25 * y, 0.25 + 0.8 * Math.sin((2 * Math.PI * t) / PERIOD)];

const DT = 0.02;
function rk4(p: P, t: number, h: number, frozen = false): P {
	const f = (q: P, s: number) => vel(q, frozen ? t : s);
	const k1 = f(p, t);
	const k2 = f([p[0] + (h / 2) * k1[0], p[1] + (h / 2) * k1[1]], t + h / 2);
	const k3 = f([p[0] + (h / 2) * k2[0], p[1] + (h / 2) * k2[1]], t + h / 2);
	const k4 = f([p[0] + h * k3[0], p[1] + h * k3[1]], t + h);
	return [p[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), p[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])];
}

/** Moves a particle from time t0 to t1, optionally recording its path. */
function advect(p: P, t0: number, t1: number, path?: P[]): P {
	let q = p;
	let t = t0;
	path?.push(q);
	while (t < t1 - 1e-9) {
		const h = Math.min(DT, t1 - t);
		q = rk4(q, t, h);
		t += h;
		path?.push(q);
	}
	return q;
}

const CHIMNEY: P = [0, 0];
const T_MAX = 21;
const RELEASE_EVERY = 7; // a new puff and a new row of bubbles every 7 seconds
const X = [-0.6, 9.4];
const Y = [-1.3, 3.2];

const KINDS = [
	{ key: 'stream', label: 'Streamline', dash: null, color: 'series-1' },
	{ key: 'path', label: 'Pathline', dash: '8 5', color: 'series-2' },
	{ key: 'streak', label: 'Streakline', dash: '2 4', color: 'series-3' },
	{ key: 'time', label: 'Timeline', dash: '10 4 2 4', color: 'series-4' },
] as const;
type Kind = (typeof KINDS)[number]['key'];

const figure: Figure = {
	title: 'Four kinds of lines from one chimney',
	caption:
		'The wind swings up and down over time and blows harder higher up, so the four lines all differ.',
	mount(el) {
		const row = controls(el);
		const narrow = isNarrow(el);
		const W = narrow ? el.clientWidth : 680;
		const H = Math.round((W * (Y[1] - Y[0])) / (X[1] - X[0]));
		const x = d3.scaleLinear().domain(X).range([0, W]);
		const y = d3.scaleLinear().domain(Y).range([H, 0]);
		const root = svg(el, W, H, 'A chimney in changing wind, with a streamline, pathline, streakline and timeline drawn from it.');
		const show: Record<Kind, boolean> = { stream: true, path: true, streak: true, time: true };

		const hedgehog = root.append('g');
		const arrows = d3.cross(d3.range(0.5, 9.4, 1), d3.range(-0.8, 3.2, 0.8)) as P[];
		root.append('rect')
			.attr('x', x(-0.2))
			.attr('y', y(0))
			.attr('width', x(0.2) - x(-0.2))
			.attr('height', H - y(0))
			.style('fill', v('muted'));
		// Phone: the chimney is too short for its rotated label, so it sits beside it.
		if (narrow)
			root.append('text')
				.attr('x', x(0.2) + 4)
				.attr('y', H - 4)
				.style('fill', v('muted'))
				.style('font-size', '12px')
				.style('paint-order', 'stroke')
				.style('stroke', v('surface'))
				.style('stroke-width', '3px')
				.text('chimney');
		else
			root.append('text')
				.attr('x', x(-0.2) + 4)
				.attr('y', H - 8)
				.attr('transform', `rotate(-90 ${x(-0.2) + 4} ${H - 8})`)
				.attr('dy', '1em')
				.style('fill', v('surface'))
				.style('font-size', '12px')
				.text('chimney');
		const layers = Object.fromEntries(
			KINDS.map((k) => [
				k.key,
				root
					.append('path')
					.style('fill', 'none')
					.style('stroke', v(k.color))
					.style('stroke-width', '2.5px')
					.style('stroke-dasharray', k.dash ?? 'none')
					.style('stroke-linecap', 'round'),
			]),
		) as unknown as Record<Kind, d3.Selection<SVGPathElement, unknown, null, undefined>>;
		const smoke = root.append('g');
		const wire = root.append('line').style('stroke', v('muted')).style('stroke-width', '1px');
		const puff = root.append('circle').attr('r', 6).style('fill', v('series-2')).style('stroke', v('surface')).style('stroke-width', '2px');
		const labels = root.append('g');

		let t = reducedMotion() ? 11.5 : 0;
		const out = readout(el);

		function draw() {
			// Field at this instant, faint.
			const sel = hedgehog.selectAll<SVGPathElement, P>('path').data(arrows).join('path');
			sel.attr('d', ([px, py]) => {
				const [u, w] = vel([px, py], t);
				const s = 0.28 / Math.hypot(u, w);
				const x0 = x(px - u * s);
				const y0 = y(py - w * s);
				const x1 = x(px + u * s);
				const y1 = y(py + w * s);
				const a = Math.atan2(y1 - y0, x1 - x0);
				return `M${x0},${y0}L${x1},${y1}M${x1},${y1}l${-6 * Math.cos(a - 0.5)},${-6 * Math.sin(a - 0.5)}M${x1},${y1}l${-6 * Math.cos(a + 0.5)},${-6 * Math.sin(a + 0.5)}`;
			})
				.style('stroke', v('dim'))
				.style('stroke-width', '1.5px')
				.style('fill', 'none');

			const line = d3
				.line<P>()
				.x((p) => x(p[0]))
				.y((p) => y(p[1]));
			const ends: { kind: Kind; p: P }[] = [];
			const inside = (p: P) => p[0] >= X[0] && p[0] <= X[1] && p[1] >= Y[0] && p[1] <= Y[1];

			// Streamline: freeze the flow at time t and follow it from the chimney.
			const sl: P[] = [CHIMNEY];
			let q = CHIMNEY;
			for (let i = 0; i < 2000 && inside(q); i++) sl.push((q = rk4(q, t, DT, true)));
			layers.stream.attr('d', line(sl));
			ends.push({ kind: 'stream', p: sl[sl.length - 1] });

			// Pathline: one puff, released at the last release time.
			const tr = Math.floor(t / RELEASE_EVERY) * RELEASE_EVERY;
			const pl: P[] = [];
			const pp = advect(CHIMNEY, tr, t, pl);
			layers.path.attr('d', line(pl));
			puff.attr('cx', x(pp[0])).attr('cy', y(pp[1]));
			ends.push({ kind: 'path', p: pp });

			// Streakline: where every puff released since the start is now.
			const sk: P[] = [];
			for (let r = t; r >= Math.max(0, t - 12); r -= 0.1) {
				const p = advect(CHIMNEY, r, t);
				if (!inside(p)) break;
				sk.push(p);
			}
			layers.streak.attr('d', sk.length > 1 ? line(sk) : null);
			smoke
				.selectAll('circle')
				.data(show.streak ? sk.filter((_, i) => i % 3 === 0) : [])
				.join('circle')
				.attr('cx', (p) => x(p[0]))
				.attr('cy', (p) => y(p[1]))
				.attr('r', 4)
				.style('fill', v('series-3'))
				.style('fill-opacity', 0.35);
			if (sk.length > 1) ends.push({ kind: 'streak', p: sk[sk.length - 1] });

			// Timeline: bubbles released together along a wire at x = 1.5.
			const wy = d3.range(-0.8, 2.01, 0.1);
			const tl = wy.map((yy) => advect([1.5, yy], tr, t));
			wire.attr('x1', x(1.5)).attr('x2', x(1.5)).attr('y1', y(-0.8)).attr('y2', y(2)).style('display', show.time ? '' : 'none');
			layers.time.attr('d', line(tl));
			ends.push({ kind: 'time', p: tl[tl.length - 1] });

			for (const k of KINDS) layers[k.key].style('display', show[k.key] ? '' : 'none');
			puff.style('display', show.path ? '' : 'none');

			// Direct labels at the line ends, nudged apart so they don't collide.
			const lab = ends
				.filter((e) => show[e.kind])
				.map((e) => ({
					kind: e.kind,
					x: Math.min(W - 6, Math.max(6, x(e.p[0]))),
					y: Math.min(H - 8, Math.max(narrow ? 14 : 36, y(e.p[1]) - 10)),
				}))
				.sort((a, b) => a.y - b.y);
			for (let i = 1; i < lab.length; i++)
				if (Math.abs(lab[i].x - lab[i - 1].x) < 110 && lab[i].y - lab[i - 1].y < 18) lab[i].y = lab[i - 1].y + 18;
			labels
				.selectAll('text')
				.data(lab, (d) => (d as { kind: string }).kind)
				.join('text')
				.attr('x', (d) => d.x)
				.attr('y', (d) => d.y)
				.attr('text-anchor', (d) => (d.x > W - 120 ? 'end' : 'start'))
				.attr('dx', (d) => (d.x > W - 120 ? -8 : 8))
				.style('fill', v('ink'))
				.style('font-size', '13px')
				.style('font-weight', 700)
				.style('paint-order', 'stroke')
				.style('stroke', v('surface'))
				.style('stroke-width', '3px')
				.text((d) => KINDS.find((k) => k.key === d.kind)!.label);

			const [u, w] = vel(CHIMNEY, t);
			const deg = Math.round((Math.atan2(w, u) * 180) / Math.PI);
			// Only announce when paused, so screen readers aren't flooded during playback.
			if (!playing) out.textContent = `t = ${t.toFixed(1)} s. At the chimney the wind points ${Math.abs(deg)}° ${deg >= 0 ? 'upwards' : 'downwards'}. The puff and the bubbles left at t = ${tr} s.`;
			timeInput.value = String(Math.round(t * 10) / 10);
			timeInput.parentElement!.querySelector('output')!.textContent = `${t.toFixed(1)} s`;
		}

		let playing = false;
		let frame = 0;
		let last = 0;
		const tick = (now: number) => {
			if (!playing) return;
			if (last) t = (t + (now - last) / 1000) % T_MAX;
			last = now;
			draw();
			frame = requestAnimationFrame(tick);
		};
		const playBtn = button(row, 'Play', () => {
			playing = !playing;
			playBtn.textContent = playing ? 'Pause' : 'Play';
			last = 0;
			if (playing) {
				out.textContent = 'Playing. Pause to read the wind direction and release time.';
				frame = requestAnimationFrame(tick);
			}
			else {
				cancelAnimationFrame(frame);
				draw();
			}
		});
		const timeInput = slider(row, 'Time', { min: 0, max: T_MAX - 0.1, step: 0.1, value: t, format: (n) => `${n.toFixed(1)} s` }, (n) => {
			t = n;
			draw();
		});
		const row2 = controls(el);
		row2.style.marginTop = '8px';
		// Wide SVGs sit inside a .viz-scroll wrapper, so insert before that.
		const chart = root.node()!.closest('.viz-scroll') ?? root.node()!;
		el.insertBefore(row2, chart);
		for (const k of KINDS) {
			const b = toggle(
				row2,
				k.label,
				(on) => {
					show[k.key] = on;
					draw();
				},
				true,
			);
			// The button doubles as the legend: a swatch of the line style.
			const sw = d3
				.select(b)
				.insert('svg', ':first-child')
				.attr('width', 26)
				.attr('height', 10)
				.attr('aria-hidden', 'true')
				.style('margin-left', '6px')
				.style('display', 'inline-block')
				.style('vertical-align', 'middle');
			sw.append('line')
				.attr('x1', 1)
				.attr('x2', 25)
				.attr('y1', 5)
				.attr('y2', 5)
				.style('stroke', v(k.color))
				.style('stroke-width', '2.5px')
				.style('stroke-dasharray', k.dash ?? 'none');
		}

		draw();
		if (!reducedMotion()) playBtn.click();
		dataTable(
			el,
			[
				{ label: 'Line', value: (k) => k.label },
				{ label: 'What it connects', value: (k) => DESCR[k.key] },
				{ label: 'Drawn as', value: (k) => (k.dash ? `${k.label === 'Streakline' ? 'dotted, with smoke' : 'dashed'}` : 'solid') },
			],
			[...KINDS],
			'Show what each line is',
		);
		return () => {
			playing = false;
			cancelAnimationFrame(frame);
		};
	},
};

const DESCR: Record<Kind, string> = {
	stream: 'Follows the arrows of the flow frozen at this instant',
	path: 'The route one puff has taken since it left the chimney',
	streak: 'Every puff that has passed through the chimney, where it is now',
	time: 'Bubbles released together along the wire, where they are now',
};

export default figure;
