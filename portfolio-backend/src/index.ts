import 'dotenv/config';
import { createRequire } from 'node:module';
import * as cheerio from 'cheerio';
import Database from 'better-sqlite3';
import cors from 'cors';
import express from 'express';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);

const AGAINST_MALARIA_URL =
	'https://www.againstmalaria.com/Fundraiser.aspx?FundraiserID=8960';

const IP_API_FIELDS = 'status,country,countryCode,region,regionName,city,timezone,isp,org';

interface IpApiResponse {
	status: string;
	country?: string;
	countryCode?: string;
	region?: string;
	regionName?: string;
	city?: string;
	timezone?: string;
	isp?: string;
	org?: string;
}

async function enrichIp(ip: string): Promise<IpApiResponse | null> {
	try {
		const res = await fetch(
			`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${IP_API_FIELDS}`
		);
		console.log('[enrichIp]', res.status);
		if (res.status === 429) return null;
		if (!res.ok) return null;
		const data = (await res.json()) as IpApiResponse;
		return data.status === 'success' ? data : null;
	} catch {
		return null;
	}
}

const NTFY_BASE_URL = process.env.NTFY_BASE_URL;
const NTFY_TOPIC = process.env.NTFY_TOPIC;
const NTFY_TOKEN = process.env.NTFY_TOKEN;

