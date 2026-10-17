import * as d3 from 'd3';
import { controls, dataTable, fmt, isNarrow, readout, select, svg, tooltip, v, viridis, type Figure } from './lib';
import topo from './data/10-2-us-states.json';
import people from './data/10-2-us-65plus.json';

type Mode = 'count' | 'share';

const ABBR: Record<string, string> = {
	'01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC',
	'12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
	'22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT',
	'31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
	'40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
	'50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY',
};

interface Topo {
	transform: { scale: number[]; translate: number[] };
	arcs: number[][][];
	objects: { states: { geometries: { type: string; id: string; arcs: number[][] | number[][][] }[] } };
}

// Minimal TopoJSON -> GeoJSON for quantized polygons (topojson-client isn't typed or pre-bundled here).
function states(t: Topo): GeoJSON.Feature<GeoJSON.Geometry>[] {
	const [sx, sy] = t.transform.scale;
	const [tx, ty] = t.transform.translate;
	const arcs = t.arcs.map((a) => {
		let x = 0;
		let y = 0;
		return a.map(([dx, dy]) => [(x += dx) * sx + tx, (y += dy) * sy + ty]);
	});
	const ring = (ids: number[]) => {
		const pts: number[][] = [];
		for (const i of ids) {
			const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
			pts.push(...(pts.length ? a.slice(1) : a));
		}
		return pts;
	};
	return t.objects.states.geometries.map((g) => ({
		type: 'Feature',
		id: g.id,
		properties: {},
		geometry:
			g.type === 'Polygon'
				? { type: 'Polygon', coordinates: (g.arcs as number[][]).map(ring) }
				: { type: 'MultiPolygon', coordinates: (g.arcs as number[][][]).map((p) => p.map(ring)) },
	}));
}

const MODES: Record<Mode, { label: string; value: (d: Row) => number; fmt: (n: number) => string }> = {
	count: { label: 'Raw count of people 65 and over', value: (d) => d.pop65, fmt: (n) => `${(n / 1e6).toFixed(1)} million` },
	share: { label: 'Share of the population 65 and over', value: (d) => d.pop65 / d.pop, fmt: (n) => `${(n * 100).toFixed(1)}%` },
};

type Row = (typeof people)[number];

