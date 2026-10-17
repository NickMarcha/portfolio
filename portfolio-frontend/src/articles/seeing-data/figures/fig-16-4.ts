import * as d3 from 'd3';
import { controls, dataTable, isNarrow, readout, select, slider, svg, v, type Figure } from './lib';

type Mode = 'one' | 'mixed' | 'same';
interface Arr {
	label: string;
	hit: number;
	total: number;
}

// A person icon centered on 0,0, about 1 unit tall: a head and a rounded body.
const PERSON =
	'M-0.17,-0.33 a0.17,0.17 0 1,0 0.34,0 a0.17,0.17 0 1,0 -0.34,0 Z M-0.25,-0.1 h0.5 q0.08,0 0.08,0.08 v0.47 h-0.66 v-0.47 q0,-0.08 0.08,-0.08 Z';

const figure: Figure = {
	title: 'Icon arrays',
	caption:
		'A risk of 3 in 100, drawn as 100 people with 3 of them marked. When you compare two risks, different totals mislead and the same total lets you count.',
	credit: 'Advice from Franconeri et al. 2021.',
	mount(el) {
		// Phone: full width, and the two arrays of a comparison stack, still equally wide.
		const narrow = isNarrow(el);
		const W = narrow ? el.clientWidth : 680;
		const row = controls(el);
		const root = svg(el, W, 300, 'Icon array.');
		const out = readout(el);
		let mode: Mode = 'one';
		let risk = 3;

		const arrays = (): Arr[] =>
			mode === 'one'
				? [{ label: `${risk} in 100`, hit: risk, total: 100 }]
				: mode === 'mixed'
					? [
							{ label: 'Treatment A: 3 in 100', hit: 3, total: 100 },
							{ label: 'Treatment B: 25 in 1,000', hit: 25, total: 1000 },
						]
					: [
							{ label: 'Treatment A: 30 in 1,000', hit: 30, total: 1000 },
							{ label: 'Treatment B: 25 in 1,000', hit: 25, total: 1000 },
						];

		function drawArray(g: d3.Selection<SVGGElement, unknown, null, undefined>, a: Arr, width: number) {
			const cols = a.total === 100 ? 10 : 40;
			const cell = width / cols;
			g.append('text')
				.attr('x', 0)
				.attr('y', 0)
				.style('fill', v('ink'))
				.style('font-size', '14px')
				.style('font-weight', 700)
				.text(a.label);
			const icons = g.append('g').attr('transform', 'translate(0,12)');
			icons
				.selectAll('path')
				.data(d3.range(a.total))
				.join('path')
				.attr('d', PERSON)
				.attr('transform', (i) => `translate(${(i % cols) * cell + cell / 2},${Math.floor(i / cols) * cell + cell / 2}) scale(${cell * 0.9})`)
				.style('fill', (i) => (i < a.hit ? v('highlight') : v('dim')));
			return 12 + Math.ceil(a.total / cols) * cell;
		}

		function draw() {
			root.selectAll('*').remove();
			const list = arrays();
			let h = 0;
			if (mode === 'one') {
				const aw = Math.min(300, W);
				const g = root.append('g').attr('transform', `translate(${(W - aw) / 2},20)`);
				h = 20 + drawArray(g, list[0], aw);
			} else if (narrow) {
				list.forEach((a) => {
					const g = root.append('g').attr('transform', `translate(0,${h + 20})`);
					h += 20 + drawArray(g, a, W) + 16;
				});
			} else {
				// Side by side, each array as wide as the other: icon size then follows the total.
				const each = (W - 30) / 2;
				list.forEach((a, i) => {
					const g = root.append('g').attr('transform', `translate(${i * (each + 30)},20)`);
					h = Math.max(h, 20 + drawArray(g, a, each));
				});
			}
			root.attr('viewBox', `0 0 ${W} ${h + 4}`).attr(
				'aria-label',
				`Icon array${list.length > 1 ? 's' : ''}: ${list.map((a) => `${a.hit} of ${a.total} people marked`).join('; ')}.`,
			);
			const pct = (a: Arr) => d3.format('.1~%')(a.hit / a.total);
			out.textContent =
				mode === 'one'
					? `${risk} out of 100 people, or ${risk}%.`
					: mode === 'mixed'
						? `B shows far more marked people, but its risk is lower: ${pct(list[0])} against ${pct(list[1])}. Different totals turn a comparison of rates into a comparison of counts.`
						: `Same total, so the counts compare directly: ${pct(list[0])} against ${pct(list[1])}. A carries the higher risk, and the picture agrees.`;
			dataTable(
				el,
				[
					{ label: 'Array', value: (a: Arr) => a.label },
					{ label: 'Marked', value: (a: Arr) => a.hit, numeric: true },
					{ label: 'Total', value: (a: Arr) => a.total, numeric: true },
					{ label: 'Risk', value: (a: Arr) => pct(a), numeric: true },
				],
				list,
			);
		}

		const riskInput = slider(row, 'Risk', { min: 0, max: 100, value: 3, format: (n) => `${n} in 100` }, (n) => {
			risk = n;
			draw();
		});
		const modeSelect = select<Mode>(
			row,
			'Show',
			[
				{ value: 'one', label: 'One risk' },
				{ value: 'mixed', label: `${narrow ? '' : 'Compare: '}3 in 100 vs 25 in 1,000` },
				{ value: 'same', label: `${narrow ? '' : 'Compare: '}30 in 1,000 vs 25 in 1,000` },
			],
			(m) => {
				mode = m;
				riskInput.disabled = m !== 'one';
				draw();
			},
			'one',
		);
		// The longest option is wider than a phone; let the select shrink and clip it.
		if (narrow) modeSelect.style.maxWidth = `${W - 60}px`;
		draw();
	},
};

export default figure;
