import * as d3 from 'd3';
import { button, controls, dataTable, gridY, readout, select, styleAxis, svg, v, type Figure } from './lib';
import raw from './data/18-2-gistemp.json';

// [year, global temperature anomaly in °C against the 1951-1980 average]
const DATA = (raw as [number, number][]).map(([year, t]) => ({ year, t }));

const LOW_HZ = 220;
const HIGH_HZ = 880;
const GAIN = 0.06; // quiet on purpose

const figure: Figure = {
	title: 'Hearing a chart',
	caption:
		'Global temperature since 1880, drawn as a line and played as a tone. Higher temperature means higher pitch, so the last few decades climb audibly. Nothing plays on its own.',
	credit:
		'Data: NASA GISS Surface Temperature Analysis (GISTEMP v4), annual global means against 1951–1980, public domain. Idea after Loud Numbers.',
	mount(el) {
		const note = document.createElement('p');
		note.style.cssText = 'margin: 0 0 8px; font-size: 14px; color: var(--viz-muted);';
		note.innerHTML =
			'Sound plays only when you press Play: a soft sine tone lasting about nine seconds, with a Stop button. You may want to check your volume first. Inspired by Loud Numbers’ sonification of the July 2022 UK heatwave, <a href="https://www.ableton.com/en/blog/sound-the-alarm-data-sonification-as-a-tool-for-climate-action/">described here</a>.';
		el.append(note);
		const row = controls(el);

		const W = 680;
		const H = 300;
		const m = { top: 16, right: 20, bottom: 32, left: 52 };
		const iw = W - m.left - m.right;
		const ih = H - m.top - m.bottom;
		const root = svg(
			el,
			W,
			H,
			'Line chart of global temperature anomaly from 1880 to 2025. It hovers around minus 0.2 degrees until about 1940, stays flat until the 1970s, then rises steadily to about 1.2 to 1.3 degrees above the 1951 to 1980 average.',
		);
		const g = root.append('g').attr('transform', `translate(${m.left},${m.top})`);
		const x = d3.scaleLinear().domain(d3.extent(DATA, (d) => d.year) as [number, number]).range([0, iw]);
		const tExt = d3.extent(DATA, (d) => d.t) as [number, number];
		const y = d3.scaleLinear().domain(tExt).nice().range([ih, 0]);
		gridY(g.append('g'), y, iw);
		g.append('line').attr('x2', iw).attr('y1', y(0)).attr('y2', y(0)).style('stroke', v('axis')).style('stroke-width', 1.5);
		styleAxis(g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).ticks(8).tickFormat(d3.format('d'))));
		styleAxis(g.append('g').call(d3.axisLeft(y).ticks(5).tickFormat((d) => `${d3.format('+.1f')(d as number)} °C`)));
		g.append('path')
			.datum(DATA)
			.attr(
				'd',
				d3
					.line<(typeof DATA)[number]>()
					.x((d) => x(d.year))
					.y((d) => y(d.t)),
			)
			.style('fill', 'none')
			.style('stroke', v('series-1'))
			.style('stroke-width', 2);
		const cursor = g.append('g').style('display', 'none');
		cursor.append('line').attr('y1', 0).attr('y2', ih).style('stroke', v('muted')).style('stroke-dasharray', '3 3');
		const dot = cursor.append('circle').attr('r', 5).style('fill', v('highlight'));
		const label = cursor
			.append('text')
			.attr('y', 12)
			.style('fill', v('ink'))
			.style('font-size', '13px');
		const out = readout(el);

		// Pitch is perceived on a log scale, so map value to frequency exponentially.
		const hz = d3.scaleLog().domain([LOW_HZ, HIGH_HZ]).range([0, 1]).invert;
		const pitch = (t: number) => hz((t - tExt[0]) / (tExt[1] - tExt[0]));

		let ctx: AudioContext | null = null;
		let osc: OscillatorNode | null = null;
		let amp: GainNode | null = null;
		let raf = 0;
		let step = 0.06;

		function stop() {
			cancelAnimationFrame(raf);
			if (ctx && osc && amp) {
				const now = ctx.currentTime;
				amp.gain.cancelScheduledValues(now);
				amp.gain.setTargetAtTime(0, now, 0.02);
				osc.stop(now + 0.15);
			}
			osc = null;
			amp = null;
			cursor.style('display', 'none');
			playBtn.disabled = false;
			stopBtn.disabled = true;
		}

		function play() {
			stop();
			ctx ??= new AudioContext();
			void ctx.resume();
			const t0 = ctx.currentTime + 0.05;
			osc = ctx.createOscillator();
			osc.type = 'sine';
			amp = ctx.createGain();
			amp.gain.setValueAtTime(0, t0);
			amp.gain.linearRampToValueAtTime(GAIN, t0 + 0.08);
			DATA.forEach((d, i) => osc!.frequency.setValueAtTime(pitch(d.t), t0 + i * step));
			const end = t0 + DATA.length * step;
			amp.gain.setValueAtTime(GAIN, end - 0.08);
			amp.gain.linearRampToValueAtTime(0, end);
			osc.connect(amp).connect(ctx.destination);
			osc.start(t0);
			osc.stop(end + 0.05);
			const thisOsc = osc;
			osc.onended = () => {
				if (osc === thisOsc) {
					stop();
					out.textContent = 'Finished. Press Play to hear it again.';
				}
			};
			playBtn.disabled = true;
			stopBtn.disabled = false;
			out.textContent = `Playing ${DATA[0].year} to ${DATA[DATA.length - 1].year}: low pitch is cooler, high pitch is warmer.`;
			cursor.style('display', null);
			const audio = ctx;
			const tick = () => {
				const i = Math.min(DATA.length - 1, Math.max(0, Math.floor((audio.currentTime - t0) / step)));
				const d = DATA[i];
				cursor.attr('transform', `translate(${x(d.year)},0)`);
				dot.attr('cy', y(d.t));
				label
					.attr('x', x(d.year) > iw - 120 ? -8 : 8)
					.attr('text-anchor', x(d.year) > iw - 120 ? 'end' : 'start')
					.text(`${d.year}: ${d3.format('+.2f')(d.t)} °C`);
				raf = requestAnimationFrame(tick);
			};
			raf = requestAnimationFrame(tick);
		}

		const playBtn = button(row, 'Play', play);
		const stopBtn = button(row, 'Stop', () => {
			stop();
			out.textContent = 'Stopped.';
		});
		stopBtn.disabled = true;
		select(
			row,
			'Speed',
			[
				{ value: '0.04', label: 'Fast (6 s)' },
				{ value: '0.06', label: 'Normal (9 s)' },
				{ value: '0.1', label: 'Slow (15 s)' },
			],
			(s) => {
				step = Number(s);
			},
			'0.06',
		);

		dataTable(
			el,
			[
				{ label: 'Year', value: (d) => String(d.year) },
				{ label: 'Anomaly (°C)', value: (d) => d3.format('+.2f')(d.t), numeric: true },
				{ label: 'Tone (Hz)', value: (d) => Math.round(pitch(d.t)), numeric: true },
			],
			DATA,
		);

		return () => {
			stop();
			void ctx?.close();
		};
	},
};

export default figure;
