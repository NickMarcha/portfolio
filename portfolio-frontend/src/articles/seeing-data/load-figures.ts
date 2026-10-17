// Fills each <figure class="viz-fig" data-fig="x.y"> in the article.
// A figure's code lives in figures/fig-x-y.ts and loads when it nears the viewport.
// Figures without a module show their entry from the figure plan as a placeholder.

import type { Figure } from './figures/lib';
import { isNarrow } from './figures/narrow';
import plan from './figures/plan.json';

type PlanEntry = { heading: string; what: string; status: string; interactive: string; data: string; credit: string };

const modules = import.meta.glob<{ default: Figure }>('./figures/fig-*.ts');
const modulePath = (id: string) => `./figures/fig-${id.replace('.', '-')}.ts`;

function caption(fig: HTMLElement, id: string, f: Figure) {
	const cap = document.createElement('figcaption');
	const num = document.createElement('span');
	num.className = 'fig-num';
	num.textContent = `Figure ${id}. ${f.title}. `;
	cap.append(num, f.caption);
	if (f.credit) {
		const c = document.createElement('span');
		c.className = 'fig-credit';
		c.textContent = f.credit;
		cap.append(c);
	}
	fig.append(cap);
}

function placeholder(fig: HTMLElement, id: string) {
	const p = (plan as Record<string, PlanEntry>)[id];
	fig.classList.add('is-placeholder');
	const title = document.createElement('strong');
	title.textContent = `Figure ${id} is not built yet`;
	fig.append(title);
	if (!p) return;
	const dl = document.createElement('dl');
	for (const [k, val] of [
		['Shows', p.what],
		['Type', p.status + (p.interactive ? `, interactive: ${p.interactive}` : '')],
		['Data', p.data],
		['Credit', p.credit],
	]) {
		if (!val) continue;
		const dt = document.createElement('dt');
		dt.textContent = k;
		const dd = document.createElement('dd');
		dd.textContent = val;
		dl.append(dt, dd);
	}
	fig.append(dl);
}

async function load(fig: HTMLElement) {
	const id = fig.dataset.fig!;
	const loader = modules[modulePath(id)];
	if (!loader) return placeholder(fig, id);
	try {
		const f = (await loader()).default;
		const body = document.createElement('div');
		body.className = 'viz-body';
		fig.append(body);
		caption(fig, id, f);
		fig.id = `fig-${id.replace('.', '-')}`;
		let cleanup = f.mount(body);
		// Figures pick a phone or desktop layout at mount (isNarrow in lib.ts). When the
		// figure crosses that width, e.g. a phone is rotated, mount it again.
		let narrow = isNarrow(body);
		new ResizeObserver(() => {
			if (isNarrow(body) === narrow) return;
			narrow = !narrow;
			cleanup?.();
			body.replaceChildren();
			cleanup = f.mount(body);
		}).observe(body);
	} catch (err) {
		console.error(`[figure ${id}]`, err);
		fig.replaceChildren();
		placeholder(fig, id);
	}
}

const io = new IntersectionObserver(
	(entries) => {
		for (const e of entries) {
			if (!e.isIntersecting) continue;
			io.unobserve(e.target);
			load(e.target as HTMLElement);
		}
	},
	{ rootMargin: '800px 0px' },
);

// ?figs=all loads every figure up front (printing, screenshots). ?fig=5.1 shows only
// that figure, for checking one in isolation.
const params = new URLSearchParams(location.search);
const only = params.get('fig');
for (const fig of document.querySelectorAll<HTMLElement>('figure.viz-fig[data-fig]')) {
	if (only) {
		if (fig.dataset.fig === only) {
			document.querySelector('.article')?.replaceChildren(fig);
			load(fig);
		}
	} else if (params.get('figs') === 'all') load(fig);
	else io.observe(fig);
}
