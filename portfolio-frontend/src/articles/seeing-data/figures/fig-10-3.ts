import { type Figure } from './lib';

// xkcd is CC BY-NC 2.5, so this figure describes the comic and links to it instead of copying it.
const figure: Figure = {
	title: 'xkcd’s “Heatmap”',
	caption:
		'A map that colors regions by a raw count usually just shows where people live. Normalize first, for example per 100 people.',
	credit: 'Described, not reproduced. Comic by Randall Munroe, xkcd.com, CC BY-NC 2.5.',
	mount(el) {
		const card = document.createElement('div');
		card.style.cssText =
			'border: 1px solid var(--viz-axis); border-left: 4px solid var(--viz-highlight); border-radius: 6px; padding: 12px 14px;';
		const h = document.createElement('p');
		h.style.cssText = 'margin: 0; font-weight: 700; font-size: 16px;';
		h.textContent = 'Heatmap (xkcd 1138)';
		const by = document.createElement('p');
		by.style.cssText = 'margin: 2px 0 8px; color: var(--viz-muted); font-size: 13px;';
		by.textContent = 'Randall Munroe, 2012';
		const what = document.createElement('p');
		what.style.cssText = 'margin: 0 0 8px;';
		what.textContent =
			'Three near-identical US maps, each supposedly showing where a different group of people is concentrated. All three are really maps of population density, and the joke lands because every reader has seen a serious map that made the same mistake.';
		const a = document.createElement('a');
		a.href = 'https://xkcd.com/1138/';
		a.textContent = 'See it: xkcd.com/1138';
		card.append(h, by, what, a);
		el.append(card);
	},
};

export default figure;
