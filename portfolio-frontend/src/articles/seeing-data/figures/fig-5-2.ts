import * as d3 from 'd3';
import { button, controls, dataTable, gridY, isNarrow, readout, styleAxis, svg, v, type Figure } from './lib';
import gistemp from './data/5-2-gistemp.json';

// GISTEMP anomalies are relative to 1951-1980. GISS puts the absolute global mean
// for that period at roughly 14 °C, which is 57.2 °F.
const BASE_F = 57.2;
const ROWS = (gistemp.rows as [number, number, number][]).map(([year, c, ci]) => ({
	year,
	anomF: c * 1.8,
	ciF: ci * 1.8,
	c,
	ci,
}));
type Row = (typeof ROWS)[number];
type View = 'zero' | 'anomaly';

const first = ROWS[0];
const last = ROWS[ROWS.length - 1];
const warmest = ROWS.reduce((a, b) => (b.c > a.c ? b : a));
// Signed number with a real minus sign, to match the axis ticks d3 draws elsewhere.
const signed = (n: number, digits: number) => `${n > 0 ? '+' : ''}${n.toFixed(digits).replace('-', '−')}`;

const figure: Figure = {
	title: 'Honest about zero, dishonest about the change',
	caption:
		'The same NASA record of global temperature, 1880 to 2025. Drawn from 0 °F, warming of more than 2 °F is a flat line. As anomalies from the 1951–1980 average, with the 95% uncertainty band, the change and how sure we are of it both show.',
	credit:
		'Data: NASA GISS Surface Temperature Analysis (GISTEMP v4), annual global means and total 95% uncertainty (Lenssen et al. 2019), public domain. Absolute values assume the GISS estimate of about 14 °C (57.2 °F) for 1951–1980. Idea after Correll’s essay “An inconvenient graph”.',
	mount(el) {
		const narrow = isNarrow(el);
		const W = narrow ? el.clientWidth : 640;
		const H = 320;
		const m = narrow ? { top: 20, right: 10, bottom: 36, left: 52 } : { top: 20, right: 20, bottom: 36, left: 56 };
		const iw = W - m.left - m.right;
		const ih = H - m.top - m.bottom;

		const row = controls(el);
		const root = svg(el, W, H, '');
		const g = root.append('g').attr('transform', `translate(${m.left},${m.top})`);
		const grid = g.append('g');
		const yAxis = g.append('g');
		const x = d3.scaleLinear().domain([1880, 2025]).range([0, iw]);
		styleAxis(
			g
				.append('g')
				.attr('transform', `translate(0,${ih})`)
				.call(d3.axisBottom(x).ticks(narrow ? 4 : 7).tickFormat(d3.format('d'))),
		);
		const band = g.append('path').style('fill', v('series-1')).style('fill-opacity', 0.22);
		const zero = g.append('line').attr('x1', 0).attr('x2', iw).style('stroke', v('muted')).style('stroke-dasharray', '4 3');
		const zeroLabel = g
			.append('text')
			.attr('x', 4)
			.style('fill', v('muted'))
			.style('font-size', '12px');
		const line = g.append('path').style('fill', 'none').style('stroke', v('series-1')).style('stroke-width', 2);
		const dot = g.append('circle').attr('r', 4.5).style('fill', v('series-1'));
		const note = g.append('text').attr('text-anchor', 'end').style('fill', v('ink')).style('font-size', '13px');
		const out = readout(el);

		const buttons: HTMLButtonElement[] = [];
		function draw(view: View) {
			buttons.forEach((b, i) => b.setAttribute('aria-pressed', String((i === 0) === (view === 'zero'))));
			if (view === 'zero') {
				const y = d3.scaleLinear().domain([0, 70]).range([ih, 0]);
				const f = (r: Row) => BASE_F + r.anomF;
				gridY(grid, y, iw, 7);
				styleAxis(yAxis.call(d3.axisLeft(y).ticks(7).tickFormat((d) => `${d} °F`)));
				band.attr('d', null);
				zero.style('display', 'none');
				zeroLabel.text('');
				line.attr('d', d3.line<Row>((r) => x(r.year), (r) => y(f(r)))(ROWS));
				dot.attr('cx', x(warmest.year)).attr('cy', y(f(warmest)));
				note.attr('x', x(warmest.year) - 8)
					.attr('y', y(f(warmest)) - 12)
					.text(`${warmest.year}: about ${f(warmest).toFixed(1)} °F`);
				root.attr(
					'aria-label',
					`Global mean temperature in Fahrenheit, 1880 to 2025, on an axis from 0 to 70 °F. The line looks flat, between about ${f(first).toFixed(1)} and ${f(warmest).toFixed(1)} °F.`,
				);
				out.textContent = `From zero, the line runs from about ${(BASE_F + first.anomF).toFixed(1)} °F in 1880 to ${(BASE_F + last.anomF).toFixed(1)} °F in 2025 and looks flat. The lie factor is about 1, yet the picture suggests almost nothing changed.`;
			} else {
				const y = d3.scaleLinear().domain([-1, 2.6]).range([ih, 0]);
				gridY(grid, y, iw, 6);
				styleAxis(yAxis.call(d3.axisLeft(y).ticks(6).tickFormat((d) => `${signed(+d, String(d).split('.')[1]?.length ?? 0)} °F`)));
				band.attr(
					'd',
					d3
						.area<Row>()
						.x((r) => x(r.year))
						.y0((r) => y(r.anomF - r.ciF))
						.y1((r) => y(r.anomF + r.ciF))(ROWS),
				);
				zero.style('display', null).attr('y1', y(0)).attr('y2', y(0));
				zeroLabel.attr('y', y(0) - 6).text('1951–1980 average');
				line.attr('d', d3.line<Row>((r) => x(r.year), (r) => y(r.anomF))(ROWS));
				dot.attr('cx', x(warmest.year)).attr('cy', y(warmest.anomF));
				note.attr('x', x(warmest.year) - 8)
					.attr('y', y(warmest.anomF) - 10)
					.text(`${warmest.year}: +${warmest.anomF.toFixed(1)} °F, warmest on record`);
				root.attr(
					'aria-label',
					`Global temperature anomaly in Fahrenheit relative to 1951 to 1980, 1880 to 2025, with a 95% uncertainty band. It rises from about ${signed(first.anomF, 1)} °F to ${signed(warmest.anomF, 1)} °F in ${warmest.year}.`,
				);
				out.textContent = `As anomalies, the rise is plain: from ${signed(first.anomF, 1)} °F in 1880 to ${signed(warmest.anomF, 1)} °F in ${warmest.year} (+${warmest.c.toFixed(2)} °C). The band is the 95% uncertainty, ±${first.ciF.toFixed(2)} °F in 1880 and ±${last.ciF.toFixed(2)} °F today.`;
			}
		}

		buttons.push(button(row, 'From 0 °F', () => draw('zero')));
		buttons.push(button(row, 'As anomalies', () => draw('anomaly')));
		draw('zero');

		dataTable(
			el,
			[
				{ label: 'Year', value: (r: Row) => String(r.year) },
				{ label: 'Anomaly (°C)', value: (r) => r.c.toFixed(2), numeric: true },
				{ label: '95% uncertainty (± °C)', value: (r) => r.ci.toFixed(3), numeric: true },
				{ label: 'Anomaly (°F)', value: (r) => r.anomF.toFixed(2), numeric: true },
				{ label: 'Estimated absolute (°F)', value: (r) => (BASE_F + r.anomF).toFixed(1), numeric: true },
			],
			ROWS,
		);
	},
};

export default figure;
