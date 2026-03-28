'use client';

import * as React from 'react';
import {
	arc as d3Arc,
	axisBottom,
	axisLeft,
	pie as d3Pie,
	scaleBand,
	scaleLinear,
	scaleOrdinal,
	select,
} from 'd3';
import type { Visit } from '@/lib/adminVisit';

const BAR_TOP = 15;
const PIE_TOP = 8;
const CHART_MUTED = [
	'#6b5c52',
	'#5a6d5c',
	'#6d6470',
	'#6b6560',
	'#5c5c5a',
	'#6a5f52',
	'#556b6b',
	'#5d6b5c',
	'#665c58',
	'#566064',
	'#625956',
	'#536059',
	'#5e5a62',
	'#546454',
	'#605752',
];

function aggregateCounts(
	visits: Visit[],
	dimension: 'country' | 'region'
): { label: string; count: number }[] {
	const map = new Map<string, number>();
	for (const v of visits) {
		const raw = dimension === 'country' ? v.country : v.regionName;
		const label = raw?.trim() || (dimension === 'country' ? '(no country)' : '(no region)');
		map.set(label, (map.get(label) ?? 0) + 1);
	}
	return [...map.entries()]
		.map(([label, count]) => ({ label, count }))
		.sort((a, b) => b.count - a.count);
}

function topNWithOther(
	rows: { label: string; count: number }[],
	top: number
): { label: string; count: number }[] {
	if (rows.length <= top) return rows;
	const head = rows.slice(0, top);
	const restSum = rows.slice(top).reduce((s, r) => s + r.count, 0);
	if (restSum > 0) head.push({ label: 'Other', count: restSum });
	return head;
}

type ChartView = 'bar' | 'pie';

