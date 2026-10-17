import * as d3 from 'd3';
import { controls, dataTable, fmt, isNarrow, readout, select, svg, tooltip, v, viridis, type Figure } from './lib';
import topo from './data/10-2-us-states.json';
import people from './data/10-2-us-65plus.json';

type Mode = 'symbol' | 'tile';
type Row = (typeof people)[number];

// Square tile grid, one tile per state, placed roughly where the state is: [column, row].
const TILES: Record<string, [string, number, number]> = {
	'02': ['AK', 0, 0], '23': ['ME', 10, 0],
	'55': ['WI', 5, 1], '50': ['VT', 9, 1], '33': ['NH', 10, 1],
	'53': ['WA', 0, 2], '16': ['ID', 1, 2], '30': ['MT', 2, 2], '38': ['ND', 3, 2], '27': ['MN', 4, 2],
	'17': ['IL', 5, 2], '26': ['MI', 6, 2], '36': ['NY', 8, 2], '25': ['MA', 9, 2],
	'41': ['OR', 0, 3], '32': ['NV', 1, 3], '56': ['WY', 2, 3], '46': ['SD', 3, 3], '19': ['IA', 4, 3],
	'18': ['IN', 5, 3], '39': ['OH', 6, 3], '42': ['PA', 7, 3], '34': ['NJ', 8, 3], '09': ['CT', 9, 3], '44': ['RI', 10, 3],
	'06': ['CA', 0, 4], '49': ['UT', 1, 4], '08': ['CO', 2, 4], '31': ['NE', 3, 4], '29': ['MO', 4, 4],
	'21': ['KY', 5, 4], '54': ['WV', 6, 4], '51': ['VA', 7, 4], '24': ['MD', 8, 4], '10': ['DE', 9, 4],
	'04': ['AZ', 1, 5], '35': ['NM', 2, 5], '20': ['KS', 3, 5], '05': ['AR', 4, 5], '47': ['TN', 5, 5],
	'37': ['NC', 6, 5], '45': ['SC', 7, 5], '11': ['DC', 8, 5],
	'40': ['OK', 3, 6], '22': ['LA', 4, 6], '28': ['MS', 5, 6], '01': ['AL', 6, 6], '13': ['GA', 7, 6],
	'15': ['HI', 0, 7], '48': ['TX', 3, 7], '12': ['FL', 8, 7],
};

interface Topo {
	transform: { scale: number[]; translate: number[] };
	arcs: number[][][];
	objects: { states: { geometries: { type: string; id: string; arcs: number[][] | number[][][] }[] } };
}

// Minimal TopoJSON -> GeoJSON for quantized polygons (same as fig-10-2).
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

const share = (d: Row) => d.pop65 / d.pop;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

