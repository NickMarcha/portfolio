import { type Figure } from './lib';

// Text from the table in section 17. Built in HTML rather than SVG so it reflows on phones.
const LEVELS = [
	{
		name: 'Domain',
		question: 'Who is this for, and what problem do they have?',
		threat: 'You misunderstood their needs.',
		during: 'Watch and interview people at their real work (contextual inquiry).',
		after: 'See whether people actually adopt the tool.',
	},
	{
		name: 'Abstraction',
		question: 'What data is shown, and why do they look at it?',
		threat: 'You’re showing them the wrong thing.',
		during: 'Let target users do their own work with a prototype, not tasks you made up.',
		after: 'Test with users from the target group, and study whether their behavior changes.',
	},
	{
		name: 'Idiom',
		question: 'How is it shown and interacted with?',
		threat: 'The way you show it doesn’t work.',
		during: 'Justify choices with perception research. Have experts review it.',
		after: 'Lab studies that measure how well people do tasks.',
	},
	{
		name: 'Algorithm',
		question: 'How is it computed efficiently?',
		threat: 'Your code is too slow.',
		during: 'Analyze its complexity.',
		after: 'Measure time and memory.',
	},
];

const figure: Figure = {
	title: 'Munzner’s nested model',
	caption:
		'Four levels, each inside the one before. Every level has its own threat and its own checks, during development and afterwards. A mistake at an outer level makes everything inside it useless, however well the inner levels are done.',
	credit: 'After Munzner 2009.',
	mount(el) {
		let parent: HTMLElement = el;
		LEVELS.forEach((l, i) => {
			const box = document.createElement('section');
			box.setAttribute('aria-label', `Level ${i + 1}: ${l.name}`);
			box.style.cssText = `border: 2px solid var(--viz-series-1); border-radius: 8px; padding: 10px 12px; margin-top: ${i ? 10 : 0}px; background: color-mix(in srgb, var(--viz-series-1) ${4 + i * 4}%, var(--viz-surface));`;
			const h = document.createElement('p');
			h.style.cssText = 'margin: 0 0 6px; font-size: 15px;';
			h.innerHTML = `<strong>${i + 1}. ${l.name}.</strong> ${l.question}`;
			// Each term runs inline with its text, so the innermost box still reads well on a phone.
			const dl = document.createElement('dl');
			dl.style.cssText = 'margin: 0; font-size: 14px;';
			for (const [k, val] of [
				['Threat', l.threat],
				['During development', l.during],
				['Afterwards', l.after],
			]) {
				const item = document.createElement('div');
				item.style.margin = '2px 0';
				const dt = document.createElement('dt');
				dt.textContent = `${k}: `;
				dt.style.cssText = 'display: inline; font-weight: 700;';
				const dd = document.createElement('dd');
				dd.textContent = val;
				dd.style.cssText = 'display: inline; margin: 0;';
				item.append(dt, dd);
				dl.append(item);
			}
			box.append(h, dl);
			parent.append(box);
			parent = box;
		});
	},
};

export default figure;