const figure: Figure = {
	title: 'Counting people or comparing states',
	caption:
		'People aged 65 and over in each US state. As a raw count the map mostly shows where people live: California, Texas, Florida and New York. As a share of each state’s population it shows something else, with Maine, Vermont and Hawaii at the top.',
	credit:
		'Data: US Census Bureau, Vintage 2024 population estimates (civilian population, 1 July 2024). Boundaries: Census cartographic boundary files via us-atlas. Both public domain.',
	mount(el) {
		const narrow = isNarrow(el);
		const W = narrow ? el.clientWidth : 680;
		const MH = narrow ? Math.round((W * 425) / 680) : 425;
		// Phones: legend above the map, as wide as fits.
		const LW = narrow ? Math.min(300, W - 8) : 300;
		const MY = narrow ? 44 : 0;
		const H = MH + 50;
		const feats = states(topo as unknown as Topo);
		const byId = new Map(people.map((d) => [d.id, d]));
		const path = d3.geoPath(
			d3.geoIdentity().fitExtent(
				[
					[0, 0],
					[W, MH],
				],
				{ type: 'FeatureCollection', features: feats },
			),
		);

		const row = controls(el);
		const root = svg(el, W, H, 'Choropleth map of US states colored by people aged 65 and over, as a raw count or a share of population.');
		const mapG = root.append('g').attr('transform', `translate(0,${MY})`);
		const labelG = root.append('g').attr('transform', `translate(0,${MY})`).style('pointer-events', 'none');
		const legend = root.append('g').attr('transform', `translate(${W / 2 - LW / 2},${narrow ? 4 : MH + 14})`);
		const grad = root
			.append('defs')
			.append('linearGradient')
			.attr('id', `grad-10-2-${Math.random().toString(36).slice(2)}`);
		d3.range(0, 1.01, 0.1).forEach((t) =>
			grad
				.append('stop')
				.attr('offset', `${t * 100}%`)
				.attr('stop-color', viridis(t)),
		);
		legend.append('rect').attr('width', LW).attr('height', 12).attr('rx', 2).style('fill', `url(#${grad.attr('id')})`);
		const legLo = legend.append('text').attr('y', 28).style('fill', v('muted')).style('font-size', '12px');
		const legHi = legend
			.append('text')
			.attr('x', LW)
			.attr('y', 28)
			.attr('text-anchor', 'end')
			.style('fill', v('muted'))
			.style('font-size', '12px');
		const tip = tooltip(el);
		const out = readout(el);

		const paths = mapG
			.selectAll('path')
			.data(feats)
			.join('path')
			.attr('d', (d) => path(d))
			.style('stroke', v('surface'))
			.style('stroke-width', 0.75)
			.on('pointermove', (e, d) => {
				const r = byId.get(String(d.id))!;
				tip.show(
					`<strong>${r.name}</strong><br>${fmt.int(r.pop65)} people 65+<br>${MODES.share.fmt(r.pop65 / r.pop)} of ${fmt.int(r.pop)}`,
					e,
				);
			})
			.on('pointerleave', () => tip.hide());

		function draw(mode: Mode) {
			const m = MODES[mode];
			const vals = people.map(m.value);
			const lo = mode === 'count' ? 0 : d3.min(vals)!;
			const hi = d3.max(vals)!;
			const t = (n: number) => (n - lo) / (hi - lo);
			paths.style('fill', (d) => viridis(t(m.value(byId.get(String(d.id))!))));
			legLo.text(lo === 0 ? '0' : m.fmt(lo));
			legHi.text(m.fmt(hi));

			const top = [...people].sort((a, b) => m.value(b) - m.value(a)).slice(0, 3);
			const topIds = new Set(top.map((d) => d.id));
			const tops = feats.filter((f) => topIds.has(String(f.id)));
			// Phones: push labels apart vertically when centroids are close (Maine and Vermont).
			const ys = new Map(tops.map((f) => [f, path.centroid(f)[1]]));
			if (narrow) {
				const byY = [...tops].sort((a, b) => ys.get(a)! - ys.get(b)!);
				for (let i = 1; i < byY.length; i++)
					ys.set(byY[i], Math.max(ys.get(byY[i])!, ys.get(byY[i - 1])! + 16));
			}
			labelG
				.selectAll('text')
				.data(tops, (d) => String((d as GeoJSON.Feature).id))
				.join('text')
				.attr('x', (d) => Math.max(narrow ? 34 : 0, Math.min(path.centroid(d)[0], W - (narrow ? 34 : 40))))
				.attr('y', (d) => ys.get(d)!)
				.attr('text-anchor', 'middle')
				.attr('dy', '0.35em')
				.style('fill', v('ink'))
				.style('font-size', '13px')
				.style('font-weight', '600')
				.style('paint-order', 'stroke')
				.style('stroke', v('surface'))
				.style('stroke-width', 3)
				.text((d) => {
					const n = m.value(byId.get(String(d.id))!);
					// Phones: "6.5M" so the three labels fit on a narrow map.
					return `${ABBR[String(d.id)]} ${narrow && mode === 'count' ? `${(n / 1e6).toFixed(1)}M` : m.fmt(n)}`;
				});

			out.textContent =
				mode === 'count'
					? `Raw count. The brightest states are ${top.map((d) => d.name).join(', ')}: the states with the most people of any age. The map mostly repeats population.`
					: `Share of each state. The brightest states are ${top.map((d) => d.name).join(', ')}. California, the brightest state on the count map, is ${MODES.share.fmt(
							MODES.share.value(byId.get('06')!),
						)}, below the national ${MODES.share.fmt(d3.sum(people, (d) => d.pop65) / d3.sum(people, (d) => d.pop))}.`;
		}

		const sel = select(
			row,
			'Color by',
			(Object.keys(MODES) as Mode[]).map((k) => ({ value: k, label: MODES[k].label })),
			draw,
			'count',
		);
		if (narrow) sel.style.maxWidth = `${W - 80}px`;
		draw('count');
		dataTable(
			el,
			[
				{ label: 'State', value: (d: Row) => d.name },
				{ label: 'Population', value: (d) => fmt.int(d.pop), numeric: true },
				{ label: 'People 65+', value: (d) => fmt.int(d.pop65), numeric: true },
				{ label: 'Share 65+', value: (d) => MODES.share.fmt(d.pop65 / d.pop), numeric: true },
			],
			[...people].sort((a, b) => a.name.localeCompare(b.name)),
		);
	},
};

export default figure;
