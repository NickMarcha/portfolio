import * as d3 from 'd3';
import { dataTable, gridY, isNarrow, styleAxis, svg, v, viridis, SERIES, type Figure } from './lib';
import raw from './data/penguins.json';

type Penguin = { species: string; island: string; flipper_length_mm: number | null; body_mass_g: number | null };
const ROWS = raw as Penguin[];
const SPECIES = ['Adelie', 'Chinstrap', 'Gentoo'];
const ISLANDS = ['Biscoe', 'Dream', 'Torgersen'];
const SHAPES = [d3.symbolCircle, d3.symbolSquare, d3.symbolTriangle];

function panel(grid: HTMLElement, name: string, mark: string, channels: string) {
	const cell = document.createElement('div');
	const h = document.createElement('p');
	h.style.cssText = 'margin: 0 0 4px; font-size: 14px; line-height: 1.35;';
	const b = document.createElement('strong');
	b.textContent = name;
	h.append(b, document.createElement('br'), `Mark: ${mark}. Channels: ${channels}.`);
	cell.append(h);
	grid.append(cell);
	return cell;
}

const figure: Figure = {
	title: 'One table, three charts',
	caption:
		'The same Palmer Penguins table drawn three ways. Each chart is a choice of mark (point, line, area) and of the channels that carry the columns.',
	credit: 'Data: Palmer Penguins, Horst, Hill and Gorman 2020 (CC0).',
	mount(el) {
		const grid = document.createElement('div');
		grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 16px 24px;';
		el.append(grid);
		// Phone layout: the panels already stack; size each SVG to the body so text stays 12-13px.
		const W = isNarrow(el) ? el.clientWidth : 320;
		const H = 240;

		// Scatterplot
		{
			const pts = ROWS.filter((r) => r.flipper_length_mm != null && r.body_mass_g != null);
			const cell = panel(grid, 'Scatterplot', 'point', 'horizontal position (flipper length), vertical position (body mass), color and shape (species)');
			const m = { top: 10, right: 12, bottom: 34, left: 44 };
			const iw = W - m.left - m.right;
			const ih = H - m.top - m.bottom;
			const root = svg(cell, W, H, `Scatterplot of body mass against flipper length for ${pts.length} penguins, by species.`);
			const g = root.append('g').attr('transform', `translate(${m.left},${m.top})`);
			const x = d3.scaleLinear().domain([170, 235]).range([0, iw]);
			const y = d3.scaleLinear().domain([2500, 6500]).range([ih, 0]);
			gridY(g.append('g'), y, iw, 4);
			styleAxis(g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).ticks(4)));
			styleAxis(g.append('g').call(d3.axisLeft(y).ticks(4).tickFormat((d) => `${(d as number) / 1000}k`)));
			g.append('text').attr('x', iw).attr('y', ih + 30).attr('text-anchor', 'end').style('fill', v('muted')).style('font-size', '12px').text('flipper length, mm');
			g.append('text').attr('x', 4).attr('y', 6).style('fill', v('muted')).style('font-size', '12px').text('body mass, g');
			g.append('g')
				.selectAll('path')
				.data(pts)
				.join('path')
				.attr('transform', (d) => `translate(${x(d.flipper_length_mm!)},${y(d.body_mass_g!)})`)
				.attr('d', (d) => d3.symbol(SHAPES[SPECIES.indexOf(d.species)], 40)()!)
				.style('fill', (d) => SERIES[SPECIES.indexOf(d.species)])
				.style('fill-opacity', 0.75);
			// Direct labels near each cluster.
			const lab = [
				{ s: 'Adelie', x: 176, y: 4800 },
				{ s: 'Chinstrap', x: 199, y: 2950 },
				{ s: 'Gentoo', x: 193, y: 6050 },
			];
			g.append('g')
				.selectAll('text')
				.data(lab)
				.join('text')
				.attr('x', (d) => x(d.x))
				.attr('y', (d) => y(d.y))
				.style('fill', v('ink'))
				.style('font-size', '13px')
				.style('font-weight', '700')
				.text((d) => d.s);
		}

		const counts = d3.rollup(ROWS, (r) => r.length, (r) => r.species);
		const cross = d3.rollup(ROWS, (r) => r.length, (r) => r.species, (r) => r.island);

		// Bar chart
		{
			const cell = panel(grid, 'Bar chart', 'line', 'length (number of penguins), vertical position (species)');
			const m = { top: 10, right: 40, bottom: 34, left: 76 };
			const iw = W - m.left - m.right;
			const ih = H - m.top - m.bottom;
			const root = svg(cell, W, H, 'Bar chart of the number of penguins per species.');
			const g = root.append('g').attr('transform', `translate(${m.left},${m.top})`);
			const x = d3.scaleLinear().domain([0, 160]).range([0, iw]);
			const y = d3.scaleBand().domain(SPECIES).range([0, ih]).padding(0.3);
			styleAxis(g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).ticks(4)));
			styleAxis(g.append('g').call(d3.axisLeft(y).tickSize(0)))
				.selectAll('.tick text')
				.style('fill', v('ink'))
				.style('font-size', '13px');
			g.selectAll('rect.bar')
				.data(SPECIES)
				.join('rect')
				.attr('class', 'bar')
				.attr('x', 0)
				.attr('y', (d) => y(d)!)
				.attr('height', y.bandwidth())
				.attr('width', (d) => x(counts.get(d) ?? 0))
				.attr('rx', 2)
				.style('fill', v('series-1'));
			g.selectAll('text.val')
				.data(SPECIES)
				.join('text')
				.attr('class', 'val')
				.attr('x', (d) => x(counts.get(d) ?? 0) + 6)
				.attr('y', (d) => y(d)! + y.bandwidth() / 2 + 5)
				.style('fill', v('ink'))
				.style('font-size', '13px')
				.text((d) => counts.get(d) ?? 0);
		}

		// Heatmap
		{
			const cell = panel(grid, 'Heatmap', 'area', 'color (number of penguins), horizontal and vertical position (island and species)');
			const m = { top: 10, right: 12, bottom: 30, left: 76 };
			const iw = W - m.left - m.right;
			const ih = H - m.top - m.bottom;
			const root = svg(cell, W, H, 'Heatmap of the number of penguins per species and island.');
			const g = root.append('g').attr('transform', `translate(${m.left},${m.top})`);
			const x = d3.scaleBand().domain(ISLANDS).range([0, iw]).padding(0.04);
			const y = d3.scaleBand().domain(SPECIES).range([0, ih]).padding(0.04);
			const max = d3.max([...cross.values()].flatMap((mm) => [...mm.values()]))!;
			const cells = SPECIES.flatMap((s) => ISLANDS.map((i) => ({ s, i, n: cross.get(s)?.get(i) ?? 0 })));
			styleAxis(g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).tickSize(0)))
				.selectAll('.tick text')
				.style('fill', v('ink'))
				.style('font-size', '13px')
				.attr('dy', '1.1em');
			styleAxis(g.append('g').call(d3.axisLeft(y).tickSize(0)))
				.selectAll('.tick text')
				.style('fill', v('ink'))
				.style('font-size', '13px');
			g.selectAll('.domain').remove();
			g.selectAll('rect')
				.data(cells)
				.join('rect')
				.attr('x', (d) => x(d.i)!)
				.attr('y', (d) => y(d.s)!)
				.attr('width', x.bandwidth())
				.attr('height', y.bandwidth())
				.attr('rx', 2)
				.style('fill', (d) => viridis(d.n / max));
			// Value labels: dark text on the light end of viridis, white on the dark end.
			g.selectAll('text.val')
				.data(cells)
				.join('text')
				.attr('class', 'val')
				.attr('x', (d) => x(d.i)! + x.bandwidth() / 2)
				.attr('y', (d) => y(d.s)! + y.bandwidth() / 2 + 5)
				.attr('text-anchor', 'middle')
				.style('fill', (d) => (d.n / max > 0.55 ? '#111' : '#fff'))
				.style('font-size', '14px')
				.text((d) => d.n);
		}

		dataTable(
			el,
			[
				{ label: 'Species', value: (d) => d.s },
				{ label: 'Island', value: (d) => d.i },
				{ label: 'Penguins', value: (d) => d.n, numeric: true },
			],
			SPECIES.flatMap((s) => ISLANDS.map((i) => ({ s, i, n: cross.get(s)?.get(i) ?? 0 }))),
			'Show the counts',
		);
	},
};

export default figure;
