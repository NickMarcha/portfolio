'use client';

import * as React from 'react';
import {
	drag as d3Drag,
	geoDistance,
	geoGraticule,
	geoOrthographic,
	geoPath,
	interpolateRgb,
	scaleLinear,
	scaleSequential,
	extent,
	select,
	type GeoOrthographicProjection,
} from 'd3';
import { feature } from 'topojson-client';

import worldAtlas from 'world-atlas/countries-110m.json';

import type { Visit } from '@/lib/adminVisit';
import { aggregateVisitsToPoints, clusterInScreenSpace, type GeoPoint } from '@/lib/visitsGeo';

const topology = worldAtlas as {
	type: string;
	objects: { countries: { type: string; geometries: unknown[] } };
	arcs: unknown[];
};

const landFeature = feature(topology as Parameters<typeof feature>[0], topology.objects.countries);

const BASE_SCALE_DIV = 4.2;
const MIN_SCALE_MULT = 0.55;
const MAX_SCALE_MULT = 2.8;
const COLOR_LOW = '#e8e4e0';
const COLOR_HIGH = '#6b4540';

function pointOnFrontHemisphere(
	projection: GeoOrthographicProjection,
	lon: number,
	lat: number,
	cx: number,
	cy: number
): boolean {
	const inv = projection.invert?.([cx, cy]);
	if (!inv) return false;
	const d = geoDistance([lon, lat], inv as [number, number]);
	return d < Math.PI / 2 + 1e-3;
}

