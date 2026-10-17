import { type Figure } from './lib';

// The paper's figures are under the publisher's copyright, so this figure describes them and links to the paper.
const figure: Figure = {
	title: 'AVOCLA, a level-four tool',
	caption:
		'At the deepest level the tool is built around one domain. AVOCLA turns path lines of blood flow into vortex classes that cardiologists can compare between patients.',
	credit: 'Described, not reproduced. Meuschke, Köhler, Preim, Preim and Lawonn 2016.',
	mount(el) {
		const card = document.createElement('div');
		card.style.cssText =
			'border: 1px solid var(--viz-axis); border-left: 4px solid var(--viz-highlight); border-radius: 6px; padding: 12px 14px;';
		const h = document.createElement('p');
		h.style.cssText = 'margin: 0; font-weight: 700; font-size: 16px;';
		h.textContent = 'Semi-automatic Vortex Flow Classification in 4D PC-MRI Data of the Aorta';
		const by = document.createElement('p');
		by.style.cssText = 'margin: 2px 0 8px; color: var(--viz-muted); font-size: 13px;';
		by.textContent = 'Meuschke et al., Computer Graphics Forum 35(3), EuroVis 2016';
		const what = document.createElement('p');
		what.style.cssText = 'margin: 0 0 8px;';
		what.textContent =
			'AVOCLA clusters the path lines that make up each swirl of blood in the 3D aorta, then labels every cluster step by step: helix or vortex, when in the heartbeat it happens, which section of the vessel it sits in, and whether the flow is minor or pronounced.';
		const a = document.createElement('a');
		a.href = 'https://doi.org/10.1111/cgf.12911';
		a.textContent = 'See it: doi.org/10.1111/cgf.12911';
		card.append(h, by, what, a);
		el.append(card);
	},
};

export default figure;
