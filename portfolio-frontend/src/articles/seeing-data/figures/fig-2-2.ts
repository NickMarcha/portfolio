import * as d3 from 'd3';
import world from 'world-atlas/countries-110m.json';
import { controls, dataTable, fmt, isNarrow, readout, select, styleAxis, svg, v, viridis, type Figure } from './lib';
import raw from './data/2-2-sunshine.json';

type City = { country: string; city: string; year: number };
const CITIES = raw as City[];

// Country names in the sunshine table that differ from the Natural Earth map names.
// Same list as in the exercise notebook.
const ALIAS: Record<string, string> = {
	'United States': 'United States of America',
	'Democratic Republic of the Congo': 'Dem. Rep. Congo',
	'Central African Republic': 'Central African Rep.',
	'Equatorial Guinea': 'Eq. Guinea',
	'Falkland Islands': 'Falkland Is.',
	'Solomon Islands': 'Solomon Is.',
	'Bosnia and Herzegovina': 'Bosnia and Herz.',
	'Czech Republic': 'Czechia',
	'Ivory Coast': "Côte d'Ivoire",
	'North Macedonia': 'Macedonia',
	'South Sudan': 'S. Sudan',
	'United ArabEmirates': 'United Arab Emirates',
};

// Minimal TopoJSON -> GeoJSON for the world-atlas file (quantized arcs, polygons only).
// Local instead of topojson-client, which has no types and wasn't in the dev bundle.
type Topo = {
	transform: { scale: [number, number]; translate: [number, number] };
	arcs: [number, number][][];
	objects: { countries: { geometries: { type: string; arcs: number[][] | number[][][]; properties: { name: string } }[] } };
};
function toGeo(topo: Topo): GeoJSON.FeatureCollection {
	const { scale, translate } = topo.transform;
	const arcs = topo.arcs.map((arc) => {
		let x = 0;
		let y = 0;
		return arc.map(([dx, dy]) => [(x += dx) * scale[0] + translate[0], (y += dy) * scale[1] + translate[1]]);
	});
	const ring = (ids: number[]) =>
		ids.flatMap((i, k) => {
			const a = i < 0 ? [...arcs[~i]].reverse() : arcs[i];
			return k ? a.slice(1) : a;
		});
	const features = topo.objects.countries.geometries.map((g) => ({
		type: 'Feature' as const,
		properties: g.properties,
		geometry:
			g.type === 'Polygon'
				? { type: 'Polygon' as const, coordinates: (g.arcs as number[][]).map(ring) }
				: { type: 'MultiPolygon' as const, coordinates: (g.arcs as number[][][]).map((p) => p.map(ring)) },
	}));
	return { type: 'FeatureCollection', features };
}

type Country = { name: string; mapName: string; n: number; lastCity: string; last: number; mean: number };

function byCountry(): Country[] {
	return d3
		.groups(CITIES, (c) => c.country)
		.map(([name, cs]) => ({
			name,
			mapName: ALIAS[name] ?? name,
			n: cs.length,
			// The original bug: a Map keyed by country, filled row by row, keeps the last row.
			lastCity: cs[cs.length - 1].city,
			last: cs[cs.length - 1].year,
			mean: d3.mean(cs, (c) => c.year)!,
		}));
}

type Mode = 'last' | 'mean';