async function notifyVisit(data: {
	path: string;
	ip: string | null;
	country: string | null;
	city: string | null;
	regionName: string | null;
	isp: string | null;
	enriched: boolean;
}): Promise<void> {
	if (!NTFY_TOKEN || !NTFY_BASE_URL || !NTFY_TOPIC) return;

	const parts = [`Visit: ${data.path}`, data.ip ?? '?', data.country ?? 'XX'];
	if (data.enriched && (data.city || data.regionName || data.isp)) {
		const loc = [data.city, data.regionName].filter(Boolean).join(', ');
		if (loc) parts.push(loc);
		if (data.isp) parts.push(data.isp);
	} else {
		parts.push('IP lookup failed');
	}
	const message = parts.join(' | ');

	try {
		const res = await fetch(`${NTFY_BASE_URL}/${NTFY_TOPIC}`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${NTFY_TOKEN}`,
				'Title': 'Portfolio visit',
				'Content-Type': 'text/plain',
			},
			body: message,
		});
		if (!res.ok) throw new Error(`ntfy ${res.status}`);
	} catch (err) {
		console.warn('[ntfy]', err);
	}
}

async function scrapeAgainstMalariaTotal(): Promise<number | null> {
	try {
		const res = await fetch(AGAINST_MALARIA_URL);
		if (!res.ok) return null;
		const html = await res.text();
		const $ = cheerio.load(html);
		const text = $('#MainContent_lblGrandTotal').text().trim();
		if (!text) return null;
		const parsed = parseFloat(text.replace(/,/g, ''));
		return Number.isFinite(parsed) ? parsed : null;
	} catch (err) {
		console.error('[scrapeAgainstMalariaTotal]', err);
		return null;
	}
}

const { version } = require('../package.json') as { version: string };

const DATA_DIR = process.env.DATA_DIR ?? './data';
const DB_PATH = join(DATA_DIR, 'visits.db');

if (!existsSync(DATA_DIR)) {
	mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.exec(`
	CREATE TABLE IF NOT EXISTS visits (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		path TEXT NOT NULL,
		timestamp TEXT NOT NULL,
		ip TEXT,
		country TEXT,
		city TEXT,
		region TEXT,
		regionName TEXT,
		timezone TEXT,
		isp TEXT,
		org TEXT
	)
`);

const insertVisit = db.prepare(`
	INSERT INTO visits (path, timestamp, ip, country, city, region, regionName, timezone, isp, org)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const updateVisitEnrichment = db.prepare(`
	UPDATE visits SET city = ?, region = ?, regionName = ?, timezone = ?, isp = ?, org = ?
	WHERE id = ?
`);

const selectAllVisits = db.prepare(`
	SELECT id, path, timestamp, ip, country, city, region, regionName, timezone, isp, org
	FROM visits ORDER BY timestamp DESC
`);

const selectVisitById = db.prepare(`
	SELECT id, path, timestamp, ip, country, city, region, regionName, timezone, isp, org
	FROM visits WHERE id = ?
`);

const app = express();
const PORT = process.env.PORT ?? 3000;

const allowedOrigins = [
	'http://localhost:4321',
	'http://localhost:4322',
	'http://localhost:4323',
	'http://localhost:5173',
	'http://127.0.0.1:4321',
	'http://127.0.0.1:4322',
	'http://127.0.0.1:4323',
	'http://127.0.0.1:5173',
	'https://portfolio.nickmarcha.com',
];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

function parseBasicAuth(authHeader: string | undefined): string | null {
	if (!authHeader?.startsWith('Basic ')) return null;
	try {
		const base64 = authHeader.slice(6);
		const decoded = Buffer.from(base64, 'base64').toString('utf-8');
		const [user, pass] = decoded.split(':');
		return user === 'admin' ? pass : null;
	} catch {
		return null;
	}
}

function requireAdmin(
	req: express.Request,
	res: express.Response,
	next: express.NextFunction
) {
	const adminPassword = process.env.ADMIN_PASSWORD;
	if (!adminPassword) {
		res.status(503).json({ error: 'Admin not configured' });
		return;
	}
	const password = parseBasicAuth(req.headers.authorization);
	if (password !== adminPassword) {
		res.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
		res.status(401).json({ error: 'Unauthorized' });
		return;
	}
	next();
}

app.get('/health', (_req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
	res.json({ message: 'Portfolio API', version });
});

app.post('/api/visits', async (req, res) => {
	const path = typeof req.body?.path === 'string' ? req.body.path : null;
	if (!path) {
		res.status(400).json({ error: 'path required' });
		return;
	}

	const ip = req.headers['cf-connecting-ip'] as string | undefined ?? null;
	const country = req.headers['cf-ipcountry'] as string | undefined ?? null;
	const timestamp = new Date().toISOString();

	let city: string | null = null;
	let region: string | null = null;
	let regionName: string | null = null;
	let timezone: string | null = null;
	let isp: string | null = null;
	let org: string | null = null;

	if (ip) {
		const enriched = await enrichIp(ip);
		if (enriched) {
			city = enriched.city ?? null;
			region = enriched.region ?? null;
			regionName = enriched.regionName ?? null;
			timezone = enriched.timezone ?? null;
			isp = enriched.isp ?? null;
			org = enriched.org ?? null;
		}
	}

	insertVisit.run(path, timestamp, ip, country, city, region, regionName, timezone, isp, org);

	const enriched = !!(city || isp);
	notifyVisit({ path, ip, country, city, regionName, isp, enriched }).catch(() => {});

	res.status(204).send();
});

app.get('/api/admin/visits', requireAdmin, (_req, res) => {
	const rows = selectAllVisits.all();
	const visits = rows.map((r) => ({
		id: (r as { id: number }).id,
		path: (r as { path: string }).path,
		timestamp: (r as { timestamp: string }).timestamp,
		ip: (r as { ip: string | null }).ip,
		country: (r as { country: string | null }).country,
		city: (r as { city: string | null }).city,
		region: (r as { region: string | null }).region,
		regionName: (r as { regionName: string | null }).regionName,
		timezone: (r as { timezone: string | null }).timezone,
		isp: (r as { isp: string | null }).isp,
		org: (r as { org: string | null }).org,
	}));
	res.json({ visits });
});

app.post('/api/admin/visits/:id/enrich', requireAdmin, async (req, res) => {
	const id = parseInt(req.params.id, 10);
	if (!Number.isFinite(id)) {
		res.status(400).json({ error: 'Invalid id' });
		return;
	}

	const row = selectVisitById.get(id) as {
		id: number;
		path: string;
		timestamp: string;
		ip: string | null;
		country: string | null;
		city: string | null;
		region: string | null;
		regionName: string | null;
		timezone: string | null;
		isp: string | null;
		org: string | null;
	} | undefined;

	if (!row) {
		res.status(404).json({ error: 'Visit not found' });
		return;
	}

	const ip = row.ip;
	if (!ip) {
		res.status(400).json({ error: 'No IP to enrich' });
		return;
	}

	try {
		const fetchRes = await fetch(
			`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${IP_API_FIELDS}`
		);

		if (fetchRes.status === 429) {
			const retryAfter = parseInt(fetchRes.headers.get('x-ttl') ?? '60', 10);
			res.status(429).json({ error: 'Rate limited', retryAfter });
			return;
		}

		if (!fetchRes.ok) {
			res.status(502).json({ error: 'Enrichment failed' });
			return;
		}

		const data = (await fetchRes.json()) as IpApiResponse;
		if (data.status !== 'success') {
			res.status(502).json({ error: 'Enrichment failed' });
			return;
		}

		updateVisitEnrichment.run(
			data.city ?? null,
			data.region ?? null,
			data.regionName ?? null,
			data.timezone ?? null,
			data.isp ?? null,
			data.org ?? null,
			id
		);

		const updated = selectVisitById.get(id) as typeof row;
		res.json({
			visit: {
				id: updated.id,
				path: updated.path,
				timestamp: updated.timestamp,
				ip: updated.ip,
				country: updated.country,
				city: updated.city,
				region: updated.region,
				regionName: updated.regionName,
				timezone: updated.timezone,
				isp: updated.isp,
				org: updated.org,
			},
		});
	} catch (err) {
		console.error('[enrich]', err);
		res.status(500).json({ error: 'Enrichment failed' });
	}
});

app.get('/api/raffledashboardlatest', async (_req, res) => {
	const donationTotal = await scrapeAgainstMalariaTotal();
	res.json({ donationTotal: donationTotal ?? 0 });
});

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
