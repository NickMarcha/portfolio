import * as d3 from 'd3';
import { button, controls, dataTable, gridY, isNarrow, readout, reducedMotion, select, styleAxis, svg, v, type Figure } from './lib';
import raw from './data/1-3-datasaurus.json';

const DATA = raw as unknown as Record<string, [number, number][]>;

const NAMES: Record<string, string> = {
	dino: 'Dinosaur',
	away: 'Away',
	h_lines: 'Horizontal lines',
	v_lines: 'Vertical lines',
	x_shape: 'X shape',
	star: 'Star',
	high_lines: 'High lines',
	dots: 'Dots',
	circle: 'Circle',
	bullseye: 'Bullseye',
	slant_up: 'Slant up',
	slant_down: 'Slant down',
	wide_lines: 'Wide lines',
};
const KEYS = Object.keys(NAMES).filter((k) => DATA[k]);

function stats(pts: [number, number][]) {
	const xs = pts.map((p) => p[0]);
	const ys = pts.map((p) => p[1]);
	const mx = d3.mean(xs)!;
	const my = d3.mean(ys)!;
	const sx = d3.deviation(xs)!;
	const sy = d3.deviation(ys)!;
	const cov = d3.sum(pts, (p) => (p[0] - mx) * (p[1] - my)) / (pts.length - 1);
	return { mx, my, sx, sy, r: cov / (sx * sy) };
}

// Cut (not rounded) to two decimals, as Matejka and Fitzmaurice report them. Rounding
// would flicker by 0.01 between sets, since the annealing only kept each statistic
// inside its two-decimal window.
const cut2 = (n: number) => (Math.trunc(n * 100) / 100).toFixed(2).replace('-', '−');

const figure: Figure = {
	title: 'The Datasaurus Dozen',
	caption:
		'Thirteen datasets of 142 points each. The summary statistics underneath are computed from the points shown and, cut to two decimals as in the original paper, they never change.',
	credit: 'Data: Alberto Cairo; Matejka and Fitzmaurice 2017, via the datasauRus R package (MIT licence).',
	mount(el) {
		const narrow = isNarrow(el);
		const W = narrow ? el.clientWidth : 640;
		const H = narrow ? Math.round(W * 0.9) : 420;
		const m = narrow ? { top: 16, right: 12, bottom: 40, left: 40 } : { top: 16, right: 20, bottom: 40, left: 48 };
		const iw = W - m.left - m.right;
		const ih = H - m.top - m.bottom;
		const x = d3.scaleLinear().domain([0, 110]).range([0, iw]);
		const y = d3.scaleLinear().domain([-5, 105]).range([ih, 0]);

		const row = controls(el);
		const root = svg(el, W, H, 'Scatterplot of the selected Datasaurus dataset.');
		const g = root.append('g').attr('transform', `translate(${m.left},${m.top})`);
		gridY(g.append('g'), y, iw);
		styleAxis(g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).ticks(narrow ? 5 : 10)));
		styleAxis(g.append('g').call(d3.axisLeft(y).ticks(narrow ? 5 : 10)));
		g.append('text').attr('x', iw).attr('y', ih + 34).attr('text-anchor', 'end').style('fill', v('muted')).style('font-size', '12px').text('x');
		g.append('text').attr('x', narrow ? -30 : -36).attr('y', -4).style('fill', v('muted')).style('font-size', '12px').text('y');
		const dots = g
			.append('g')
			.selectAll('circle')
			.data(DATA.dino)
			.join('circle')
			.attr('r', narrow ? 3 : 4)
			.style('fill', v('series-1'))
			.style('fill-opacity', 0.85);

		// Live statistics, one cell per number so screen readers get them as a table too.
		const statRow = document.createElement('div');
		statRow.style.cssText =
			'display: flex; flex-wrap: wrap; gap: 6px 20px; margin-top: 10px; font-size: 14px; font-variant-numeric: tabular-nums;';
		el.append(statRow);
		const cells = ['Mean x', 'Mean y', 'SD x', 'SD y', 'Correlation'].map((label) => {
			const d = document.createElement('div');
			const l = document.createElement('span');
			l.style.color = 'var(--viz-muted)';
			l.textContent = `${label} `;
			const val = document.createElement('strong');
			d.append(l, val);
			statRow.append(d);
			return val;
		});
		const out = readout(el);

		let current = 'dino';
		function show(key: string, animate = true) {
			current = key;
			const pts = DATA[key];
			const sel = dots.data(pts);
			if (animate && !reducedMotion())
				sel.transition().duration(1200).ease(d3.easeCubicInOut).attr('cx', (d) => x(d[0])).attr('cy', (d) => y(d[1]));
			else sel.interrupt().attr('cx', (d) => x(d[0])).attr('cy', (d) => y(d[1]));
			const s = stats(pts);
			[s.mx, s.my, s.sx, s.sy, s.r].forEach((n, i) => (cells[i].textContent = cut2(n)));
			root.attr('aria-label', `Scatterplot of the ${NAMES[key]} dataset, 142 points.`);
			out.textContent = `Showing ${NAMES[key]}.`;
			sel_.value = key;
			dataTable(
				el,
				[
					{ label: 'x', value: (d) => d[0], numeric: true },
					{ label: 'y', value: (d) => d[1], numeric: true },
				],
				pts,
				'Show the data for the selected dataset',
			);
		}

		const sel_ = select(
			row,
			'Dataset',
			KEYS.map((k) => ({ value: k, label: NAMES[k] })),
			(k) => show(k),
			'dino',
		);

		let timer: ReturnType<typeof setInterval> | undefined;
		const play = button(row, 'Play through all', () => {
			if (timer) return stop();
			play.textContent = 'Pause';
			play.setAttribute('aria-pressed', 'true');
			const next = () => show(KEYS[(KEYS.indexOf(current) + 1) % KEYS.length]);
			next();
			timer = setInterval(next, 2600);
		});
		play.setAttribute('aria-pressed', 'false');
		function stop() {
			clearInterval(timer);
			timer = undefined;
			play.textContent = 'Play through all';
			play.setAttribute('aria-pressed', 'false');
		}
		sel_.addEventListener('change', stop);

		show('dino', false);
		return () => {
			clearInterval(timer);
			dots.interrupt();
		};
	},
};

export default figure;
