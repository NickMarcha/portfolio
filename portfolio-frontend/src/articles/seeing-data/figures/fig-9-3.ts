import * as d3 from 'd3';
import { controls, dataTable, readout, slider, svg, v, type Figure } from './lib';

// Made-up GPS tracks: x and y on a small street map (0-1), t in minutes after 20:00.
type P = [number, number, number];
const SCENE: P = [0.6, 0.4, 33];
const TAXIS: { name: string; color: string; path: P[] }[] = [
	{
		name: 'Taxi 1',
		color: v('series-1'),
		path: [
			[0.1, 0.4, 0],
			[0.6, 0.4, 12],
			[0.9, 0.4, 18],
			[0.9, 0.8, 26],
			[0.9, 0.8, 48],
			[0.5, 0.8, 60],
		],
	},
	{
		name: 'Taxi 2',
		color: v('series-2'),
		path: [
			[0.2, 0.9, 0],
			[0.2, 0.9, 18],
			[0.2, 0.6, 26],
			[0.4, 0.6, 34],
			[0.4, 0.1, 46],
			[0.8, 0.1, 60],
		],
	},
	{
		name: 'Taxi 3',
		color: v('series-3'),
		path: [
			[0.9, 0.1, 0],
			[0.6, 0.1, 10],
			[0.6, 0.1, 26],
			[0.6, 0.4, 33],
			[0.1, 0.4, 39],
			[0.1, 0.4, 60],
		],
	},
	{
		name: 'Taxi 4',
		color: v('series-4'),
		path: [
			[0.8, 0.65, 0],
			[0.8, 0.65, 50],
			[0.8, 0.95, 60],
		],
	},
];
const clock = (t: number) => `20:${String(Math.round(t)).padStart(2, '0')}`;

