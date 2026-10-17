import * as d3 from 'd3';
import world from 'world-atlas/countries-110m.json';
import { controls, dataTable, isNarrow, readout, select, svg, v, type Figure } from './lib';

type Key = 'mercator' | 'equalEarth' | 'albers' | 'azimuthal';

// ISO 3166 numeric codes of African countries in Natural Earth 110m (Somaliland has no code, matched by name).
const AFRICA = new Set(
	'012 024 204 072 854 108 120 140 148 178 180 384 262 818 226 232 231 266 270 288 324 624 404 426 430 434 450 454 466 478 504 508 516 562 566 646 686 694 706 710 728 729 748 834 768 788 800 732 894 716'.split(
		' ',
	),
);
const GREENLAND = '304';

// Minimal TopoJSON -> GeoJSON for polygons (topojson-client has no types here and isn't pre-bundled by the dev server).
interface Topo {
	transform?: { scale: number[]; translate: number[] };
	arcs: number[][][];
}
interface TopoGeom {
	type: string;
	id?: string | number;
	arcs?: number[][] | number[][][];
	properties?: Record<string, unknown>;
}
function topoFeatures(topo: Topo, geoms: TopoGeom[]): GeoJSON.Feature<GeoJSON.Geometry, { name: string }>[] {
	const [sx, sy] = topo.transform?.scale ?? [1, 1];
	const [tx, ty] = topo.transform?.translate ?? [0, 0];
	const arcs = topo.arcs.map((a) => {
		let x = 0;
		let y = 0;
		return a.map(([dx, dy]) => {
			x += topo.transform ? dx : dx - x;
			y += topo.transform ? dy : dy - y;
			return [x * sx + tx, y * sy + ty];
		});
	});
	const ring = (ids: number[]) => {
		const pts: number[][] = [];
		for (const i of ids) {
			const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
			pts.push(...(pts.length ? a.slice(1) : a));
		}
		return pts;
	};
	return geoms.map((g) => ({
		type: 'Feature',
		id: g.id,
		properties: (g.properties ?? {}) as { name: string },
		geometry:
			g.type === 'Polygon'
				? { type: 'Polygon', coordinates: (g.arcs as number[][]).map(ring) }
				: { type: 'MultiPolygon', coordinates: (g.arcs as number[][][]).map((p) => p.map(ring)) },
	}));
}

const INFO: Record<Key, { label: string; keeps: string; loses: string }> = {
	mercator: {
		label: 'Mercator (cylindrical)',
		keeps: 'Keeps local shapes and compass bearings: the circles stay round.',
		loses: 'Area swells towards the poles, so the circles grow.',
	},
	equalEarth: {
		label: 'Equal Earth (equal-area)',
		keeps: 'Keeps area: every circle covers the same area.',
		loses: 'Shapes stretch towards the edges, so the circles become ellipses.',
	},
	albers: {
		label: 'Albers (conic, equal-area)',
		keeps: 'Keeps area, with shapes nearly right between 20° N and 50° N.',
		loses: 'Shapes shear further from those two parallels, worst in the south.',
	},
	azimuthal: {
		label: 'Azimuthal equidistant, centred on Bergen',
		keeps: 'Keeps distances and directions from Bergen, at the centre.',
		loses: 'Everything else: far from the centre, circles grow and stretch.',
	},
};

