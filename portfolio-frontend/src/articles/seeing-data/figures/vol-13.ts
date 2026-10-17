// Shared code for figures 13.1 and 13.4: a synthetic volume and a small CPU ray caster.
// Not a figure itself (the loader only picks up fig-*.ts).
//
// The volume is a made-up "phantom", nested ellipsoids that loosely mimic a head:
// scalp, a bone shell, soft tissue inside, and three dense spots. Densities run 0-100.

import * as d3 from 'd3';
import { rng } from './lib';

export const N = 64;

export const MATERIALS = [
	{ key: 'skin', label: 'Skin', density: 20 },
	{ key: 'tissue', label: 'Soft tissue', density: 40 },
	{ key: 'bone', label: 'Bone', density: 65 },
	{ key: 'spots', label: 'Dense spots', density: 90 },
] as const;
export type MaterialKey = (typeof MATERIALS)[number]['key'];

export interface Volume {
	n: number;
	data: Float32Array;
	/** Normalized gradient (x, y, z) and its magnitude, per voxel. */
	gx: Float32Array;
	gy: Float32Array;
	gz: Float32Array;
	gm: Float32Array;
}

const smooth = (e0: number, e1: number, x: number) => {
	const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
	return t * t * (3 - 2 * t);
};

let cached: Volume | null = null;

/** Builds the phantom once per page and reuses it. */
export function phantom(): Volume {
	if (cached) return cached;
	const n = N;
	const data = new Float32Array(n * n * n);
	// Low-frequency noise on an 8^3 lattice, so the data isn't perfectly clean.
	const r = rng(13);
	const L = 8;
	const lat = Float32Array.from({ length: L * L * L }, () => r() * 2 - 1);
	const noise = (x: number, y: number, z: number) => {
		const fx = ((x + 1) / 2) * (L - 1);
		const fy = ((y + 1) / 2) * (L - 1);
		const fz = ((z + 1) / 2) * (L - 1);
		return tri(lat, L, fx, fy, fz);
	};
	const spots = [
		[0.22, 0.15, 0.1, 0.13],
		[-0.25, -0.05, 0.15, 0.1],
		[0.02, -0.3, -0.2, 0.12],
	];
	for (let k = 0; k < n; k++)
		for (let j = 0; j < n; j++)
			for (let i = 0; i < n; i++) {
				const x = (i / (n - 1)) * 2 - 1;
				const y = (j / (n - 1)) * 2 - 1;
				const z = (k / (n - 1)) * 2 - 1;
				// Ellipsoid "radius": 1 at the outer skin surface.
				const e = Math.hypot(x / 0.78, y / 0.92, z / 0.84);
				// Layers from the outside in: skin, soft tissue, a bone shell, soft tissue again.
				// Neighbouring layers have neighbouring densities, so a boundary doesn't pass
				// through a third material's value.
				let d = 20 * (1 - smooth(0.95, 1.01, e));
				d += 20 * (1 - smooth(0.88, 0.94, e));
				d += 25 * smooth(0.72, 0.78, e) * (1 - smooth(0.83, 0.89, e));
				for (const [cx, cy, cz, rad] of spots) {
					const s = Math.hypot(x - cx, y - cy, z - cz) / rad;
					d += 50 * (1 - smooth(0.75, 1.05, s));
				}
				if (d > 1) d += 1.5 * noise(x, y, z);
				data[i + n * (j + n * k)] = Math.max(0, Math.min(100, d));
			}
	const gx = new Float32Array(n * n * n);
	const gy = new Float32Array(n * n * n);
	const gz = new Float32Array(n * n * n);
	const gm = new Float32Array(n * n * n);
	const at = (i: number, j: number, k: number) =>
		data[Math.min(n - 1, Math.max(0, i)) + n * (Math.min(n - 1, Math.max(0, j)) + n * Math.min(n - 1, Math.max(0, k)))];
	for (let k = 0; k < n; k++)
		for (let j = 0; j < n; j++)
			for (let i = 0; i < n; i++) {
				const a = (at(i + 1, j, k) - at(i - 1, j, k)) / 2;
				const b = (at(i, j + 1, k) - at(i, j - 1, k)) / 2;
				const c = (at(i, j, k + 1) - at(i, j, k - 1)) / 2;
				const m = Math.hypot(a, b, c);
				const idx = i + n * (j + n * k);
				gm[idx] = m;
				if (m > 0) {
					gx[idx] = a / m;
					gy[idx] = b / m;
					gz[idx] = c / m;
				}
			}
	cached = { n, data, gx, gy, gz, gm };
	return cached;
}