const figure: Figure = {
	title: 'Two alternatives to the choropleth',
	caption:
		'The data from Figure 10.2 again. The symbol map sizes a circle by the number of people 65 and over, with area, not radius, matching the count. The tile grid gives every state the same square and colors it by the share, so Montana no longer outshouts Rhode Island.',
	credit:
		'Data: US Census Bureau, Vintage 2024 population estimates. Boundaries: Census cartographic boundary files via us-atlas. Both public domain.',
	mount(el) {
		const narrow = isNarrow(el);
		const W = narrow ? el.clientWidth : 680;
		// Phones: tiles shrink to fit 11 columns, so they carry the state code only (share in tooltip and table).
		const gap = narrow ? 2 : 4;
		const T = narrow ? Math.floor((W - 10 * gap) / 11) : 50;
		const MH = narrow ? Math.max(Math.round((W * 425) / 680), 8 * (T + gap)) : 425;
		const H = MH + (narrow ? 60 : 80);
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
		const r = d3
			.scaleSqrt()
			.domain([0, d3.max(people, (d) => d.pop65)!])
			.range([0, narrow ? Math.max(14, (34 * W) / 680) : 34]);
		const lo = d3.min(people, share)!;
		const hi = d3.max(people, share)!;
		const color = (n: number) => viridis((n - lo) / (hi - lo));

		const row = controls(el);
		const root = svg(el, W, H, '');
		const mapG = root.append('g');
		const symG = root.append('g');
		const tileG = root.append('g');
		const legend = root.append('g').attr('transform', `translate(0,${MH + 8})`);
		const tip = tooltip(el);
		const out = readout(el);
		const tipHtml = (d: Row) =>
			`<strong>${d.name}</strong><br>${fmt.int(d.pop65)} people 65+<br>${pct(share(d))} of the population`;

		mapG
			.selectAll('path')
			.data(feats)
			.join('path')
			.attr('d', (d) => path(d))
			.style('fill', v('dim'))
			.style('stroke', v('surface'))
			.style('stroke-width', 0.75);

		const sym = feats
			.map((f) => ({ f, d: byId.get(String(f.id))!, c: path.centroid(f) }))
			.sort((a, b) => b.d.pop65 - a.d.pop65);
		// Largest first, so small circles stay on top and visible.
		symG
			.selectAll('circle')
			.data(sym)
			.join('circle')
			.attr('cx', (s) => s.c[0])
			.attr('cy', (s) => s.c[1])
			.attr('r', (s) => r(s.d.pop65))
			.style('fill', v('series-1'))
			.style('fill-opacity', 0.65)
			.style('stroke', v('surface'))
			.style('stroke-width', 1)
			.on('pointermove', (e, s) => tip.show(tipHtml(s.d), e))
			.on('pointerleave', () => tip.hide());
		symG
			.selectAll('text')
			.data(sym.slice(0, 4))
			.join('text')
			.attr('x', (s) => s.c[0])
			.attr('y', (s) => s.c[1])
			.attr('dy', '0.35em')
			.attr('text-anchor', 'middle')
			.style('fill', v('ink'))
			.style('font-size', '13px')
			.style('font-weight', '600')
			.style('paint-order', 'stroke')
			.style('stroke', v('surface'))
			.style('stroke-width', 3)
			.style('pointer-events', 'none')
			.text((s) => `${(s.d.pop65 / 1e6).toFixed(1)}M`);

		const ox = (W - 11 * T - 10 * gap) / 2;
		const oy = (MH - 8 * T - 7 * gap) / 2;
		const tiles = tileG
			.selectAll('g')
			.data(people)
			.join('g')
			.attr('transform', (d) => {
				const [, c, rr] = TILES[d.id];
				return `translate(${ox + c * (T + gap)},${oy + rr * (T + gap)})`;
			})
			.on('pointermove', (e, d) => tip.show(tipHtml(d), e))
			.on('pointerleave', () => tip.hide());
		tiles
			.append('rect')
			.attr('width', T)
			.attr('height', T)
			.attr('rx', 3)
			.style('fill', (d) => color(share(d)));
		// Ink on the tile flips with the fill's lightness so it stays readable on dark and light viridis.
		const ink = (d: Row) => ((share(d) - lo) / (hi - lo) > 0.45 ? '#1a1a1a' : '#ffffff');
		tiles
			.append('text')
			.attr('x', T / 2)
			.attr('y', narrow ? T / 2 : 21)
			.attr('dy', narrow ? '0.35em' : null)
			.attr('text-anchor', 'middle')
			.style('font-size', narrow ? '12px' : '14px')
			.style('font-weight', '600')
			.style('fill', ink)
			.text((d) => TILES[d.id][0]);
		if (!narrow)
			tiles
				.append('text')
				.attr('x', T / 2)
				.attr('y', 38)
				.attr('text-anchor', 'middle')
				.style('font-size', '12px')
				.style('fill', ink)
				.text((d) => pct(share(d)));

		function drawLegend(mode: Mode) {
			legend.selectAll('*').remove();
			if (mode === 'symbol') {
				const g = legend.append('g').attr('transform', `translate(${narrow ? 4 : W / 2 - 150},0)`);
				let x = 0;
				for (const n of [1e6, 3e6, 6e6]) {
					const rr = r(n);
					g.append('circle')
						.attr('cx', x + rr)
						.attr('cy', 36)
						.attr('r', rr)
						.style('fill', v('series-1'))
						.style('fill-opacity', 0.65);
					g.append('text')
						.attr('x', x + 2 * rr + 6)
						.attr('y', 36)
						.attr('dy', '0.35em')
						.style('fill', v('muted'))
						.style('font-size', '12px')
						.text(narrow ? `${n / 1e6}M` : `${n / 1e6} million`);
					x += 2 * rr + (narrow ? 44 : 80);
				}
			} else {
				const id = `grad-10-4-${Math.random().toString(36).slice(2)}`;
				const grad = legend.append('defs').append('linearGradient').attr('id', id);
				d3.range(0, 1.01, 0.1).forEach((t) =>
					grad
						.append('stop')
						.attr('offset', `${t * 100}%`)
						.attr('stop-color', viridis(t)),
				);
				const LW = narrow ? W - 8 : 300;
				const g = legend.append('g').attr('transform', `translate(${W / 2 - LW / 2},20)`);
				g.append('rect').attr('width', LW).attr('height', 12).attr('rx', 2).style('fill', `url(#${id})`);
				g.append('text').attr('y', 28).style('fill', v('muted')).style('font-size', '12px').text(pct(lo));
				g.append('text')
					.attr('x', LW)
					.attr('y', 28)
					.attr('text-anchor', 'end')
					.style('fill', v('muted'))
					.style('font-size', '12px')
					.text(`${pct(hi)} of the population is 65+`);
			}
		}

		function draw(mode: Mode) {
			const sm = mode === 'symbol';
			mapG.attr('display', sm ? null : 'none');
			symG.attr('display', sm ? null : 'none');
			tileG.attr('display', sm ? 'none' : null);
			root.attr(
				'aria-label',
				sm
					? 'Symbol map of the US with one circle per state, its area proportional to the number of people aged 65 and over.'
					: 'Tile grid map of the US with one equal square per state, colored by the share of people aged 65 and over.',
			);
			drawLegend(mode);
			const ca = byId.get('06')!;
			const az = byId.get('04')!;
			const mil = (d: Row) => `${(d.pop65 / 1e6).toFixed(1)} million`;
			out.textContent = sm
				? `Symbol map. Circle area matches the count, so California’s ${mil(ca)} reads as about ${Math.round(ca.pop65 / az.pop65)} times Arizona’s ${mil(az)}. Big, thinly populated states like Montana get a small circle. In the crowded Northeast the circles overlap.`
				: `Tile grid. Every state gets the same square, so Rhode Island’s ${pct(share(byId.get('44')!))} counts as much as Montana’s ${pct(share(byId.get('30')!))}. You lose the familiar shapes and have to read the labels to find a state.`;
		}

		const sel = select(
			row,
			'Show',
			[
				{ value: 'symbol', label: 'Symbol map: number of people 65+' },
				{ value: 'tile', label: 'Tile grid: share of people 65+' },
			],
			draw,
			'symbol',
		);
		if (narrow) sel.style.maxWidth = `${W - 56}px`;
		draw('symbol');
		dataTable(
			el,
			[
				{ label: 'State', value: (d: Row) => d.name },
				{ label: 'People 65+', value: (d) => fmt.int(d.pop65), numeric: true },
				{ label: 'Share 65+', value: (d) => pct(share(d)), numeric: true },
			],
			[...people].sort((a, b) => a.name.localeCompare(b.name)),
		);
	},
};

export default figure;
