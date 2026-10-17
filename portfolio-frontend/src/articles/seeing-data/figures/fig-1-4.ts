import { controls, reducedMotion, toggle, type Figure } from './lib';

// Broad Street pump, as a fraction of the image width and height.
const PUMP = { x: 0.566, y: 0.456 };

const figure: Figure = {
	title: 'John Snow’s cholera map',
	caption:
		'Each death is a small black bar, stacked at the house where it happened. The stacks crowd around the water pump on Broad Street and thin out with distance from it. Zoom in to see the pump.',
	credit:
		'John Snow, 1854, from On the Mode of Communication of Cholera (2nd ed., 1855). Public domain, via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Snow-cholera-map-1.jpg',
	mount(el) {
		const row = controls(el);
		const frame = document.createElement('div');
		frame.style.cssText = 'overflow: hidden; border-radius: 4px; max-width: 900px; margin: 0 auto;';
		const img = document.createElement('img');
		img.src = '/articles/seeing-data/1-4-snow-cholera-map.jpg';
		img.width = 1800;
		img.height = 1688;
		img.loading = 'lazy';
		img.alt =
			'John Snow’s 1854 street map of Soho, London. Black bars along the streets mark cholera deaths, one bar per death. The bars pile up most densely on Broad Street around the marked pump near the centre of the map and become sparse towards the edges, where other pumps have few deaths around them.';
		img.style.cssText = `width: 100%; height: auto; display: block; transform-origin: ${PUMP.x * 100}% ${PUMP.y * 100}%;`;
		if (!reducedMotion()) img.style.transition = 'transform 600ms ease';
		frame.append(img);
		el.append(frame);

		toggle(row, 'Zoom in on the Broad Street pump', (on) => {
			img.style.transform = on ? 'scale(2.6)' : '';
		});
		const link = document.createElement('a');
		link.href = 'https://commons.wikimedia.org/wiki/File:Snow-cholera-map-1.jpg';
		link.textContent = 'Full-resolution map';
		link.style.fontSize = '14px';
		row.append(link);
	},
};

export default figure;