/** Trilinear interpolation in a cubic grid of side n, at fractional voxel coordinates. */
export function tri(a: Float32Array, n: number, x: number, y: number, z: number): number {
	const i = Math.min(n - 2, Math.max(0, Math.floor(x)));
	const j = Math.min(n - 2, Math.max(0, Math.floor(y)));
	const k = Math.min(n - 2, Math.max(0, Math.floor(z)));
	const fx = x - i;
	const fy = y - j;
	const fz = z - k;
	const o = i + n * (j + n * k);
	const nn = n * n;
	const c00 = a[o] * (1 - fx) + a[o + 1] * fx;
	const c10 = a[o + n] * (1 - fx) + a[o + n + 1] * fx;
	const c01 = a[o + nn] * (1 - fx) + a[o + nn + 1] * fx;
	const c11 = a[o + nn + n] * (1 - fx) + a[o + nn + n + 1] * fx;
	return (c00 * (1 - fy) + c10 * fy) * (1 - fz) + (c01 * (1 - fy) + c11 * fy) * fz;
}

/** Axis-aligned slice through the volume at index k (z), as a flat n*n array. */
export function sliceZ(vol: Volume, k: number): number[] {
	const n = vol.n;
	const out = new Array<number>(n * n);
	for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) out[i + n * j] = vol.data[i + n * (j + n * k)];
	return out;
}

/** Densities 0-100 are colored with viridis: color shows magnitude, the transfer function sets opacity. */
const LUT_RGB = Array.from({ length: 101 }, (_, d) => {
	const c = d3.rgb(d3.interpolateViridis(d / 100));
	return [c.r / 255, c.g / 255, c.b / 255];
});
export const densityColor = (d: number) => d3.interpolateViridis(d / 100);

export type Opacities = Record<MaterialKey, number>;

/** Opacity transfer function: a tent around each material's density, peak = that material's opacity. */
export function opacityTF(op: Opacities, width = 9): (d: number) => number {
	const table = new Float32Array(101);
	for (let d = 0; d <= 100; d++) {
		let a = 0;
		for (const m of MATERIALS) a = Math.max(a, op[m.key] * Math.max(0, 1 - Math.abs(d - m.density) / width));
		table[d] = a;
	}
	return (d) => table[Math.max(0, Math.min(100, Math.round(d)))];
}

export type Mode = 'composite' | 'mip' | 'average';

export interface RenderOpts {
	size: number;
	/** Rotation about the vertical axis, radians. */
	yaw: number;
	pitch?: number;
	tf: (d: number) => number;
	mode?: Mode;
	background: [number, number, number];
}

/**
 * Orthographic ray casting, front to back with early ray termination.
 * Returns the image and how many samples it took (for the readout).
 */