export default function AdminVisitGlobe(_props: { visits: Visit[] }) {
	const wrapRef = React.useRef<HTMLDivElement>(null);
	const svgRef = React.useRef<SVGSVGElement>(null);
	const projectionRef = React.useRef<GeoOrthographicProjection | null>(null);
	const baseScaleRef = React.useRef(200);
	const sizeRef = React.useRef({ width: 400, height: 360 });
	const pointsRef = React.useRef<GeoPoint[]>([]);
	const rafRef = React.useRef(0);

	const points = React.useMemo(() => aggregateVisitsToPoints(_props.visits), [_props.visits]);
	pointsRef.current = points;

	const renderGlobe = React.useCallback(() => {
		const svgEl = svgRef.current;
		const projection = projectionRef.current;
		if (!svgEl || !projection) return;

		const svg = select(svgEl);
		const { width, height } = sizeRef.current;
		const cx = width / 2;
		const cy = height / 2;
		const path = geoPath(projection);

		svg
			.select<SVGCircleElement>('circle.globe-ocean')
			.attr('r', projection.scale())
			.attr('cx', cx)
			.attr('cy', cy);

		const graticule = geoGraticule();
		svg
			.select<SVGPathElement>('path.globe-graticule')
			.attr('d', path(graticule()) ?? '');

		svg.select<SVGPathElement>('path.globe-land').attr('d', path(landFeature) ?? '');

		const cellPx = Math.max(16, Math.min(46, 3400 / projection.scale()));
		const pts = pointsRef.current;

		const project = (lon: number, lat: number): [number, number] | null => {
			if (!pointOnFrontHemisphere(projection, lon, lat, cx, cy)) return null;
			const p = projection([lon, lat]);
			if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return null;
			return p as [number, number];
		};

		const clusters = clusterInScreenSpace(pts, project, cellPx);
		const counts = clusters.map((c) => c.count);
		const [cMin, cMax] =
			counts.length > 0 ? (extent(counts) as [number, number]) : ([1, 1] as [number, number]);
		const hi = Math.max(cMax, cMin + 1e-6);
		const colorScale = scaleSequential(interpolateRgb(COLOR_LOW, COLOR_HIGH)).domain([cMin, hi]);
		const rScale = scaleLinear().domain([cMin, hi]).range([3, 12]);

		const gDots = svg.select<SVGGElement>('g.globe-dots');
		const circles = gDots
			.selectAll<SVGCircleElement, (typeof clusters)[0]>('circle')
			.data(clusters, (d) => `${d.x.toFixed(1)},${d.y.toFixed(1)},${d.count}`)
			.join(
				(enter) =>
					enter
						.append('circle')
						.attr('stroke', 'var(--border)')
						.attr('stroke-width', 0.5),
				(update) => update,
				(exit) => exit.remove()
			)
			.attr('cx', (d) => d.x)
			.attr('cy', (d) => d.y)
			.attr('r', (d) => rScale(d.count) ?? 3)
			.attr('fill', (d) => colorScale(d.count));

		circles.each(function (d) {
			const node = select(this);
			node.selectAll('title').remove();
			node
				.append('title')
				.text(`${d.count} visit(s) · ${d.lat.toFixed(2)}, ${d.lon.toFixed(2)}`);
		});
	}, []);

	const scheduleRender = React.useCallback(() => {
		if (rafRef.current) cancelAnimationFrame(rafRef.current);
		rafRef.current = requestAnimationFrame(() => {
			rafRef.current = 0;
			renderGlobe();
		});
	}, [renderGlobe]);

	React.useEffect(() => {
		const svgEl = svgRef.current;
		const wrap = wrapRef.current;
		if (!svgEl || !wrap) return;

		const svg = select(svgEl);
		svg.selectAll('*').remove();

		const width = wrap.clientWidth;
		const height = Math.min(520, Math.max(280, width * 0.6));
		sizeRef.current = { width, height };

		const projection = geoOrthographic()
			.rotate([0, -15, 0])
			.translate([width / 2, height / 2])
			.clipAngle(90);

		const baseScale = (width / BASE_SCALE_DIV + height / BASE_SCALE_DIV) / 2;
		baseScaleRef.current = baseScale;
		projection.scale(baseScale);
		projectionRef.current = projection;

		svg
			.attr('width', width)
			.attr('height', height)
			.attr('class', 'touch-none select-none');

		svg
			.append('circle')
			.attr('class', 'globe-ocean')
			.attr('cx', width / 2)
			.attr('cy', height / 2)
			.attr('r', projection.scale())
			.attr('fill', 'var(--background)');

		svg
			.append('path')
			.attr('class', 'globe-graticule')
			.attr('fill', 'none')
			.attr('stroke', 'var(--border)')
			.attr('stroke-width', 0.35)
			.attr('opacity', 0.35);

		svg
			.append('path')
			.attr('class', 'globe-land')
			.attr('fill', 'var(--card)')
			.attr('stroke', 'var(--border)')
			.attr('stroke-width', 0.4);

		svg.append('g').attr('class', 'globe-dots');

		const sensitivity = 0.5;
		const dragBehavior = d3Drag<SVGSVGElement, unknown>().on('drag', (event) => {
			const proj = projectionRef.current;
			if (!proj) return;
			const rot = proj.rotate();
			proj.rotate([
				rot[0] + event.dx * sensitivity,
				Math.max(-60, Math.min(60, rot[1] - event.dy * sensitivity)),
				rot[2],
			]);
			scheduleRender();
		});

		svg.call(dragBehavior);

		svg.on('wheel', (ev) => {
			ev.preventDefault();
			const proj = projectionRef.current;
			if (!proj) return;
			const dir = (ev as WheelEvent).deltaY > 0 ? -1 : 1;
			const next = proj.scale() * (1 + dir * 0.12);
			const lo = baseScaleRef.current * MIN_SCALE_MULT;
			const hi = baseScaleRef.current * MAX_SCALE_MULT;
			proj.scale(Math.max(lo, Math.min(hi, next)));
			scheduleRender();
		});

		scheduleRender();

		const ro = new ResizeObserver(() => {
			const w = wrap.clientWidth;
			const h = Math.min(520, Math.max(280, w * 0.6));
			sizeRef.current = { width: w, height: h };
			svg.attr('width', w).attr('height', h);
			const proj = projectionRef.current;
			if (proj) {
				const prevBase = baseScaleRef.current;
				const bs = (w / BASE_SCALE_DIV + h / BASE_SCALE_DIV) / 2;
				const ratio = prevBase > 0 ? proj.scale() / prevBase : 1;
				baseScaleRef.current = bs;
				proj.scale(Math.max(bs * MIN_SCALE_MULT, Math.min(bs * MAX_SCALE_MULT, bs * ratio)));
				proj.translate([w / 2, h / 2]);
			}
			scheduleRender();
		});

		ro.observe(wrap);

		return () => {
			ro.disconnect();
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
			projectionRef.current = null;
			svg.on('wheel', null);
		};
	}, [scheduleRender]);

	React.useEffect(() => {
		pointsRef.current = points;
		scheduleRender();
	}, [points, scheduleRender]);

	return (
		<div
			ref={wrapRef}
			className="rounded-md border border-border bg-card p-4 w-full"
			role="region"
			aria-label="Visit globe"
		>
			<p className="text-sm text-muted-foreground mb-3">
				Drag to rotate, scroll to zoom. Markers cluster when close on screen; size and color show visit
				count.
			</p>
			<div className="flex justify-center overflow-hidden">
				<svg ref={svgRef} />
			</div>
			{points.length === 0 && (
				<p className="text-sm text-muted-foreground mt-2 text-center">
					No coordinates yet. Enrich visits or wait for new visits after geolocation is stored.
				</p>
			)}
		</div>
	);
}

