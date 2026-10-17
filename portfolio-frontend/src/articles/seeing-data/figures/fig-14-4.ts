import type { Figure } from './lib';

const IBFV_URL = 'https://www.win.tue.nl/~vanwijk/ibfv/';

const figure: Figure = {
	title: 'Image-based flow visualization, from the source',
	caption:
		'Jarke van Wijk’s page for IBFV has the paper, sample C code and short animations of one flow drawn as spot noise, LIC, particles, streamlines, timelines and topology, all made with the same method.',
	credit: 'van Wijk 2002. Linked, not reproduced.',
	mount(el) {
		const p = document.createElement('p');
		p.style.cssText = 'margin:0;';
		p.textContent =
			'Each frame warps the previous image a little along the flow and blends in fresh noise, so the texture streams with the flow at interactive speed. The page also shows the method on a slice of a simulated turbulent flow around a block. ';
		const a = document.createElement('a');
		a.href = IBFV_URL;
		a.rel = 'noopener';
		a.textContent = 'Open the IBFV page on van Wijk’s site';
		const go = document.createElement('p');
		go.style.cssText = 'margin:10px 0 0;font-weight:700;';
		go.append(a, ' (external link)');
		el.append(p, go);
	},
};

export default figure;