export function render(vol: Volume, o: RenderOpts): { image: ImageData; samples: number } {
	const { size, yaw, tf } = o;
	const pitch = o.pitch ?? -0.35;
	const mode = o.mode ?? 'composite';
	const n = vol.n;
	const img = new ImageData(size, size);
	const px = img.data;
	const cy = Math.cos(yaw);
	const sy = Math.sin(yaw);
	const cp = Math.cos(pitch);
	const sp = Math.sin(pitch);
	// Camera basis: right (rx), up (ux), forward (fx), rotated by yaw then pitch.
	const rx = [cy, 0, -sy];
	const ux = [sy * sp, cp, cy * sp];
	const fx = [sy * cp, -sp, cy * cp];
	// Light from the upper left of the viewer, so curved surfaces read as round.
	const lx = [0.45 * rx[0] - 0.55 * ux[0] - 0.7 * fx[0], 0.45 * rx[1] - 0.55 * ux[1] - 0.7 * fx[1], 0.45 * rx[2] - 0.55 * ux[2] - 0.7 * fx[2]];
	const ll = Math.hypot(lx[0], lx[1], lx[2]);
	const steps = Math.round(n * 1.8);
	const span = 1.8;
	const dt = (2 * span) / steps;
	const scale = (n - 1) / 2;
	const ref = 2 / (n - 1); // opacity is defined per voxel-sized step
	const corr = dt / ref;
	let samples = 0;
	const [br, bg, bb] = o.background;
	for (let y = 0; y < size; y++) {
		const v = 1.15 - (2.3 * (y + 0.5)) / size;
		for (let x = 0; x < size; x++) {
			// Jitter where each ray starts, so sampling shows up as fine grain rather than rings.
			const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
			const jit = h - Math.floor(h);
			const u = -1.15 + (2.3 * (x + 0.5)) / size;
			let R = 0;
			let G = 0;
			let B = 0;
			let A = 0;
			let maxD = 0;
			let sum = 0;
			let cnt = 0;
			for (let s = 0; s < steps; s++) {
				const t = -span + (s + jit) * dt;
				const wx = u * rx[0] + v * ux[0] + t * fx[0];
				const wy = u * rx[1] + v * ux[1] + t * fx[1];
				const wz = u * rx[2] + v * ux[2] + t * fx[2];
				if (wx < -1 || wx > 1 || wy < -1 || wy > 1 || wz < -1 || wz > 1) continue;
				// Volume y runs down the image, so flip it.
				const vx = (wx + 1) * scale;
				const vy = (1 - wy) * scale;
				const vz = (wz + 1) * scale;
				const d = tri(vol.data, n, vx, vy, vz);
				samples++;
				if (mode === 'mip') {
					if (d > maxD) maxD = d;
					continue;
				}
				if (mode === 'average') {
					sum += d;
					cnt++;
					continue;
				}
				const a0 = tf(d);
				if (a0 <= 0.002) continue;
				const a = 1 - Math.pow(1 - a0, corr);
				const c = LUT_RGB[Math.max(0, Math.min(100, Math.round(d)))];
				// Shading: the gradient acts as the surface normal.
				const gm = tri(vol.gm, n, vx, vy, vz);
				let shade = 1;
				if (gm > 1.5) {
					const nx = tri(vol.gx, n, vx, vy, vz);
					const ny = -tri(vol.gy, n, vx, vy, vz);
					const nz = tri(vol.gz, n, vx, vy, vz);
					const len = Math.hypot(nx, ny, nz) || 1;
					const dot = Math.abs((nx * lx[0] + ny * lx[1] + nz * lx[2]) / (len * ll));
					shade = 0.3 + 0.7 * dot;
				}
				const w = (1 - A) * a;
				R += w * c[0] * shade;
				G += w * c[1] * shade;
				B += w * c[2] * shade;
				A += w;
				if (A > 0.98) break; // early ray termination
			}
			if (mode === 'mip') {
				const c = LUT_RGB[Math.round(maxD)];
				const a = Math.min(1, maxD / 15);
				R = c[0] * a;
				G = c[1] * a;
				B = c[2] * a;
				A = a;
			} else if (mode === 'average') {
				// Like an X-ray: brighter where more stuff lies along the ray.
				const m = cnt ? sum / steps / 35 : 0;
				const g = Math.min(1, m);
				R = G = B = g;
				A = 1;
			}
			const p = 4 * (x + size * y);
			px[p] = 255 * Math.min(1, R + (1 - A) * br);
			px[p + 1] = 255 * Math.min(1, G + (1 - A) * bg);
			px[p + 2] = 255 * Math.min(1, B + (1 - A) * bb);
			px[p + 3] = 255;
		}
	}
	return { image: img, samples };
}

/** Puts an ImageData on a visible canvas, scaled up smoothly. */
export function blit(target: HTMLCanvasElement, image: ImageData) {
	const off = document.createElement('canvas');
	off.width = image.width;
	off.height = image.height;
	off.getContext('2d')!.putImageData(image, 0, 0);
	const ctx = target.getContext('2d')!;
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(off, 0, 0, target.width, target.height);
}

/** Histogram of densities in bins of 2, for the transfer function editor. */
export function histogram(vol: Volume): { x0: number; count: number }[] {
	const bins = Array.from({ length: 50 }, (_, i) => ({ x0: i * 2, count: 0 }));
	for (const d of vol.data) bins[Math.min(49, Math.floor(d / 2))].count++;
	return bins;
}
