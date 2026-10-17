import { controls, toggle, type Figure } from './lib';

const LETTERS = 'LKVJHLVKJHVLKJHKLJVHKLJHVLKJHLKJVHKJLHVKLJ';

const figure: Figure = {
	title: 'Counting by reading, then by seeing',
	caption:
		'The same 42 letters, plain and with every V in red. Only the color changes.',
	credit: 'Demo idea after Munzner 2014.',
	mount(el) {
		const row = controls(el);
		const p = document.createElement('p');
		p.className = 'letters';
		p.style.cssText =
			'font-family: ui-monospace, Consolas, monospace; font-size: clamp(15px, 3.4vw, 24px); letter-spacing: 0.08em; word-break: break-all; margin: 4px 0;';
		const spans = [...LETTERS].map((ch) => {
			const s = document.createElement('span');
			s.textContent = ch;
			p.append(s);
			return s;
		});
		el.append(p);
		const count = LETTERS.split('V').length - 1;
		const answer = document.createElement('p');
		answer.className = 'viz-readout';
		answer.setAttribute('aria-live', 'polite');
		el.append(answer);

		toggle(row, 'Highlight the V’s', (on) => {
			for (const s of spans) {
				const hit = on && s.textContent === 'V';
				// Bold as well as red, so the pop-out doesn't rely on hue alone.
				s.style.color = hit ? 'var(--viz-highlight)' : '';
				s.style.fontWeight = hit ? '700' : '';
			}
			answer.textContent = on ? `There are ${count} V’s.` : '';
		});
	},
};

export default figure;
