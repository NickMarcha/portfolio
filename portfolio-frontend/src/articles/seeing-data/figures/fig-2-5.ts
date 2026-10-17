import type { Figure } from './lib';

const READ = [
	['Band width', 'the number of men still in the army'],
	['Band position', 'the route, by latitude and longitude'],
	['Band color', 'direction: tan going to Moscow, black coming back'],
	['Line chart below', 'temperature on the retreat, with dates'],
];

const figure: Figure = {
	title: 'Minard’s map of Napoleon’s Russian campaign',
	caption:
		'The tan band leaves the Niemen on the left with over 400,000 men and narrows all the way to Moscow; the black band of the retreat comes back thinner still, ending with about 10,000. The temperature line along the bottom falls as the band shrinks.',
	credit:
		'Charles Joseph Minard, 1869. Public domain, via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Minard.png',
	mount(el) {
		const img = document.createElement('img');
		img.src = '/articles/seeing-data/2-5-minard-map.jpg';
		img.width = 1600;
		img.height = 763;
		img.loading = 'lazy';
		img.alt =
			'Minard’s 1869 figurative map. A wide tan band runs from the Polish border on the left to Moscow on the right, getting narrower as the army shrinks. A thin black band returns from Moscow to the left, shrinking further. Below it, a line chart shows the temperature falling to about minus 30 degrees Réaumur during the retreat, with dates.';
		img.style.cssText = 'width: 100%; height: auto;';
		el.append(img);

		// How to read it: one row per encoding, so the six variables are named in text too.
		const dl = document.createElement('dl');
		dl.style.cssText = 'display: grid; grid-template-columns: max-content 1fr; gap: 2px 12px; margin: 12px 0 0; font-size: 14px;';
		for (const [k, val] of READ) {
			const dt = document.createElement('dt');
			dt.textContent = k;
			dt.style.fontWeight = '700';
			const dd = document.createElement('dd');
			dd.textContent = val;
			dd.style.margin = '0';
			dl.append(dt, dd);
		}
		el.append(dl);
	},
};

export default figure;
