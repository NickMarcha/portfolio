import type { Visit } from '@/lib/adminVisit';

export type GeoPoint = { lon: number; lat: number; count: number };

/** Group visits by rounded coordinates for distinct markers. */
export function aggregateVisitsToPoints(visits: Visit[]): GeoPoint[] {
	const map = new Map<string, GeoPoint>();
	for (const v of visits) {
		if (v.lat == null || v.lon == null) continue;
		if (!Number.isFinite(v.lat) || !Number.isFinite(v.lon)) continue;
		const key = `${v.lat.toFixed(4)},${v.lon.toFixed(4)}`;
		const cur = map.get(key);
		if (cur) cur.count += 1;
		else map.set(key, { lon: v.lon, lat: v.lat, count: 1 });
	}
	return [...map.values()];
}

export type ScreenCluster = {
	x: number;
	y: number;
	count: number;
	lon: number;
	lat: number;
};

/**
 * Merge points in screen space using a grid (cell size in px).
 * Weighted centroid per cell; total count summed.
 */
export function clusterInScreenSpace(
	points: GeoPoint[],
	project: (lon: number, lat: number) => [number, number] | null,
	cellPx: number
): ScreenCluster[] {
	type Acc = {
		x: number;
		y: number;
		count: number;
		wx: number;
		wy: number;
		lon: number;
		lat: number;
	};
	const buckets = new Map<string, Acc>();

	for (const p of points) {
		const xy = project(p.lon, p.lat);
		if (!xy) continue;
		const [x, y] = xy;
		if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

		const cx = Math.floor(x / cellPx);
		const cy = Math.floor(y / cellPx);
		const key = `${cx},${cy}`;
		const g = buckets.get(key);
		if (g) {
			const n = g.count + p.count;
			g.wx += x * p.count;
			g.wy += y * p.count;
			g.count = n;
			g.x = g.wx / n;
			g.y = g.wy / n;
		} else {
			buckets.set(key, {
				x,
				y,
				count: p.count,
				wx: x * p.count,
				wy: y * p.count,
				lon: p.lon,
				lat: p.lat,
			});
		}
	}

	return [...buckets.values()].map(({ x, y, count, lon, lat }) => ({
		x,
		y,
		count,
		lon,
		lat,
	}));
}
