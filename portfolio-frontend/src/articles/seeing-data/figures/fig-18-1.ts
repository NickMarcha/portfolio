import * as d3 from 'd3';
import { SERIES, controls, dataTable, isNarrow, onThemeChange, readout, select, styleAxis, svg, token, tooltip, v, type Figure } from './lib';

// Penguins per species in the Palmer Penguins data (Horst, Hill and Gorman 2020, CC0).
const DATA = [
	{ species: 'Adelie', n: 152 },
	{ species: 'Chinstrap', n: 68 },
	{ species: 'Gentoo', n: 124 },
];

type Mode = 'bad' | 'good';

// WCAG relative luminance contrast between two colors.
function contrast(a: string, b: string) {
	const lum = (c: string) => {
		const { r, g, b: bl } = d3.rgb(c);
		const f = (x: number) => {
			const s = x / 255;
			return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
		};
		return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
	};
	const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

const figure: Figure = {
	title: 'The same chart, inaccessible and accessible',
	caption:
		'Two versions of one bar chart. The first only works for someone with good eyesight and a mouse. The second passes the same checks with a title, a summary, strong contrast, labels on the bars, keyboard focus and a data table.',
	credit: 'Data: Palmer Penguins (Horst, Hill and Gorman 2020), CC0. Checks from WCAG and Chartability (Elavsky, Bennett and Moritz 2022).',
	mount(el) {
		const row = controls(el);
		const title = document.createElement('p');
		title.style.cssText = 'margin: 0 0 2px; font-weight: 700; font-size: 16px;';
		const summary = document.createElement('p');
		summary.style.cssText = 'margin: 0 0 8px; font-size: 14px;';
		el.append(title, summary);

		// Phone: full width, the legend moves above the bars.
		const narrow = isNarrow(el);
		const W = narrow ? el.clientWidth : 560;
		const H = 280;
		const m = narrow ? { top: 44, right: 8, bottom: 34, left: 40 } : { top: 28, right: 130, bottom: 34, left: 48 };
		const iw = W - m.left - m.right;
		const ih = H - m.top - m.bottom;
		const root = svg(el, W, H, '');
		const g = root.append('g').attr('transform', `translate(${m.left},${m.top})`);
		const x = d3.scaleBand().domain(DATA.map((d) => d.species)).range([0, iw]).padding(0.3);
		const y = d3.scaleLinear().domain([0, 160]).range([ih, 0]);
		const xAxis = g.append('g').attr('transform', `translate(0,${ih})`);
		const yAxis = g.append('g');
		const bars = g
			.selectAll('rect')
			.data(DATA)
			.join('rect')
			.attr('x', (d) => x(d.species)!)
			.attr('width', x.bandwidth())
			.attr('y', (d) => y(d.n))
			.attr('height', (d) => ih - y(d.n));
		const values = g
			.selectAll('text.val')
			.data(DATA)
			.join('text')
			.attr('class', 'val')
			.attr('x', (d) => x(d.species)! + x.bandwidth() / 2)
			.attr('y', (d) => y(d.n) - 6)
			.attr('text-anchor', 'middle')
			.style('fill', v('ink'))
			.style('font-size', '14px')
			.text((d) => d.n);
		const legend = g.append('g').attr('transform', narrow ? `translate(${4 - m.left},-38)` : `translate(${iw + 20},0)`);
		const legendItems = legend
			.selectAll('g')
			.data(DATA)
			.join('g')
			.attr('transform', (_, i) => (narrow ? `translate(${i * Math.min(84, (W - 8) / 3)},0)` : `translate(0,${i * 20})`));
		const legendSw = legendItems.append('rect').attr('width', 12).attr('height', 12);
		legendItems
			.append('text')
			.attr('x', 18)
			.attr('y', 10)
			.style('font-size', '12px')
			.text((d) => d.species);

		const tip = tooltip(el);
		const focusOut = readout(el);
		const checks = document.createElement('ul');
		checks.style.cssText = 'margin: 10px 0 0; padding-left: 0; list-style: none; font-size: 14px; display: grid; gap: 4px;';
		el.append(checks);
		const table = dataTable(
			el,
			[
				{ label: 'Species', value: (d) => d.species },
				{ label: 'Penguins', value: (d) => d.n, numeric: true },
			],
			DATA,
		);

		let mode: Mode = 'bad';
		// Pale, hue-only bars for the bad version: each species tinted a different color.
		const pale = (i: number) => d3.interpolateRgb(token('surface'), token(`series-${i + 1}`))(0.22);

		function draw() {
			const bad = mode === 'bad';
			title.textContent = bad ? '' : 'Adelie is the most common species in the Palmer Penguins data';
			title.hidden = bad;
			summary.textContent = bad ? '' : '152 Adelie, 124 Gentoo and 68 Chinstrap penguins, 344 in total.';
			summary.hidden = bad;
			root.attr('aria-label', bad ? null : 'Bar chart: Adelie 152, Chinstrap 68, Gentoo 124 penguins.');
			root.attr('role', bad ? null : 'img');
			bars.style('fill', (_, i) => (bad ? pale(i) : SERIES[0]));
			legendSw.style('fill', (_, i) => pale(i));
			legend.style('display', bad ? '' : 'none');
			legendItems.selectAll('text').style('fill', pale(0));
			values.style('display', bad ? 'none' : '');
			styleAxis(xAxis.call(d3.axisBottom(x).tickSize(0).tickFormat((d) => (bad ? '' : d))));
			xAxis.selectAll('.tick text').style('fill', v('ink')).style('font-size', '14px').attr('dy', '1.2em');
			styleAxis(yAxis.call(d3.axisLeft(y).ticks(4)));
			if (bad) yAxis.selectAll('.tick text').style('fill', pale(0));
			bars.attr('tabindex', bad ? null : 0)
				.attr('role', bad ? null : 'img')
				.attr('aria-label', (d) => (bad ? null : `${d.species}: ${d.n} penguins`))
				.style('outline', 'none');
			table.hidden = bad;
			focusOut.textContent = bad ? '' : 'Tab to a bar to hear or read its value.';

			const surface = token('surface');
			const barC = contrast(bad ? pale(0) : token('series-1'), surface);
			const items: [string, boolean, string][] = [
				['Perceivable', !bad, `Bars against background: ${barC.toFixed(1)} to 1 (WCAG asks at least 3 to 1 for graphics). ${bad ? 'Species told apart by hue alone.' : 'Species named under each bar.'}`],
				['Operable', !bad, bad ? 'Values only appear on mouse hover.' : 'Every bar can be reached with the Tab key.'],
				['Understandable', !bad, bad ? 'No title or summary; the reader must work out the point.' : 'A title states the point and a summary gives the numbers.'],
				['Robust', !bad, bad ? 'No text alternative or table for a screen reader.' : 'A text alternative and a data table that any screen reader can read.'],
			];
			checks.replaceChildren(
				...items.map(([p, ok, text]) => {
					const li = document.createElement('li');
					li.innerHTML = `<strong>${ok ? '✓ Pass' : '✗ Fail'}, ${p}.</strong> `;
					li.append(text);
					return li;
				}),
			);
		}

		bars.on('mousemove', (event, d) => tip.show(`${d.species}: ${d.n}`, event))
			.on('mouseleave', () => tip.hide())
			.on('focus', function (_, d) {
				d3.select(this).style('stroke', v('ink')).style('stroke-width', 3);
				focusOut.textContent = `${d.species}: ${d.n} penguins.`;
			})
			.on('blur', function () {
				d3.select(this).style('stroke', null);
			});

		select<Mode>(
			row,
			'Version',
			[
				{ value: 'bad', label: 'Inaccessible' },
				{ value: 'good', label: 'Accessible' },
			],
			(mm) => {
				mode = mm;
				draw();
			},
			'bad',
		);
		draw();
		return onThemeChange(draw);
	},
};

export default figure;
