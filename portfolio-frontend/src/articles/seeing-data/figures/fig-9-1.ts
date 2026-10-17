import * as d3 from 'd3';
import { button, controls, dataTable, gridY, isNarrow, readout, reducedMotion, select, slider, styleAxis, svg, v, type Figure } from './lib';
import data from './data/9-1-hourly-2025.json';

type Mode = 'animate' | 'multiples';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SERIES = data.perDay;

const figure: Figure = {
	title: 'Time as time, or time as space',
	caption:
		'Oslo city bike trips started per hour of the day, averaged over each month of 2025. The animation plays the months one after another. The small multiples put all twelve side by side.',
	credit: 'Data: Oslo Bysykkel, NLOD. Hours in Oslo local time.',
	mount(el) {
		const narrow = isNarrow(el);
		const W = narrow ? el.clientWidth : 680;
		const H = narrow ? 300 : 420;
		// Phones: small multiples in 2 columns, 6 rows.
		const cols = narrow ? 2 : 4;
		const pw = narrow ? (W - 40 - 16) / 2 : 140;
		const ph = narrow ? 70 : 90;
		const multH = narrow ? 26 + 6 * (ph + 42) - 16 : H;
		const max = d3.max(SERIES.flat())!;
		const yMax = Math.ceil(max / 100) * 100;

		const row = controls(el);
		const root = svg(el, W, H, '');
		const stage = root.append('g');
		const out = readout(el);

		let mode: Mode = 'animate';
		let month = 5;
		let timer: d3.Timer | null = null;

		// One small line chart of the 24 hours. Returns a function that redraws it for a month.
		function panel(
			g: d3.Selection<SVGGElement, unknown, null, undefined>,
			w: number,
			h: number,
			opts: { axes: boolean; ticks: number },
		) {
			const x = d3.scaleLinear().domain([0, 23]).range([0, w]);
			const y = d3.scaleLinear().domain([0, yMax]).range([h, 0]);
			gridY(g.append('g'), y, w, opts.ticks);
			if (opts.axes) {
				styleAxis(
					g
						.append('g')
						.attr('transform', `translate(0,${h})`)
						.call(d3.axisBottom(x).tickValues([0, 6, 12, 18, 23]).tickFormat((d) => `${String(d).padStart(2, '0')}:00`)),
				);
				styleAxis(g.append('g').call(d3.axisLeft(y).ticks(opts.ticks)));
			} else {
				g.append('line').attr('x1', 0).attr('x2', w).attr('y1', h).attr('y2', h).style('stroke', v('axis'));
			}
			const area = d3
				.area<number>()
				.x((_, i) => x(i))
				.y0(h)
				.y1((d) => y(d))
				.curve(d3.curveMonotoneX);
			const line = area.lineY1();
			const a = g.append('path').style('fill', v('series-1')).style('fill-opacity', 0.15);
			const l = g.append('path').style('fill', 'none').style('stroke', v('series-1')).style('stroke-width', '2px');
			return (m: number, ms = 0) => {
				a.transition().duration(ms).attr('d', area(SERIES[m]));
				l.transition().duration(ms).attr('d', line(SERIES[m]));
			};
		}

		let monthInput: HTMLInputElement;
		let playBtn: HTMLButtonElement;
		let update: (m: number, ms?: number) => void = () => {};
		let monthLabel: d3.Selection<SVGTextElement, unknown, null, undefined>;

		function setMonth(m: number, ms = 0) {
			month = m;
			update(m, ms);
			monthLabel.text(MONTHS[m]);
			monthInput.value = String(m);
			monthInput.dispatchEvent(new Event('sync'));
		}

		function stop() {
			timer?.stop();
			timer = null;
			if (playBtn) {
				playBtn.textContent = 'Play';
				playBtn.setAttribute('aria-pressed', 'false');
			}
		}

		function play() {
			const step = reducedMotion() ? 1600 : 1300;
			playBtn.textContent = 'Pause';
			playBtn.setAttribute('aria-pressed', 'true');
			timer = d3.interval(() => setMonth((month + 1) % 12, reducedMotion() ? 0 : 700), step);
		}

		function draw() {
			stop();
			stage.selectAll('*').remove();
			if (mode === 'animate') {
				root.attr('viewBox', `0 0 ${W} ${H}`);
				const m = narrow ? { top: 30, right: 18, bottom: 32, left: 42 } : { top: 30, right: 20, bottom: 32, left: 50 };
				const g = stage.append('g').attr('transform', `translate(${m.left},${m.top})`);
				update = panel(g, W - m.left - m.right, H - m.top - m.bottom, { axes: true, ticks: narrow ? 4 : 6 });
				monthLabel = g
					.append('text')
					.attr('x', W - m.left - m.right)
					.attr('y', 0)
					.attr('text-anchor', 'end')
					.style('font-size', '22px')
					.style('font-weight', '700')
					.style('fill', v('ink'));
				g.append('text')
					.attr('y', -14)
					.style('font-size', '12px')
					.style('fill', v('muted'))
					.text('Trips per day, by starting hour');
				setMonth(month);
				root.attr('aria-label', 'Line chart of city bike trips by hour of day, one month at a time.');
				out.textContent =
					'One month at a time. To compare June with July you have to remember what June looked like after it is gone.';
			} else {
				root.attr('viewBox', `0 0 ${W} ${multH}`);
				const left = narrow ? 40 : 44;
				const gx = (W - left - cols * pw) / (cols - 1);
				const gy = 42;
				SERIES.forEach((_, i) => {
					const g = stage
						.append('g')
						.attr('transform', `translate(${left + (i % cols) * (pw + gx)},${26 + Math.floor(i / cols) * (ph + gy)})`);
					panel(g, pw, ph, { axes: false, ticks: 2 })(i);
					g.append('text')
						.attr('y', -8)
						.style('font-size', '13px')
						.style('fill', v('ink'))
						.style('font-weight', '700')
						.text(MONTHS[i]);
					if (i % cols === 0) {
						const y = d3.scaleLinear().domain([0, yMax]).range([ph, 0]);
						styleAxis(g.append('g').call(d3.axisLeft(y).ticks(2).tickSize(3)));
					}
					if (i >= 12 - cols) {
						g.selectAll(null)
							.data([0, 12, 23])
							.join('text')
							.attr('x', (d) => (d / 23) * pw)
							.attr('y', ph + 15)
							.attr('text-anchor', (d) => (d === 0 ? 'start' : d === 23 ? 'end' : 'middle'))
							.style('font-size', '12px')
							.style('fill', v('muted'))
							.text((d) => `${String(d).padStart(2, '0')}:00`);
					}
				});
				root.attr('aria-label', 'Twelve small line charts of city bike trips by hour of day, one per month of 2025.');
				out.textContent =
					'All twelve at once, on the same scale. July stands out: the morning peak drops by about 40 percent from June, while the afternoon peak drops far less. That is the summer holiday, and you can see it without remembering anything.';
			}
			for (const c of [monthInput.closest('label')!, playBtn]) c.style.display = mode === 'animate' ? '' : 'none';
		}

		select<Mode>(
			row,
			'Show as',
			[
				{ value: 'animate', label: 'Animation' },
				{ value: 'multiples', label: 'Small multiples' },
			],
			(val) => {
				mode = val;
				draw();
			},
			'animate',
		);
		playBtn = button(row, 'Play', () => (timer ? stop() : play()));
		playBtn.setAttribute('aria-pressed', 'false');
		monthInput = slider(row, 'Month', { min: 0, max: 11, value: 5, format: (n) => MONTHS[n] }, (n) => {
			stop();
			setMonth(n, reducedMotion() ? 0 : 300);
		});
		// Keep the slider's text readout in step when the animation moves it.
		monthInput.addEventListener('sync', () => {
			const o = monthInput.parentElement!.querySelector('output')!;
			o.textContent = MONTHS[month];
			monthInput.setAttribute('aria-valuetext', MONTHS[month]);
		});
		draw();

		dataTable(
			el,
			[
				{ label: 'Hour', value: (h: number) => `${String(h).padStart(2, '0')}:00` },
				...MONTHS.map((m, i) => ({ label: m.slice(0, 3), value: (h: number) => Math.round(SERIES[i][h]), numeric: true })),
			],
			d3.range(24),
		);
		return stop;
	},
};

export default figure;
