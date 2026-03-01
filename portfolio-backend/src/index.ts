import { createRequire } from 'node:module';
import cors from 'cors';
import express from 'express';

const require = createRequire(import.meta.url);
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

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
