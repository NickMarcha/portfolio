import { button, controls, readout, select, type Figure } from './lib';

// Scans of the Oslo on Two Wheels design sheets (Five Design-Sheet method).
const SHEETS = [
	{
		file: 'brainstorm',
		label: 'First scribbles',
		note: 'Loose sketches before the method starts: maps, trips per year, and questions like whether people ride home drunk.',
		alt: 'Hand-drawn page of loose sketches: a map outline with route curves, a line chart of trips per year for 2021, 2023 and 2025, a speed grid, a network of stations, and handwritten questions in Norwegian and English. Red handwritten notes are added on top.',
	},
	{
		file: 'ideas',
		label: 'Sheet 1: ideas',
		note: 'Sheet 1 is the brainstorm: list ideas, filter them, sort them into groups, combine and refine, and end with the questions to answer.',
		alt: 'Design sheet 1 with five boxes: Ideas (a long list such as change over time, weather, e-scooters, the city breathing in and out, bikes moved by trucks), Filter, Categorize (crowd movement, usage times, environment, altitude), Combine and Refine, and Question (how do people use bikes in their daily lives, how do seasons affect usage, how are bikes moved by trucks). Red handwritten comments in the margins.',
	},
	{
		file: 'design-nick',
		label: 'Sheet 2: Nick',
		note: 'First principal design: a scrolling story about made-up Oslo residents, with icons that change with the weather and the route.',
		alt: 'Design sheet 2 by Nick: a layout of stacked story sections (intro, time spent, weather) with bike and person icons, an operations box about scrolling and animation, a focus box with person icons wearing sunglasses or a winter coat or riding downhill, and a discussion box about privacy and engagement. Red handwritten comments in the margins.',
	},
	{
		file: 'design-truls',
		label: 'Sheet 3: Truls',
		note: 'Second principal design: linked views of station altitude and net flow, asking whether bikes tend to move downhill.',
		alt: 'Design sheet 3 by Truls: a scatterplot of station altitude against net flow, a map of Oslo with arrows coloured by positive or negative flow, a line chart of altitude change over time, and the headline "24373m altitude drop total". Focus questions ask whether bikes move downhill and which stations need refilling. Red handwritten comments.',
	},
	{
		file: 'design-emil',
		label: 'Sheet 4: Emil',
		note: 'Third principal design: pick a station and see which others are in range, using a height map so uphill trips count as farther.',
		alt: 'Design sheet 4 by Emil: an elliptical map with nested green, yellow and red rings around a selected station marked with a star, and a sketch of a height map where a route bends around a hill. Discussion notes say it shows how altitude affects routes, without real trip times. Red handwritten comments.',
	},
	{
		file: 'final',
		label: 'Sheet 5: final design',
		note: 'Sheet 5 is the realization: one design refined from the three, with the layout, the scrolling operations, the focus questions and the technical details.',
		alt: 'Design sheet 5, the final design, drawn digitally: layout sketches for a scrollytelling story (route flows over a day, average trip distance, rain by region, net flows for one station), operations notes on scroll-triggered scenes and reader goals, a histogram of net flow across stations in the focus box, and a detail box listing Jupyter, Astro, D3, Leaflet, Scrollama and data sources. It includes small example images from other projects.',
	},
];

const figure: Figure = {
	title: 'Five design sheets',
	caption:
		'Our sheets for Oslo on Two Wheels: a brainstorm, three different designs by the three of us, and the final design they turned into.',
	credit: 'Sheets by Nick, Truls and Emil. Method: Roberts et al. 2016. Select an image to open it at full size.',
	mount(el) {
		const row = controls(el);
		const link = document.createElement('a');
		link.target = '_blank';
		link.rel = 'noopener';
		const img = document.createElement('img');
		img.decoding = 'async';
		img.style.cssText = 'display:block; width:100%; max-width:560px; height:auto; margin:0 auto; border:1px solid var(--border); background:#fff;';
		link.append(img);
		el.append(link);
		const out = readout(el);

		let i = 0;
		const sel = select(
			row,
			'Sheet',
			SHEETS.map((s, k) => ({ value: String(k), label: s.label })),
			(v) => show(Number(v)),
			'0',
		);
		const prev = button(row, 'Previous', () => show(i - 1));
		const next = button(row, 'Next', () => show(i + 1));

		function show(k: number) {
			i = Math.max(0, Math.min(SHEETS.length - 1, k));
			const s = SHEETS[i];
			const src = `/articles/seeing-data/4-3-${s.file}.jpg`;
			img.src = src;
			img.alt = s.alt;
			link.href = src;
			sel.value = String(i);
			// Don't strand keyboard focus on a button that just became disabled.
			const focused = document.activeElement;
			prev.disabled = i === 0;
			next.disabled = i === SHEETS.length - 1;
			if (focused === prev && prev.disabled) next.focus();
			if (focused === next && next.disabled) prev.focus();
			out.textContent = `${s.label}. ${s.note}`;
		}
		show(0);
	},
};

export default figure;