export default function AdminVisitCharts({ visits }: { visits: Visit[] }) {
	const [dimension, setDimension] = React.useState<'country' | 'region'>('country');
	const [chartView, setChartView] = React.useState<ChartView>('bar');
	const barRef = React.useRef<SVGSVGElement>(null);
	const barWrapRef = React.useRef<HTMLDivElement>(null);
	const pieRef = React.useRef<SVGSVGElement>(null);
	const pieWrapRef = React.useRef<HTMLDivElement>(null);
	const [barWidth, setBarWidth] = React.useState(640);
	const [pieWidth, setPieWidth] = React.useState(320);

	const data = React.useMemo(() => {
		const rows = aggregateCounts(visits, dimension);
		return {
			bar: topNWithOther(rows, BAR_TOP),
			pie: topNWithOther(rows, PIE_TOP),
		};
	}, [visits, dimension]);

	React.useEffect(() => {
		const el = barWrapRef.current;
		if (!el) return;
		const ro = new ResizeObserver(() => {
			setBarWidth(Math.max(280, el.clientWidth));
		});
		ro.observe(el);
		setBarWidth(Math.max(280, el.clientWidth));
		return () => ro.disconnect();
	}, []);

	React.useEffect(() => {
		const el = pieWrapRef.current;
		if (!el) return;
		const ro = new ResizeObserver(() => {
			setPieWidth(Math.max(240, Math.min(360, el.clientWidth)));
		});
		ro.observe(el);
		setPieWidth(Math.max(240, Math.min(360, el.clientWidth)));
		return () => ro.disconnect();
	}, []);

	React.useEffect(() => {
		if (chartView !== 'bar' || !barRef.current) return;
		const margin = { top: 8, right: 12, bottom: 72, left: 36 };
		const height = 280;
		const width = barWidth;
		const innerW = width - margin.left - margin.right;
		const innerH = height - margin.top - margin.bottom;

		const svg = select(barRef.current);
		svg.selectAll('*').remove();
		svg.attr('width', width).attr('height', height);

		const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

		const rows = data.bar;
		if (rows.length === 0) return;

		const x = scaleBand()
			.domain(rows.map((d) => d.label))
			.range([0, innerW])
			.padding(0.12);

		const maxC = Math.max(1, ...rows.map((d) => d.count));
		const y = scaleLinear().domain([0, maxC]).nice().range([innerH, 0]);

		const color = scaleOrdinal<string, string>()
			.domain(rows.map((d) => d.label))
			.range(CHART_MUTED);

		g.selectAll('rect')
			.data(rows)
			.join('rect')
			.attr('x', (d) => x(d.label) ?? 0)
			.attr('y', (d) => y(d.count))
			.attr('width', x.bandwidth())
			.attr('height', (d) => innerH - y(d.count))
			.attr('fill', (d) => color(d.label) ?? '#6b5c52')
			.attr('rx', 2);

		const xAxis = g
			.append('g')
			.attr('transform', `translate(0,${innerH})`)
			.call(axisBottom(x).tickSizeOuter(0));

		xAxis
			.selectAll('text')
			.attr('transform', 'rotate(-45)')
			.style('text-anchor', 'end')
			.attr('dx', '-0.5em')
			.attr('dy', '0.15em')
			.attr('class', 'text-[11px] fill-foreground');

		g.append('g')
			.call(axisLeft(y).ticks(5).tickSizeOuter(0))
			.selectAll('text')
			.attr('class', 'text-[11px] fill-muted-foreground');

	}, [chartView, data.bar, barWidth]);

	React.useEffect(() => {
		if (chartView !== 'pie' || !pieRef.current) return;
		const width = pieWidth;
		const height = width;
		const radius = width / 2 - 8;

		const svg = select(pieRef.current);
		svg.selectAll('*').remove();
		svg.attr('width', width).attr('height', height);

		const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

		const rows = data.pie;
		if (rows.length === 0) return;

		const pie = d3Pie<{ label: string; count: number }>()
			.value((d) => d.count)
			.sort(null);

		const arc = d3Arc<import('d3').PieArcDatum<{ label: string; count: number }>>()
			.innerRadius(0)
			.outerRadius(radius);

		const color = scaleOrdinal<string, string>()
			.domain(rows.map((d) => d.label))
			.range(CHART_MUTED);

		g.selectAll('path')
			.data(pie(rows))
			.join('path')
			.attr('d', arc)
			.attr('fill', (d) => color(d.data.label) ?? '#6b5c52')
			.attr('stroke', 'var(--border)')
			.attr('stroke-width', 1);

	}, [chartView, data.pie, pieWidth]);

	return (
		<div className="space-y-3 rounded-md border border-border bg-card p-4">
			<div className="flex flex-wrap items-center gap-3 text-sm">
				<span className="text-muted-foreground">By</span>
				<div className="flex gap-1">
					<button
						type="button"
						className={`rounded-md border px-2 py-1 text-sm transition-colors ${dimension === 'country' ? 'border-foreground bg-accent' : 'border-border hover:bg-accent/50'}`}
						onClick={() => setDimension('country')}
					>
						Country
					</button>
					<button
						type="button"
						className={`rounded-md border px-2 py-1 text-sm transition-colors ${dimension === 'region' ? 'border-foreground bg-accent' : 'border-border hover:bg-accent/50'}`}
						onClick={() => setDimension('region')}
					>
						Region
					</button>
				</div>
				<span className="text-muted-foreground">Chart</span>
				<div className="flex gap-1">
					<button
						type="button"
						className={`rounded-md border px-2 py-1 text-sm transition-colors ${chartView === 'bar' ? 'border-foreground bg-accent' : 'border-border hover:bg-accent/50'}`}
						onClick={() => setChartView('bar')}
					>
						Bar
					</button>
					<button
						type="button"
						className={`rounded-md border px-2 py-1 text-sm transition-colors ${chartView === 'pie' ? 'border-foreground bg-accent' : 'border-border hover:bg-accent/50'}`}
						onClick={() => setChartView('pie')}
					>
						Pie
					</button>
				</div>
			</div>
			{chartView === 'bar' ? (
				<div ref={barWrapRef} className="w-full min-h-[280px] overflow-x-auto">
					{data.bar.length === 0 ? (
						<p className="text-sm text-muted-foreground py-8">No data for this dimension.</p>
					) : (
						<svg ref={barRef} className="block max-w-full" role="img" aria-label="Visit counts bar chart" />
					)}
				</div>
			) : (
				<div ref={pieWrapRef} className="flex justify-center">
					{data.pie.length === 0 ? (
						<p className="text-sm text-muted-foreground py-8">No data for this dimension.</p>
					) : (
						<svg ref={pieRef} role="img" aria-label="Visit counts pie chart" />
					)}
				</div>
			)}
		</div>
	);
}
