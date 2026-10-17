import { type Figure } from './lib';

// A link card rather than a screenshot: the story's title screen sits on a third-party
// basemap, which would need its own attribution.
const figure: Figure = {
	title: 'Oslo on Two Wheels',
	caption:
		'The data story my team built about Oslo’s city bikes. Open it and judge it against the nested model yourself.',
	credit: 'Team project for INF252 at the University of Bergen.',
	mount(el) {
		const card = document.createElement('div');
		card.style.cssText =
			'border: 1px solid var(--viz-axis); border-left: 4px solid var(--viz-series-1); border-radius: 6px; padding: 12px 14px;';
		const h = document.createElement('p');
		h.style.cssText = 'margin: 0 0 6px; font-weight: 700; font-size: 17px;';
		h.textContent = 'Oslo on Two Wheels';
		const p = document.createElement('p');
		p.style.cssText = 'margin: 0 0 10px;';
		p.textContent =
			'An interactive story about Oslo City Bike, built from open trip data from April 2019 to January 2026 and matched with daily weather: seasonal ridership, the effect of weather, and the stations where far more bikes leave than arrive.';
		const links = document.createElement('p');
		links.style.cssText = 'margin: 0; display: flex; flex-wrap: wrap; gap: 6px 20px;';
		for (const [text, href] of [
			['Read the live story', 'https://nickmarcha.github.io/INF252-Course-Project/visual-story/'],
			['Project page', 'https://portfolio.nickmarcha.com/projects/oslo-on-two-wheels/'],
		]) {
			const a = document.createElement('a');
			a.href = href;
			a.textContent = text;
			links.append(a);
		}
		card.append(h, p, links);
		el.append(card);
	},
};

export default figure;
