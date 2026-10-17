import * as d3 from 'd3';
import { controls, dataTable, fmt, readout, select, slider, styleAxis, svg, v, type Figure } from './lib';
import { blit, densityColor, histogram, MATERIALS, opacityTF, phantom, render, type MaterialKey, type Mode, type Opacities } from './vol-13';

const PRESETS: Record<string, { label: string; op: Opacities }> = {
	layers: { label: 'Skin, bone and spots', op: { skin: 0.25, tissue: 0, bone: 0.12, spots: 0.8 } },
	bone: { label: 'Bone only', op: { skin: 0, tissue: 0, bone: 0.6, spots: 0 } },
	spots: { label: 'Dense spots only', op: { skin: 0, tissue: 0, bone: 0, spots: 0.9 } },
	skin: { label: 'Skin only', op: { skin: 0.6, tissue: 0, bone: 0, spots: 0 } },
	fog: { label: 'Everything faint', op: { skin: 0.05, tissue: 0.02, bone: 0.05, spots: 0.1 } },
};
const BG: [number, number, number] = [0.08, 0.08, 0.08];
const MODES: { value: Mode; label: string }[] = [
	{ value: 'composite', label: 'Composite (uses the transfer function)' },
	{ value: 'mip', label: 'Maximum intensity projection' },
	{ value: 'average', label: 'Average (like an X-ray)' },
];

