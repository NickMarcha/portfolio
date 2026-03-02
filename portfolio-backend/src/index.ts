import { createRequire } from 'node:module';
import * as cheerio from 'cheerio';
import cors from 'cors';
import express from 'express';

const require = createRequire(import.meta.url);

const AGAINST_MALARIA_URL =
	'https://www.againstmalaria.com/Fundraiser.aspx?FundraiserID=8960';

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

app.get('/health', (_req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
	res.json({ message: 'Portfolio API', version });
});

app.get('/api/raffledashboardlatest', async (_req, res) => {
	const donationTotal = await scrapeAgainstMalariaTotal();
	res.json({ donationTotal: donationTotal ?? 0 });
});

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