const figure: Figure = {
	title: 'Sunshine by country, two ways',
	caption:
		'Hours of sunshine a year, with each country colored by the last city in the spreadsheet or by the average of its cities. The strip below shows all 54 US cities.',
	credit:
		'Data: Wikipedia, List of cities by sunshine duration, via Prasert Kanawattanachai on Kaggle (CC BY-SA 4.0). Map: Natural Earth via world-atlas (public domain). My own exercise, redrawn.',
	mount(el) {
		const countries = byCountry();
		const byMap = new Map(countries.map((c) => [c.mapName, c]));
		const us = countries.find((c) => c.name === 'United States')!;
		const usCities = CITIES.filter((c) => c.country === 'United States');

		const narrow = isNarrow(el);
		const row = controls(el);

		// ---- Map. Phone layout: as wide as the body, map height from the projection's aspect.
		const W = narrow ? el.clientWidth : 680;
		const H = narrow ? Math.round(W / 2.05) + 50 : 360;
		const geo = toGeo(world as unknown as Topo);
		geo.features = geo.features.filter((f) => f.properties?.name !== 'Antarctica');
		const projection = d3.geoEqualEarth().fitExtent(
			[
				[4, 4],
				[W - 4, H - 50],
			],
			geo,
		);
		const path = d3.geoPath(projection);
		const root = svg(el, W, H, 'World map of yearly sunshine hours by country.');
		const shapes = root
			.append('g')
			.selectAll('path')
			.data(geo.features)
			.join('path')
			.attr('d', path)
			.style('stroke', v('surface'))
			.style('stroke-width', 0.5);

		const extent = [1000, 4100];
		const color = (h: number) => viridis((h - extent[0]) / (extent[1] - extent[0]));

		// Legend: gradient bar plus a "no data" swatch.
		const lgW = narrow ? W - 44 : 260;
		const lg = root.append('g').attr('transform', `translate(${narrow ? 22 : W / 2 - 180},${H - 34})`);
		const grad = root.append('defs').append('linearGradient').attr('id', 'fig22-grad');
		for (let i = 0; i <= 10; i++)
			grad.append('stop').attr('offset', `${i * 10}%`).attr('stop-color', viridis(i / 10));
		lg.append('rect').attr('width', lgW).attr('height', 10).attr('fill', 'url(#fig22-grad)');
		const lx = d3.scaleLinear().domain(extent).range([0, lgW]);
		styleAxis(
			lg.append('g')
				.attr('transform', 'translate(0,10)')
				.call(d3.axisBottom(lx).tickValues([1000, 2000, 3000, 4000]).tickFormat((d) => fmt.int(d as number)).tickSize(4)),
		).select('.domain').remove();
		lg.append('text').attr('x', 0).attr('y', -6).style('fill', v('muted')).style('font-size', '12px').text('Sunshine, hours per year');
		lg.append('rect').attr('x', narrow ? lgW - 60 : lgW + 30).attr('y', narrow ? -16 : 0).attr('width', 14).attr('height', 10).style('fill', v('dim'));
		lg.append('text').attr('x', narrow ? lgW - 40 : lgW + 50).attr('y', narrow ? -7 : 9).style('fill', v('muted')).style('font-size', '12px').text('No data');

		// ---- US strip: one dot per city
		const SW = W;
		const sm = narrow ? { left: 12, right: 18 } : { left: 16, right: 16 };
		const sx = d3.scaleLinear().domain([1900, 4200]).range([sm.left, SW - sm.right]);
		// Simple dodge so dots with similar values stack instead of overlapping.
		const r = 4.5;
		const placed: { x: number; y: number }[] = [];
		const stacked = [...usCities]
			.sort((a, b) => a.year - b.year)
			.map((c) => {
				const x = sx(c.year);
				let y = 0;
				while (placed.some((p) => Math.abs(p.x - x) < 2 * r + 1 && Math.abs(p.y - y) < 2 * r + 1)) y += 2 * r + 1;
				placed.push({ x, y });
				return { ...c, x, dy: y };
			});
		// On phones the two labels go on separate lines, so the dots start lower.
		const SH = narrow ? 70 + d3.max(stacked, (d) => d.dy)! + 2 * r + 34 : 130;
		const dots = stacked.map((d) => ({ ...d, y: SH - 34 - d.dy }));
		const strip = svg(el, SW, SH, 'Dot plot of yearly sunshine hours for 54 US cities.');
		strip.style('margin-top', '12px');
		strip.append('text').attr('x', sm.left).attr('y', 16).style('fill', v('ink')).style('font-size', '13px').style('font-weight', '700').text(`The ${usCities.length} US cities in the data`);
		styleAxis(strip.append('g').attr('transform', `translate(0,${SH - 24})`).call(d3.axisBottom(sx).ticks(narrow ? 4 : 6).tickFormat((d) => `${fmt.int(d as number)} h`)));
		strip.append('g')
			.selectAll('circle')
			.data(dots)
			.join('circle')
			.attr('cx', (d) => d.x)
			.attr('cy', (d) => d.y)
			.attr('r', (d) => (d.city === us.lastCity ? r + 1.5 : r))
			.style('fill', (d) => (d.city === us.lastCity ? v('highlight') : v('series-1')))
			.style('stroke', v('surface'));
		const meanX = sx(us.mean);
		strip.append('line').attr('x1', meanX).attr('x2', meanX).attr('y1', narrow ? 48 : 30).attr('y2', SH - 24).style('stroke', v('ink')).style('stroke-width', 2);
		strip.append('text').attr('x', meanX - 6).attr('y', narrow ? 58 : 40).attr('text-anchor', 'end').style('fill', v('ink')).style('font-size', '13px').text(`Average ${fmt.int(Math.round(us.mean))} h`);
		const yuma = dots.find((d) => d.city === us.lastCity)!;
		const yumaY = 40;
		strip.append('line').attr('x1', yuma.x).attr('x2', yuma.x).attr('y1', yumaY + 6).attr('y2', yuma.y - 8).style('stroke', v('muted'));
		strip.append('text').attr('x', yuma.x + 6).attr('y', yumaY).attr('text-anchor', 'end').style('fill', v('ink')).style('font-size', '13px').text(`${us.lastCity}, last in the list: ${fmt.int(Math.round(us.last))} h`);

		const out = readout(el);

		function draw(mode: Mode) {
			shapes
				.style('fill', (f) => {
					const c = byMap.get(f.properties?.name);
					return c ? color(c[mode]) : v('dim');
				})
				.attr('aria-hidden', 'true');
			const moved = countries.filter((c) => Math.abs(c.last - c.mean) >= 300).length;
			out.textContent =
				mode === 'last'
					? `Last city wins: the United States gets ${us.lastCity}’s ${fmt.int(Math.round(us.last))} hours a year.`
					: `Average per country: the United States gets ${fmt.int(Math.round(us.mean))} hours, the mean of its ${us.n} cities. ${moved} countries change by 300 hours or more between the two maps.`;
		}

		select<Mode>(
			row,
			'Color by',
			[
				{ value: 'last', label: 'last city in the list (original)' },
				{ value: 'mean', label: 'average of its cities' },
			],
			draw,
			'last',
		);
		draw('last');

		dataTable(
			el,
			[
				{ label: 'Country', value: (c) => c.name },
				{ label: 'Cities', value: (c) => c.n, numeric: true },
				{ label: 'Last city', value: (c) => c.lastCity },
				{ label: 'Last city, h/yr', value: (c) => fmt.int(Math.round(c.last)), numeric: true },
				{ label: 'Average, h/yr', value: (c) => fmt.int(Math.round(c.mean)), numeric: true },
			],
			[...countries].sort((a, b) => d3.ascending(a.name, b.name)),
		);
	},
};

export default figure;