const figure: Figure = {
	title: 'Four ways to flatten the world',
	caption:
		'The same countries and the same small circles, all 500 km across on the globe, under four projections. On Mercator, Greenland rivals Africa.',
	credit: 'Map data: Natural Earth via world-atlas (public domain). Distortion circles: Tissot’s indicatrix. Projections: d3-geo.',
	mount(el) {
		const narrow = isNarrow(el);
		// Phones: a 1:1 viewBox, zoomed onto the Atlantic so Greenland, Africa and the circles stay legible.
		const W = narrow ? el.clientWidth : 680;
		const H = narrow ? Math.round(W * 1.05) : 420;
		const ZOOM = 1.8;
		const countries = topoFeatures(
			world as unknown as Topo,
			world.objects.countries.geometries as TopoGeom[],
		);
		const isAfrica = (f: (typeof countries)[number]) =>
			AFRICA.has(String(f.id)) || f.properties.name === 'Somaliland';
		const africa = countries.filter(isAfrica);
		const greenland = countries.filter((f) => String(f.id) === GREENLAND);
		const sphere: d3.GeoSphere = { type: 'Sphere' };
		const graticule = d3.geoGraticule10();

		// Circles of radius 2.25° (about 250 km) on a 30° grid.
		const circles: GeoJSON.Polygon[] = [];
		for (const lat of [-60, -30, 0, 30, 60, 75])
			for (let lon = -165; lon < 180; lon += 30) circles.push(d3.geoCircle().center([lon, lat]).radius(2.25)());

		const trueRatio =
			d3.sum(greenland, (f) => d3.geoArea(f)) / d3.sum(africa, (f) => d3.geoArea(f));

		function make(key: Key): d3.GeoProjection {
			if (!narrow) return makeAt(key, W, H);
			const p = makeAt(key, W * ZOOM, Math.round((W * ZOOM * 420) / 680));
			const c = p(key === 'azimuthal' ? [-10, 45] : [-15, key === 'equalEarth' ? 0 : 30])!;
			const t = p.translate();
			// Mercator keeps its top edge at 80° N, as on the desktop map.
			const dy = key === 'mercator' ? -p([0, 80])![1] : H / 2 - c[1];
			return p.translate([t[0] + W / 2 - c[0], t[1] + dy]).clipExtent([
				[0, 0],
				[W, H],
			]);
		}

		function makeAt(key: Key, W: number, H: number): d3.GeoProjection {
			if (key === 'mercator') {
				// Mercator never reaches the poles: show the full width and cut it at 80° N.
				const p = d3.geoMercator().scale(W / (2 * Math.PI)).translate([W / 2, 0]);
				return p.translate([W / 2, -p([0, 80])![1]]).clipExtent([
					[0, 0],
					[W, H],
				]);
			}
			const p =
				key === 'equalEarth'
					? d3.geoEqualEarth()
					: key === 'albers'
						? d3.geoConicEqualArea().parallels([20, 50]).rotate([-10, 0])
						: d3.geoAzimuthalEquidistant().rotate([-5.3, -60.4]);
			return p.fitExtent(
				[
					[4, 4],
					[W - 4, H - 4],
				],
				sphere,
			);
		}

		const row = controls(el);
		const root = svg(
			el,
			W,
			H,
			'World map with a grid of equal-sized circles, Greenland and Africa highlighted, under a chosen map projection.',
		);
		const out = readout(el);
		const sphereP = root.append('path').style('fill', 'none').style('stroke', v('axis'));
		const gratP = root.append('path').style('fill', 'none').style('stroke', v('grid'));
		const landG = root.append('g');
		const circleG = root.append('g');
		const labelG = root.append('g').style('pointer-events', 'none');

		const ratios = {} as Record<Key, number>;
		for (const k of Object.keys(INFO) as Key[]) {
			// Measured on the whole-world projection, so the phone crop can't cut the shapes.
			const path = d3.geoPath(makeAt(k, 680, 420));
			ratios[k] = d3.sum(greenland, (f) => path.area(f)) / d3.sum(africa, (f) => path.area(f));
		}

		function draw(key: Key) {
			const proj = make(key);
			const path = d3.geoPath(proj);
			sphereP.attr('d', key === 'mercator' ? `M0,0H${W}V${H}H0Z` : path(sphere));
			gratP.attr('d', path(graticule));
			landG
				.selectAll('path')
				.data(countries)
				.join('path')
				.attr('d', (d) => path(d))
				.style('fill', (d) => (isAfrica(d) || String(d.id) === GREENLAND ? v('series-1') : v('dim')))
				.style('stroke', v('surface'))
				.style('stroke-width', 0.5);
			circleG
				.selectAll('path')
				.data(circles)
				.join('path')
				.attr('d', (d) => path(d))
				.style('fill', v('highlight'))
				.style('fill-opacity', 0.55)
				.style('stroke', v('highlight'))
				.style('stroke-width', 1);
			const labels = [
				// Greenland is small on the equal-area maps, so its label sits beside it there.
				key === 'mercator'
					? { text: 'Greenland', at: proj([-40, 67]), anchor: 'middle' }
					: { text: 'Greenland', at: proj([-60, 66]), anchor: 'end' },
				{ text: 'Africa', at: proj([18, 2]), anchor: 'middle' },
			].filter((d) => d.at && d.at[0] > 0 && d.at[0] < W && d.at[1] > 0 && d.at[1] < H);
			labelG
				.selectAll('text')
				.data(labels)
				.join('text')
				.attr('x', (d) => d.at![0])
				.attr('y', (d) => d.at![1])
				.attr('text-anchor', (d) => d.anchor)
				.attr('dy', '0.35em')
				.style('fill', v('ink'))
				.style('font-size', '14px')
				.style('font-weight', '600')
				.style('paint-order', 'stroke')
				.style('stroke', v('surface'))
				.style('stroke-width', 3)
				.text((d) => d.text);
			const info = INFO[key];
			out.textContent = `${info.keeps} ${info.loses} Greenland is drawn ${Math.round(
				ratios[key] * 100,
			)}% the size of Africa; on the globe it is ${Math.round(trueRatio * 100)}%.`;
		}

		const sel = select(
			row,
			'Projection',
			(Object.keys(INFO) as Key[]).map((k) => ({ value: k, label: INFO[k].label })),
			draw,
			'mercator',
		);
		if (narrow) sel.style.maxWidth = `${W - 90}px`;
		draw('mercator');
		dataTable(
			el,
			[
				{ label: 'Projection', value: (k: Key) => INFO[k].label },
				{ label: 'Keeps', value: (k) => INFO[k].keeps },
				{ label: 'Greenland as % of Africa, drawn', value: (k) => `${Math.round(ratios[k] * 100)}%`, numeric: true },
			],
			[...(Object.keys(INFO) as Key[])],
		);
	},
};

export default figure;
