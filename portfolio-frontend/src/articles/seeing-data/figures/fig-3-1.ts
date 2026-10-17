import * as d3 from 'd3';
import { button, controls, dataTable, readout, rng, select, svg, v, type Figure } from './lib';

type Mode = 'feature' | 'conjunction';
interface Item {
	x: number;
	y: number;
	red: boolean;
	square: boolean;
	target: boolean;
}
interface Trial {
	n: number;
	mode: Mode;
	size: number;
	present: boolean;
	answer: boolean;
	ms: number;
}

const W = 640;
const H = 340;
const COLS = 16;
const ROWS = 8;
const S = 18; // item size in px

const MODE_LABEL: Record<Mode, string> = {
	feature: 'Color only',
	conjunction: 'Color and shape',
};

const figure: Figure = {
	title: 'Find the red square',
	caption:
		'Press Start, then answer as fast as you can: is there a red square? With color only, the target pops out and the time hardly changes with the number of items. With color and shape, the target hides among red circles and blue squares, and you have to search.',
	credit: 'After Treisman’s visual search experiments, via Munzner 2014.',
	mount(el) {
		const random = rng(31);
		let mode: Mode = 'feature';
		let size = 30;
		let items: Item[] = [];
		let present = false;
		let started = 0;
		const trials: Trial[] = [];

		const row = controls(el);
		select<Mode>(
			row,
			'Search',
			[
				{ value: 'feature', label: MODE_LABEL.feature },
				{ value: 'conjunction', label: MODE_LABEL.conjunction },
			],
			(m) => {
				mode = m;
				reset();
			},
			mode,
		);
		select(
			row,
			'Items',
			['10', '30', '60'].map((s) => ({ value: s, label: s })),
			(s) => {
				size = Number(s);
				reset();
			},
			String(size),
		);
		const start = button(row, 'Start trial', () => newTrial());

		const root = svg(el, W, H, 'Visual search field. Press Start trial to show a set of colored shapes.');
		root.style('cursor', 'default');
		root
			.append('rect')
			.attr('width', W)
			.attr('height', H)
			.attr('rx', 4)
			.style('fill', 'none')
			.style('stroke', v('grid'));
		const field = root.append('g');
		const prompt = root
			.append('text')
			.attr('x', W / 2)
			.attr('y', H / 2)
			.attr('text-anchor', 'middle')
			.style('fill', v('muted'))
			.style('font-size', '15px');

		const answers = controls(el);
		const yes = button(answers, 'Yes, it’s there (Y)', () => answer(true));
		const no = button(answers, 'No red square (N)', () => answer(false));
		const out = readout(el);

		function setAnswering(on: boolean) {
			yes.disabled = !on;
			no.disabled = !on;
		}

		function reset() {
			field.selectAll('*').remove();
			started = 0;
			setAnswering(false);
			prompt.text(`${MODE_LABEL[mode]}, ${size} items. Press Start trial.`);
			out.textContent = '';
		}

		function layout(): Item[] {
			// Jittered grid cells, so items never overlap.
			const cells = d3.shuffler(random)(d3.range(COLS * ROWS)).slice(0, size);
			const cw = W / COLS;
			const ch = H / ROWS;
			present = random() < 0.5;
			return cells.map((c, i) => {
				const target = present && i === 0;
				let red: boolean;
				let square: boolean;
				if (target) {
					red = true;
					square = true;
				} else if (mode === 'feature') {
					red = false;
					square = true;
				} else {
					// Conjunction: every distractor shares one feature with the target.
					red = random() < 0.5;
					square = !red;
				}
				return {
					x: (c % COLS) * cw + cw / 2 + (random() - 0.5) * (cw - S - 4),
					y: Math.floor(c / COLS) * ch + ch / 2 + (random() - 0.5) * (ch - S - 4),
					red,
					square,
					target,
				};
			});
		}

		function newTrial() {
			items = layout();
			prompt.text('');
			field
				.selectAll('path')
				.data(items)
				.join('path')
				.attr('transform', (d) => `translate(${d.x},${d.y})`)
				.attr('d', (d) => d3.symbol(d.square ? d3.symbolSquare : d3.symbolCircle, d.square ? S * S : (S * S * Math.PI) / 4)()!)
				.style('fill', (d) => (d.red ? v('highlight') : v('series-1')))
				.style('cursor', 'pointer')
				.on('click', () => answer(true));
			root.attr('aria-label', `Visual search field with ${size} shapes. Answer with the Yes or No buttons.`);
			setAnswering(true);
			out.textContent = 'Is there a red square? Press Y or N.';
			started = performance.now();
			yes.focus({ preventScroll: true });
		}

		function answer(said: boolean) {
			if (!started) return;
			const ms = Math.round(performance.now() - started);
			started = 0;
			setAnswering(false);
			const t: Trial = { n: trials.length + 1, mode, size, present, answer: said, ms };
			trials.push(t);
			// Ring the target so the reader can check their answer.
			field
				.selectAll<SVGPathElement, Item>('path')
				.style('cursor', 'default')
				.on('click', null)
				.filter((d) => d.target)
				.clone()
				.style('fill', 'none')
				.style('stroke', v('ink'))
				.style('stroke-width', 2)
				.attr('d', d3.symbol(d3.symbolCircle, 900)()!);
			const right = said === present;
			const same = trials.filter((x) => x.mode === mode && x.size === size && x.answer === x.present);
			const mean = same.length ? Math.round(d3.mean(same, (x) => x.ms)!) : 0;
			out.textContent =
				`${right ? 'Correct' : 'Not quite'}: the red square was ${present ? 'there (circled)' : 'not there'}. ` +
				`You took ${ms} ms. Average for correct answers, ${MODE_LABEL[mode].toLowerCase()} with ${size} items: ${mean} ms over ${same.length} trial${same.length === 1 ? '' : 's'}.`;
			start.focus({ preventScroll: true });
			table();
		}

		function table() {
			dataTable(
				el,
				[
					{ label: 'Trial', value: (d: Trial) => d.n, numeric: true },
					{ label: 'Search', value: (d) => MODE_LABEL[d.mode] },
					{ label: 'Items', value: (d) => d.size, numeric: true },
					{ label: 'Target present', value: (d) => (d.present ? 'yes' : 'no') },
					{ label: 'Your answer', value: (d) => (d.answer ? 'yes' : 'no') },
					{ label: 'Time (ms)', value: (d) => d.ms, numeric: true },
				],
				trials,
				'Show your trials',
			);
		}

		const onKey = (e: KeyboardEvent) => {
			if (!started || e.ctrlKey || e.metaKey || e.altKey) return;
			const k = e.key.toLowerCase();
			if (k === 'y' || k === 'n') {
				e.preventDefault();
				answer(k === 'y');
			}
		};
		el.addEventListener('keydown', onKey);

		reset();
		table();
		return () => el.removeEventListener('keydown', onKey);
	},
};

export default figure;