const figure: Figure = {
	title: 'A space-time cube',
	caption:
		'A map on the floor and time running up, here one hour from 20:00 to 21:00. Each made-up taxi track becomes a line climbing through the cube. A vertical stretch is a taxi standing still; a nearly flat one is a taxi moving fast. The red point is a crossing at 20:33.',
	credit: 'Synthetic tracks. Space-time cube after Hägerstrand 1970; taxi example after Kapler and Wright 2004.',
	mount(el) {
		const W = 680;
		const H = 500;
		const S = 270; // floor side in px
		const Z = 260; // cube height in px
		const cx = W / 2;
		const cy = 360;

		const row = controls(el);
		const root = svg(el, W, H, '');
		const floorG = root.append('g');
		const shadowG = root.append('g');
		const cubeG = root.append('g');
		const tracksG = root.append('g');
		const labelG = root.append('g');
		const out = readout(el);

		let yaw = 35;
		let tilt = 28;

		function proj([x, y, t]: P): [number, number] {
			const a = (yaw * Math.PI) / 180;
			const e = (tilt * Math.PI) / 180;
			const X = x - 0.5;
			const Y = y - 0.5;
			const rx = X * Math.cos(a) - Y * Math.sin(a);
			const ry = X * Math.sin(a) + Y * Math.cos(a);
			return [cx + rx * S, cy + ry * S * Math.sin(e) - (t / 60) * Z * Math.cos(e)];
		}
		const line = (pts: P[]) => d3.line()(pts.map(proj))!;

		function draw() {
			// Floor and street grid
			floorG.selectAll('*').remove();
			floorG.append('path').attr('d', line([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 0]]) + 'Z').style('fill', v('grid'));
			for (const k of [0.1, 0.4, 0.6, 0.8, 0.9]) {
				for (const seg of [
					[[k, 0, 0], [k, 1, 0]],
					[[0, k, 0], [1, k, 0]],
				] as P[][])
					floorG.append('path').attr('d', line(seg)).style('stroke', v('surface')).style('stroke-width', '3px');
			}

			// Footprints of each track on the floor
			shadowG
				.selectAll('path')
				.data(TAXIS)
				.join('path')
				.attr('d', (d) => line(d.path.map(([x, y]) => [x, y, 0] as P)))
				.style('fill', 'none')
				.style('stroke', v('dim'))
				.style('stroke-width', '2px')
				.style('stroke-dasharray', '4 3');

			// Cube edges, the scene's vertical, and the time axis on the left-most corner
			cubeG.selectAll('*').remove();
			const corners: [number, number][] = [
				[0, 0],
				[1, 0],
				[1, 1],
				[0, 1],
			];
			for (const [x, y] of corners)
				cubeG.append('path').attr('d', line([[x, y, 0], [x, y, 60]])).style('stroke', v('axis'));
			cubeG
				.append('path')
				.attr('d', line([...corners.map(([x, y]) => [x, y, 60] as P), [0, 0, 60]]))
				.style('fill', 'none')
				.style('stroke', v('axis'));
			cubeG
				.append('path')
				.attr('d', line([[SCENE[0], SCENE[1], 0], [SCENE[0], SCENE[1], 60]]))
				.style('stroke', v('highlight'))
				.style('stroke-dasharray', '2 4');
			const left = corners.reduce((m, c) => (proj([c[0], c[1], 0])[0] < proj([m[0], m[1], 0])[0] ? c : m));
			for (const t of [0, 15, 30, 45, 60]) {
				const [sx, sy] = proj([left[0], left[1], t]);
				cubeG.append('line').attr('x1', sx - 5).attr('x2', sx).attr('y1', sy).attr('y2', sy).style('stroke', v('axis'));
				cubeG
					.append('text')
					.attr('x', sx - 8)
					.attr('y', sy)
					.attr('dy', '0.35em')
					.attr('text-anchor', 'end')
					.style('font-size', '12px')
					.style('fill', v('muted'))
					.text(t === 60 ? '21:00' : clock(t));
			}
			const top = proj([left[0], left[1], 60]);
			cubeG
				.append('text')
				.attr('x', top[0] - 8)
				.attr('y', top[1] - 18)
				.attr('text-anchor', 'end')
				.style('font-size', '12px')
				.style('fill', v('muted'))
				.text('Time runs up');

			tracksG
				.selectAll('path')
				.data(TAXIS)
				.join('path')
				.attr('d', (d) => line(d.path))
				.style('fill', 'none')
				.style('stroke', (d) => d.color)
				.style('stroke-width', '2.5px')
				.style('stroke-linejoin', 'round');
			const [sx, sy] = proj(SCENE);
			tracksG.selectAll('circle').data([0]).join('circle').attr('r', 6).attr('cx', sx).attr('cy', sy).style('fill', v('highlight')).style('stroke', v('surface')).style('stroke-width', '2px');

			labelG
				.selectAll('text')
				.data(TAXIS)
				.join('text')
				.attr('x', (d) => proj(d.path[d.path.length - 1])[0] + 6)
				.attr('y', (d) => proj(d.path[d.path.length - 1])[1] - 6)
				.style('font-size', '13px')
				.style('fill', v('ink'))
				.style('paint-order', 'stroke')
				.style('stroke', v('surface'))
				.style('stroke-width', '3px')
				.text((d) => d.name);

			root.attr(
				'aria-label',
				`Space-time cube seen from ${yaw} degrees, with four taxi tracks climbing from 20:00 at the floor to 21:00 at the top.`,
			);
		}

		slider(row, 'Rotate', { min: 0, max: 355, step: 5, value: yaw, format: (n) => `${n}°` }, (n) => {
			yaw = n;
			draw();
		});
		slider(row, 'Tilt', { min: 5, max: 60, step: 1, value: tilt, format: (n) => `${n}°` }, (n) => {
			tilt = n;
			draw();
		});
		draw();
		out.textContent =
			'Taxi 1 crossed the red point’s spot at 20:12, too early. Taxi 2 was a block away at 20:33. Taxi 4 stood still almost the whole hour, a vertical line. Only Taxi 3’s line passes through the point: it waited, drove to the crossing at 20:33, then left fast, which is the nearly flat stretch.';

		const rows = TAXIS.flatMap((d) => d.path.map(([x, y, t]) => ({ name: d.name, x, y, t })));
		dataTable(
			el,
			[
				{ label: 'Taxi', value: (r: (typeof rows)[number]) => r.name },
				{ label: 'Time', value: (r) => (r.t === 60 ? '21:00' : clock(r.t)) },
				{ label: 'Map x (0-1)', value: (r) => r.x, numeric: true },
				{ label: 'Map y (0-1)', value: (r) => r.y, numeric: true },
			],
			rows,
		);
	},
};

export default figure;
