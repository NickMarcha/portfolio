import { type Figure } from './lib';

// Both originals are copyrighted designs, so this figure describes them and links out.
const WORKS = [
	{
		name: 'Monstrous Costs',
		by: 'Nigel Holmes, Time magazine, 1982',
		what: 'A bar chart of rising election campaign costs, with the bars drawn as the teeth in a monster’s open mouth. Bateman and colleagues used it as one of the embellished charts in their study.',
		link: 'https://doi.org/10.1145/1753326.1753716',
		linkText: 'Bateman et al. 2010, “Useful junk?” (ACM Digital Library)',
	},
	{
		name: 'Iraq’s Bloody Toll',
		by: 'Simon Scarr, South China Morning Post, 2011',
		what: 'Monthly deaths in the Iraq war as a bar chart turned upside down. The bars hang from the top in dark red and read as dripping blood. No decoration is added; the encoding carries the feeling.',
		link: 'https://eagereyes.org/video/2021-iraq',
		linkText: 'Robert Kosara’s chart appreciation on eagereyes',
	},
];

const figure: Figure = {
	title: 'Two famous embellished charts',
	caption:
		'Both charts are still bar charts underneath. The monster adds a picture on top of the data; the dripping bars get their emotion from the data’s own marks.',
	credit: 'Described, not reproduced. Follow the links to see the originals.',
	mount(el) {
		const wrap = document.createElement('div');
		wrap.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px;';
		for (const w of WORKS) {
			const card = document.createElement('div');
			card.style.cssText =
				'border: 1px solid var(--viz-axis); border-left: 4px solid var(--viz-highlight); border-radius: 6px; padding: 12px 14px;';
			const h = document.createElement('p');
			h.style.cssText = 'margin: 0; font-weight: 700; font-size: 16px;';
			h.textContent = w.name;
			const by = document.createElement('p');
			by.style.cssText = 'margin: 2px 0 8px; color: var(--viz-muted); font-size: 13px;';
			by.textContent = w.by;
			const what = document.createElement('p');
			what.style.cssText = 'margin: 0 0 8px;';
			what.textContent = w.what;
			const a = document.createElement('a');
			a.href = w.link;
			a.textContent = `See it: ${w.linkText}`;
			card.append(h, by, what, a);
			wrap.append(card);
		}
		el.append(wrap);
	},
};

export default figure;
