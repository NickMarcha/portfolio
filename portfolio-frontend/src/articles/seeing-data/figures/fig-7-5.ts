import * as d3 from 'd3';
import raw from './data/7-5-co2.json';
import { controls, dataTable, gridY, isNarrow, readout, slider, styleAxis, svg, v, type Figure } from './lib';

type Row = { date: Date; ppm: number };
const DATA: Row[] = (raw as [number, number, number][]).map(([y, mo, ppm]) => ({ date: new Date(y, mo - 1, 15), ppm }));
const FIRST = DATA[0].date.getFullYear();
const LAST = DATA[DATA.length - 1].date;
const monthFmt = d3.timeFormat('%b %Y');

const figure: Figure = {
	title: 'Focus plus context',
	caption:
		'Carbon dioxide in the air at Mauna Loa, one value per month since 1958. The thin strip shows the whole record; the window in it picks the stretch the large chart shows. Zoomed in to a few years, you see the yearly cycle as northern plants take up CO₂ each summer; the strip keeps the long climb in view.',
	credit:
		'Data: NOAA Global Monitoring Laboratory and Scripps Institution of Oceanography (C. D. Keeling), Mauna Loa monthly mean CO₂, gml.noaa.gov/ccgg/trends, freely available to the public. Pattern after the classic D3 focus + context example (Bostock).',
	mount(el) {
		const row = controls(el);
		let start = LAST.getFullYear() - 9;
		let span = 10;
		const startIn = slider(row, 'Window starts', { min: FIRST, max: LAST.getFullYear() - 1, value: start }, (n) => {
			start = n;
			fromSliders();
		});
		const spanIn = slider(row, 'Window length', { min: 1, max: LAST.getFullYear() - FIRST + 1, value: span, format: (n) => `${n} yr` }, (n) => {
			span = n;
			fromSliders();
		});
		const setSlider = (input: HTMLInputElement, n: number, text: string) => {
			input.value = String(n);
			input.setAttribute('aria-valuetext', text);
			input.nextElementSibling!.textContent = text;
		};

		const narrow = isNarrow(el);
		const W = narrow ? el.clientWidth : 680;
		const m = narrow ? { top: 30, right: 12, left: 44 } : { top: 30, right: 16, left: 52 };
		const iw = W - m.left - m.right;
		const fh = narrow ? 240 : 270;
		const ch = 56;
		const gap = 52;
		const H = m.top + fh + gap + ch + 30;
		const root = svg(el, W, H, 'Line chart of monthly carbon dioxide at Mauna Loa from 1958, with a large view of a selected window and a small strip of the whole record below.');
		const clipId = `clip-7-5-${Math.random().toString(36).slice(2, 8)}`;
		root.append('clipPath').attr('id', clipId).append('rect').attr('width', iw).attr('height', fh);

		const xAll = d3.scaleTime().domain(d3.extent(DATA, (d) => d.date) as [Date, Date]).range([0, iw]);
		const yAll = d3.scaleLinear().domain(d3.extent(DATA, (d) => d.ppm) as [number, number]).nice().range([ch, 0]);

		// Focus.
		const fg = root.append('g').attr('transform', `translate(${m.left},${m.top})`);
		const grid = fg.append('g');
		const fx = fg.append('g').attr('transform', `translate(0,${fh})`);
		const fy = fg.append('g');
		fg.append('text').attr('x', -m.left + 4).attr('y', -14).style('fill', v('muted')).style('font-size', '13px').text('CO₂, parts per million');
		const fLine = fg.append('path').attr('clip-path', `url(#${clipId})`).style('fill', 'none').style('stroke', v('series-1')).style('stroke-width', 2);
		const fDots = fg.append('g').attr('clip-path', `url(#${clipId})`);

		// Context.
		const cg = root.append('g').attr('transform', `translate(${m.left},${m.top + fh + gap})`);
		cg.append('text').attr('x', 0).attr('y', -8).style('fill', v('muted')).style('font-size', '13px').text('Whole record, 1958 to today');
		cg.append('path')
			.datum(DATA)
			.attr('d', d3.line<Row>().x((d) => xAll(d.date)).y((d) => yAll(d.ppm)))
			.style('fill', 'none')
			.style('stroke', v('muted'))
			.style('stroke-width', 1.25);
		styleAxis(cg.append('g').attr('transform', `translate(0,${ch})`).call(d3.axisBottom(xAll).ticks(d3.timeYear.every(narrow ? 20 : 10))));
		const brush = d3
			.brushX()
			.extent([
				[0, 0],
				[iw, ch],
			])
			.on('brush end', (event: d3.D3BrushEvent<Row>) => {
				if (!event.sourceEvent) return;
				const sel = event.selection as [number, number] | null;
				if (!sel) return fromSliders();
				const [a, b] = sel.map((px) => xAll.invert(px));
				start = a.getFullYear();
				span = Math.max(1, Math.round((+b - +a) / (365.25 * 864e5)));
				setSlider(startIn, start, String(start));
				setSlider(spanIn, span, `${span} yr`);
				drawFocus(a, b);
			});
		const bg = cg.append('g').call(brush);
		bg.select('.selection').style('fill', v('series-1')).style('fill-opacity', 0.15).style('stroke', v('series-1')).style('stroke-width', 1.5);
		bg.selectAll('.handle').style('fill', v('series-1')).style('fill-opacity', 0.5);
		bg.selectAll('rect').attr('aria-hidden', 'true');

		const out = readout(el);

		function drawFocus(a: Date, b: Date) {
			const rows = DATA.filter((d) => d.date >= a && d.date <= b);
			const x = d3.scaleTime().domain([a, b]).range([0, iw]);
			const [lo, hi] = d3.extent(rows.length ? rows : DATA, (d) => d.ppm) as [number, number];
			const y = d3.scaleLinear().domain([lo - 1, hi + 1]).nice().range([fh, 0]);
			gridY(grid, y, iw);
			styleAxis(fx.call(d3.axisBottom(x).ticks(narrow ? 4 : 7)));
			styleAxis(fy.call(d3.axisLeft(y).ticks(narrow ? 5 : 6)));
			fLine.datum(DATA).attr('d', d3.line<Row>().x((d) => x(d.date)).y((d) => y(d.ppm)));
			// Monthly dots only when they are far enough apart to read.
			fDots
				.selectAll('circle')
				.data(rows.length <= 72 ? rows : [])
				.join('circle')
				.attr('cx', (d) => x(d.date))
				.attr('cy', (d) => y(d.ppm))
				.attr('r', 3)
				.style('fill', v('series-1'));
			if (rows.length) {
				const f = rows[0];
				const l = rows[rows.length - 1];
				out.textContent = `Showing ${monthFmt(f.date)} to ${monthFmt(l.date)} (${rows.length} months). CO₂ went from ${f.ppm.toFixed(1)} to ${l.ppm.toFixed(1)} ppm, ranging between ${lo.toFixed(1)} and ${hi.toFixed(1)}.`;
			}
		}

		function fromSliders() {
			const a = new Date(start, 0, 1);
			let b = new Date(start + span, 0, 1);
			if (b > LAST) b = new Date(LAST.getFullYear(), LAST.getMonth() + 1, 1);
			bg.call(brush.move, [xAll(a), Math.min(iw, xAll(b))]);
			drawFocus(a, b);
		}
		fromSliders();

		const years = d3.rollups(
			DATA,
			(rs) => ({ mean: d3.mean(rs, (d) => d.ppm)!, n: rs.length }),
			(d) => d.date.getFullYear(),
		);
		dataTable(
			el,
			[
				{ label: 'Year', value: (r: (typeof years)[number]) => String(r[0]) },
				{ label: 'Mean CO₂ (ppm)', value: (r) => r[1].mean.toFixed(2), numeric: true },
				{ label: 'Months measured', value: (r) => r[1].n, numeric: true },
			],
			years,
			'Show yearly averages',
		);
	},
};

export default figure;
