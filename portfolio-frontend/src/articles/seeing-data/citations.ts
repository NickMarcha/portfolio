// Inline citations ([Munzner 2014]) link to their entry in the source list. This
// shows that entry in a popover next to the citation instead, so readers don't have
// to scroll to the bottom. Click, tap or Enter opens it; on devices with a mouse,
// hovering for a moment does too. Esc or clicking elsewhere closes it (native
// popover light dismiss). Without JS the link still jumps to the list.

const pop = document.createElement('div');
pop.className = 'cite-pop';
pop.setAttribute('popover', 'auto');
pop.setAttribute('role', 'dialog');
pop.setAttribute('aria-label', 'Source');
document.body.append(pop);

let current: HTMLAnchorElement | null = null;
let openedByHover = false;

function scholarLink(li: HTMLElement) {
	const q = li.textContent?.replace(/\s+/g, ' ').trim() ?? '';
	return `https://scholar.google.com/scholar?q=${encodeURIComponent(q)}`;
}

function place(a: HTMLAnchorElement) {
	const r = a.getBoundingClientRect();
	const w = pop.offsetWidth;
	const h = pop.offsetHeight;
	const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), document.documentElement.clientWidth - w - 8);
	const below = r.bottom + 8 + h < window.innerHeight || r.top < h + 16;
	pop.style.left = `${left + window.scrollX}px`;
	pop.style.top = `${(below ? r.bottom + 8 : r.top - h - 8) + window.scrollY}px`;
}

function open(a: HTMLAnchorElement, byHover: boolean) {
	const li = document.getElementById(a.hash.slice(1));
	if (!li) return;
	const entry = li.cloneNode(true) as HTMLElement;
	const link = entry.querySelector<HTMLAnchorElement>('a.ref-link, a[href^="http"]');
	pop.innerHTML = '';
	const text = document.createElement('p');
	text.className = 'cite-pop-entry';
	link?.remove();
	text.innerHTML = entry.innerHTML;
	const actions = document.createElement('p');
	actions.className = 'cite-pop-actions';
	const src = document.createElement('a');
	src.href = link?.href ?? scholarLink(li);
	src.textContent = link ? `Open the source (${link.textContent})` : 'Search for it on Google Scholar';
	src.target = '_blank';
	src.rel = 'noopener';
	const all = document.createElement('a');
	all.href = a.hash;
	all.textContent = 'All sources';
	all.addEventListener('click', () => pop.hidePopover());
	actions.append(src, all);
	pop.append(text, actions);

	current = a;
	openedByHover = byHover;
	a.setAttribute('aria-expanded', 'true');
	if (!pop.matches(':popover-open')) pop.showPopover();
	place(a);
	if (!byHover) src.focus();
}

pop.addEventListener('toggle', (e) => {
	if ((e as ToggleEvent).newState !== 'closed' || !current) return;
	current.setAttribute('aria-expanded', 'false');
	// Hand focus back to the citation, unless the reader already moved it elsewhere.
	const f = document.activeElement;
	if (!openedByHover && (!f || f === document.body || pop.contains(f))) current.focus({ preventScroll: true });
	current = null;
});

// Figures load lazily and change height, which moves the citation under an open
// popover. Follow it.
const reposition = () => current && place(current);
const article = document.querySelector('.article');
if (article) new ResizeObserver(reposition).observe(article);
addEventListener('resize', reposition);

const cites = document.querySelectorAll<HTMLAnchorElement>('.article a.cite');
for (const a of cites) {
	a.setAttribute('aria-haspopup', 'dialog');
	a.setAttribute('aria-expanded', 'false');
	a.addEventListener('click', (e) => {
		e.preventDefault();
		if (current === a && !openedByHover) return pop.hidePopover();
		open(a, false);
	});
}

// Hover preview, only where hovering is a real thing.
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
	let timer = 0;
	const later = (fn: () => void, ms: number) => {
		clearTimeout(timer);
		timer = window.setTimeout(fn, ms);
	};
	for (const a of cites) {
		a.addEventListener('mouseenter', () => later(() => open(a, true), 350));
		a.addEventListener('mouseleave', () => later(() => openedByHover && pop.hidePopover(), 300));
	}
	pop.addEventListener('mouseenter', () => clearTimeout(timer));
	pop.addEventListener('mouseleave', () => later(() => openedByHover && pop.hidePopover(), 300));
}