const figure: Figure = {
	title: 'Editing a transfer function',
	caption:
		'The transfer function decides how opaque each density is. Raise a peak and that material appears, lower it and the ray passes through. Maximum intensity and averaging ignore it altogether.',
	credit: 'Same synthetic phantom as Figure 13.1. Ray casting after Levoy 1988.',
	mount(el) {
		const vol = phantom();
		const op: Opacities = { ...PRESETS.layers.op };
		let mode: Mode = 'composite';
		let yaw = 0.6;

		const row = controls(el);
		const presetSel = select(
			row,
			'Preset',
			[...Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })), { value: 'custom', label: 'Custom' }],
			(k) => {
				if (!PRESETS[k]) return;
				Object.assign(op, PRESETS[k].op);
				for (const mat of MATERIALS) {
					sliders[mat.key].value = String(op[mat.key]);
					sliders[mat.key].dispatchEvent(new Event('sync'));
				}
				update();
			},
			'layers',
		);
		select(row, 'Compositing', MODES, (m) => {
			mode = m;
			update();
		}, 'composite');

		const grid = document.createElement('div');
		grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;align-items:center;';
		el.append(grid);

		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = 400;
		canvas.style.cssText = 'width:100%;max-width:340px;aspect-ratio:1;display:block;margin:0 auto;border-radius:4px;background:#141414;cursor:grab;touch-action:none;';
		canvas.setAttribute('role', 'img');
		grid.append(canvas);

		// Transfer function editor: histogram of the volume behind, opacity curve on top.
		const right = document.createElement('div');
		grid.append(right);
		const W = 420;
		const H = 260;
		const m = { top: 22, right: 16, bottom: 70, left: 52 };
		const iw = W - m.left - m.right;
		const ih = H - m.top - m.bottom;
		const root = svg(right, W, H, 'Transfer function editor: opacity against density, over a histogram of the volume.');
		const g = root.append('g').attr('transform', `translate(${m.left},${m.top})`);
		const x = d3.scaleLinear().domain([0, 100]).range([0, iw]);
		const y = d3.scaleLinear().domain([0, 1]).range([ih, 0]);
		const bins = histogram(vol);
		const hy = d3
			.scaleLog()
			.domain([1, d3.max(bins, (b) => b.count)!])
			.range([ih, ih * 0.5])
			.clamp(true);
		g.append('g')
			.selectAll('rect')
			.data(bins)
			.join('rect')
			.attr('x', (b) => x(b.x0) + 0.5)
			.attr('width', x(2) - x(0) - 1)
			.attr('y', (b) => hy(Math.max(1, b.count)))
			.attr('height', (b) => ih - hy(Math.max(1, b.count)))
			.style('fill', v('dim'));
		const area = g.append('path').style('fill', v('highlight')).style('fill-opacity', 0.18);
		const line = g.append('path').style('fill', 'none').style('stroke', v('ink')).style('stroke-width', '2px');
		styleAxis(g.append('g').call(d3.axisLeft(y).ticks(4))).selectAll('.tick text').style('font-size', '15px');
		g.append('text')
			.attr('transform', `translate(-40,${ih / 2}) rotate(-90)`)
			.attr('text-anchor', 'middle')
			.style('fill', v('muted'))
			.style('font-size', '15px')
			.text('Opacity');
		// Color ramp under the axis: the color each density gets.
		const grad = root.append('defs').append('linearGradient').attr('id', 'f13-4-grad');
		for (let i = 0; i <= 10; i++) grad.append('stop').attr('offset', `${i * 10}%`).attr('stop-color', densityColor(i * 10));
		g.append('rect').attr('y', ih + 2).attr('width', iw).attr('height', 8).attr('fill', 'url(#f13-4-grad)');
		styleAxis(g.append('g').attr('transform', `translate(0,${ih + 10})`).call(d3.axisBottom(x).ticks(5)))
			.selectAll('.tick text')
			.style('font-size', '15px');
		g.append('text')
			.attr('x', iw / 2)
			.attr('y', ih + 52)
			.attr('text-anchor', 'middle')
			.style('fill', v('muted'))
			.style('font-size', '15px')
			.text('Density (grey: how many voxels have it)');

		const handles = g
			.append('g')
			.selectAll<SVGGElement, (typeof MATERIALS)[number]>('g')
			.data(MATERIALS)
			.join('g')
			.style('cursor', 'ns-resize')
			.call(
				d3.drag<SVGGElement, (typeof MATERIALS)[number]>().on('drag', (event, d) => {
					op[d.key] = Math.round(Math.max(0, Math.min(1, y.invert(event.y))) * 100) / 100;
					sliders[d.key].value = String(op[d.key]);
					sliders[d.key].dispatchEvent(new Event('sync'));
					presetSel.value = 'custom';
					update();
				}),
			);
		handles
			.append('circle')
			.attr('r', 7)
			.style('fill', v('surface'))
			.style('stroke', v('ink'))
			.style('stroke-width', '2px');
		handles
			.append('text')
			.attr('dy', -12)
			.attr('text-anchor', (d) => (d.key === 'spots' ? 'end' : 'middle'))
			.style('fill', v('ink'))
			.style('font-size', '15px')
			.text((d) => d.label);

		// Sliders: the keyboard way to do what dragging the handles does.
		const row2 = controls(right);
		row2.style.marginTop = '8px';
		const sliders = {} as Record<MaterialKey, HTMLInputElement>;
		for (const mat of MATERIALS) {
			const s = slider(row2, mat.label, { min: 0, max: 1, step: 0.01, value: op[mat.key], format: (n) => n.toFixed(2) }, (n) => {
				op[mat.key] = n;
				presetSel.value = 'custom';
				update();
			});
			// Keep the output text in step when the value is set from code.
			s.addEventListener('sync', () => {
				const o = s.parentElement!.querySelector('output')!;
				o.textContent = Number(s.value).toFixed(2);
				s.setAttribute('aria-valuetext', o.textContent);
			});
			sliders[mat.key] = s;
		}
		const turn = slider(
			row,
			'Turn',
			{ min: -180, max: 180, step: 5, value: 35, format: (n) => `${n}°` },
			(n) => {
				yaw = (n * Math.PI) / 180;
				update();
			},
		);

		// Drag on the image to turn it as well.
		let dragX: number | null = null;
		canvas.addEventListener('pointerdown', (e) => {
			dragX = e.clientX;
			canvas.setPointerCapture(e.pointerId);
		});
		canvas.addEventListener('pointermove', (e) => {
			if (dragX === null) return;
			yaw += (e.clientX - dragX) * 0.01;
			dragX = e.clientX;
			const deg = ((((yaw * 180) / Math.PI + 180) % 360) + 360) % 360 - 180;
			turn.value = String(Math.round(deg / 5) * 5);
			turn.dispatchEvent(new Event('input'));
		});
		canvas.addEventListener('pointerup', () => (dragX = null));

		const out = readout(el);
		let frame = 0;

		function update() {
			const tf = opacityTF(op);
			const pts = d3.range(0, 100.5, 0.5).map((d) => [x(d), y(tf(d))] as [number, number]);
			line.attr('d', d3.line()(pts));
			area.attr('d', d3.area().x((p) => p[0]).y0(ih).y1((p) => p[1])(pts));
			handles.attr('transform', (d) => `translate(${x(d.density)},${y(op[d.key])})`);
			const dim = mode !== 'composite';
			line.style('opacity', dim ? 0.3 : 1);
			handles.style('opacity', dim ? 0.3 : 1);
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				const { image, samples } = render(vol, { size: 160, yaw, tf, mode, background: BG });
				blit(canvas, image);
				const shown = MATERIALS.filter((mat) => op[mat.key] > 0).map((mat) => mat.label.toLowerCase());
				canvas.setAttribute('aria-label', `Volume rendering, ${MODES.find((o) => o.value === mode)!.label}.`);
				out.textContent =
					mode === 'composite'
						? `Visible: ${shown.length ? shown.join(', ') : 'nothing'}. ${fmt.int(samples)} samples taken for 160 × 160 rays; rays stop early once a pixel is 98% opaque.`
						: `${mode === 'mip' ? 'Each pixel shows the densest sample on its ray, so the dense spots stand out through everything.' : 'Each pixel shows the mean density along its ray.'} The transfer function plays no part here.`;
			});
		}
		update();
		dataTable(
			el,
			[
				{ label: 'Material', value: (d) => d.label },
				{ label: 'Density', value: (d) => d.density, numeric: true },
				{ label: 'Voxels near it (±5)', value: (d) => d3.sum(vol.data, (x) => (Math.abs(x - d.density) <= 5 ? 1 : 0)), numeric: true },
			],
			[...MATERIALS],
		);
		return () => cancelAnimationFrame(frame);
	},
};

export default figure;
