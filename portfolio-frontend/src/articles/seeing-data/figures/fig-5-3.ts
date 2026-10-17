import * as d3 from 'd3';
import { controls, dataTable, isNarrow, readout, reducedMotion, svg, toggle, v, type Figure } from './lib';

// Only the two numbers in the text: 21 million believe both claims, and 74% (about
// 191 million) believe neither. The total and the middle group follow from them.
const BOTH = 21;
const NEITHER = 191;
const TOTAL = Math.round(NEITHER / 0.74);
const ONE = TOTAL - NEITHER - BOTH;

const PARTS = [
	{ key: 'both', short: 'Both', label: 'Believe both', value: BOTH, color: v('highlight') },
	{ key: 'one', short: 'One of the two', label: 'Believe one of the two', value: ONE, color: v('dim') },
	{ key: 'neither', short: 'Neither', label: 'Believe neither', value: NEITHER, color: v('series-1') },
];
type Part = (typeof PARTS)[number];

const figure: Figure = {
	title: 'The scary slice and the whole',
	caption:
		'The headline number on its own fills the frame. Put it back into everyone the poll speaks for and it is about one person in twelve, next to the 74% who believe neither claim.',
	credit:
		'Numbers as quoted in the course lecture: 21 million believe both, 74% (about 191 million) believe neither. The total (about 258 million) and the middle group are worked out from those two.',
	mount(el) {
		// Phone layout: the title wraps onto two lines and the 'Neither' label gets its own
		// line under the bar, so it can't run into 'One of the two'.
		const narrow = isNarrow(el);
		const W = narrow ? el.clientWidth : 480;
		const H = narrow ? 196 : 150;
		const m = narrow ? { left: 4, right: 4 } : { left: 20, right: 20 };
		const iw = W - m.left - m.right;
		const by = narrow ? 84 : 62;
		const bh = 46;

		const row = controls(el);
		const root = svg(el, W, H, '');
		const g = root.append('g').attr('transform', `translate(${m.left},0)`);
		const title = g
			.append('text')
			.attr('y', 30)
			.style('fill', v('ink'))
			.style('font-size', '18px')
			.style('font-weight', '600');
		const segs = g
			.selectAll<SVGRectElement, Part>('rect')
			.data(PARTS)
			.join('rect')
			.attr('y', by)
			.attr('height', bh)
			.style('fill', (d) => d.color);
		const labels = g
			.selectAll<SVGTextElement, Part>('text.lab')
			.data(PARTS)
			.join('text')
			.attr('class', 'lab')
			.style('fill', v('ink'))
			.style('font-size', '14px');
		const out = readout(el);

		function starts(x: d3.ScaleLinear<number, number>) {
			let acc = 0;
			return PARTS.map((p) => {
				const s = acc;
				acc += p.value;
				return x(s);
			});
		}

		function draw(whole: boolean) {
			const x = d3
				.scaleLinear()
				.domain([0, whole ? TOTAL : BOTH])
				.range([0, iw]);
			const x0 = starts(x);
			const t = d3.transition().duration(reducedMotion() ? 0 : 700).ease(d3.easeCubicInOut);
			segs.transition(t)
				.attr('x', (_, i) => x0[i])
				.attr('width', (d) => Math.max(0, x(d.value) - x(0) - 2))
				.style('opacity', (d) => (whole || d.key === 'both' ? 1 : 0));
			const tl = whole ? ['Everyone it speaks for,', `about ${TOTAL} million`] : ['21 million Americans', 'believe both'];
			title.selectAll('tspan').remove();
			if (narrow) tl.forEach((l, i) => title.append('tspan').attr('x', 0).attr('dy', i ? 24 : 0).text(l));
			else title.text(tl.join(' '));
			// 'Both' sits above the bar; the other two go below, one from each end.
			labels
				.style('opacity', (d) => (whole || d.key === 'both' ? 1 : 0))
				.attr('text-anchor', (d) => (d.key === 'neither' ? 'end' : 'start'))
				.attr('x', (d, i) => (d.key === 'neither' ? iw : x0[i] + (i ? 2 : 0)))
				.attr('y', (d) => (d.key === 'both' && whole ? by - 8 : narrow && d.key === 'neither' ? by + bh + 42 : by + bh + 20))
				.text((d) =>
					whole
						? `${d.short}: ${d.key === 'one' ? '≈' : ''}${d.value}M (${Math.round((d.value / TOTAL) * 100)}%)`
						: `${d.label}: ${d.value} million`,
				);
			root.attr(
				'aria-label',
				whole
					? `Part-to-whole bar of about ${TOTAL} million people: ${BOTH} million believe both claims, about ${ONE} million believe one, ${NEITHER} million (74%) believe neither.`
					: `A single bar of ${BOTH} million people filling the whole width, as the headline shows it.`,
			);
			out.textContent = whole
				? `The ${BOTH} million are real, and they are ${Math.round((BOTH / TOTAL) * 100)}% of the whole. Three in four believe neither claim.`
				: 'This is the headline: one number, scaled to fill the frame. Nothing shows what it is a part of.';
		}

		toggle(row, 'Show the whole poll', draw);
		draw(false);

		dataTable(
			el,
			[
				{ label: 'Group', value: (d: Part) => d.label },
				{ label: 'Millions', value: (d) => d.value, numeric: true },
				{ label: 'Share', value: (d) => `${Math.round((d.value / TOTAL) * 100)}%`, numeric: true },
				{ label: 'Source', value: (d) => (d.key === 'one' ? 'Worked out: total minus the other two' : 'Stated in the text') },
			],
			PARTS,
		);
	},
};

export default figure;
