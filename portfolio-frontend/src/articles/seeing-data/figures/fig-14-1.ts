import * as d3 from 'd3';
import { controls, dataTable, readout, slider, svg, v, type Figure } from './lib';

type P = [number, number];
// Circular flow: every point moves round the center at the same angular speed.
const vel = ([x, y]: P): P => [-y, x];
const add = (p: P, q: P, s: number): P => [p[0] + s * q[0], p[1] + s * q[1]];

const METHODS = [
	{
		name: 'Euler',
		evals: 1,
		step: (p: P, h: number): P => add(p, vel(p), h),
	},
	{
		name: 'Runge-Kutta 2',
		evals: 2,
		step: (p: P, h: number): P => add(p, vel(add(p, vel(p), h / 2)), h),
	},
	{
		name: 'Runge-Kutta 4',
		evals: 4,
		step: (p: P, h: number): P => {
			const k1 = vel(p);
			const k2 = vel(add(p, k1, h / 2));
			const k3 = vel(add(p, k2, h / 2));
			const k4 = vel(add(p, k3, h));
			return [p[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), p[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])];
		},
	},
];

const figure: Figure = {
	title: 'Three ways to take a step',
	caption:
		'Starting at the dot, each method follows a flow that goes round in circles, for exactly one turn. Euler overshoots on every step and spirals outwards; Runge-Kutta 2 and 4 stay close to the circle. With bigger steps, Runge-Kutta 2 starts drifting too, while Runge-Kutta 4 holds out longest.',
	mount(el) {
		const row = controls(el);
		const W = 680;
		const S = 212;
		const gap = (W - 3 * S) / 2;
		const H = S + 34;
		const root = svg(el, W, H, 'Three panels showing one turn of a circular flow traced by Euler, Runge-Kutta 2 and Runge-Kutta 4.');
		const R = 2.5;
		const sc = d3.scaleLinear().domain([-R, R]).range([0, S]);
		const out = readout(el);

		const panels = METHODS.map((m, k) => {
			const g = root.append('g').attr('transform', `translate(${k * (S + gap)},30)`);
			g.append('text')
				.attr('x', S / 2)
				.attr('y', -10)
				.attr('text-anchor', 'middle')
				.style('fill', v('ink'))
				.style('font-size', '15px')
				.style('font-weight', 700)
				.text(m.name);
			const id = `f14-1-clip-${k}`;
			g.append('clipPath').attr('id', id).append('rect').attr('width', S).attr('height', S);
			g.append('rect').attr('width', S).attr('height', S).style('fill', 'none').style('stroke', v('axis'));
			// Hedgehog of the flow, faint, for context.
			const arrows = g.append('g');
			for (let i = -2; i <= 2; i++)
				for (let j = -2; j <= 2; j++) {
					if (!i && !j) continue;
					const [vx, vy] = vel([i, j]);
					const len = Math.hypot(vx, vy);
					const L = 0.32;
					const x0 = sc(i - (vx / len) * L);
					const y0 = sc(-(j - (vy / len) * L));
					const x1 = sc(i + (vx / len) * L);
					const y1 = sc(-(j + (vy / len) * L));
					arrows.append('line').attr('x1', x0).attr('y1', y0).attr('x2', x1).attr('y2', y1).style('stroke', v('dim')).style('stroke-width', '1.5px');
					const a = Math.atan2(y1 - y0, x1 - x0);
					arrows
						.append('path')
						.attr('d', `M${x1},${y1} l${-6 * Math.cos(a - 0.5)},${-6 * Math.sin(a - 0.5)} M${x1},${y1} l${-6 * Math.cos(a + 0.5)},${-6 * Math.sin(a + 0.5)}`)
						.style('stroke', v('dim'))
						.style('stroke-width', '1.5px')
						.style('fill', 'none');
				}
			// The true path: the unit circle.
			g.append('circle')
				.attr('cx', sc(0))
				.attr('cy', sc(0))
				.attr('r', sc(1) - sc(0))
				.style('fill', 'none')
				.style('stroke', v('muted'))
				.style('stroke-dasharray', '4 4');
			const clip = g.append('g').attr('clip-path', `url(#${id})`);
			const path = clip.append('path').style('fill', 'none').style('stroke', v('series-1')).style('stroke-width', '2px');
			const dots = clip.append('g');
			g.append('circle').attr('cx', sc(1)).attr('cy', sc(0)).attr('r', 5).style('fill', v('ink'));
			return { path, dots };
		});

		let h = 0.3;
		let rows: { name: string; evals: number; steps: number; radius: number }[] = [];

		function draw() {
			const n = Math.ceil((2 * Math.PI) / h);
			const hh = (2 * Math.PI) / n; // so that exactly one turn is traced
			rows = METHODS.map((m, k) => {
				const pts: P[] = [[1, 0]];
				for (let i = 0; i < n; i++) pts.push(m.step(pts[i], hh));
				const xy = pts.map(([x, y]) => [sc(x), sc(-y)] as [number, number]);
				panels[k].path.attr('d', d3.line()(xy));
				panels[k].dots
					.selectAll('circle')
					.data(xy)
					.join('circle')
					.attr('cx', (p) => p[0])
					.attr('cy', (p) => p[1])
					.attr('r', 3)
					.style('fill', v('series-1'));
				const last = pts[pts.length - 1];
				return { name: m.name, evals: m.evals, steps: n, radius: Math.hypot(last[0], last[1]) };
			});
			const f = d3.format('.3f');
			out.textContent = `${n} steps of ${hh.toFixed(2)} for one turn. The true path ends back on the circle at distance 1 from the center. Euler ends at ${f(rows[0].radius)}, Runge-Kutta 2 at ${f(rows[1].radius)}, Runge-Kutta 4 at ${f(rows[2].radius)}.`;
			dataTable(
				el,
				[
					{ label: 'Method', value: (r) => r.name },
					{ label: 'Velocity look-ups per step', value: (r) => r.evals, numeric: true },
					{ label: 'Steps', value: (r) => r.steps, numeric: true },
					{ label: 'Distance from center after one turn (true: 1)', value: (r) => f(r.radius), numeric: true },
				],
				rows,
			);
		}
		slider(row, 'Step size', { min: 0.05, max: 1, step: 0.05, value: h, format: (n) => n.toFixed(2) }, (n) => {
			h = n;
			draw();
		});
		draw();
	},
};

export default figure;
