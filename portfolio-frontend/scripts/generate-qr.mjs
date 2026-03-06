/**
 * Build-time script to generate QR code SVGs for share functionality.
 * Run: node scripts/generate-qr.mjs
 *
 * Output: public/qr/home-{lang}.svg, public/qr/projects-{slug}-{lang}.svg
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import QRCode from "qrcode";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = "https://portfolio.nickmarcha.com";
const LOCALES = ["en", "no", "es"];

const projectSlugs = [
	"bio",
	"inkypen",
	"kriskogram",
	"bachelors-project",
	"raffle-dashboard",
	"games",
	"badlands",
	"school-assignments",
];

const outDir = path.join(__dirname, "..", "public", "qr");

async function main() {
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	// Homepage: 1 per language (path-based)
	for (const lang of LOCALES) {
		const url = lang === "en" ? `${SITE}/` : `${SITE}/${lang}/`;
		const svg = await QRCode.toString(url, { type: "svg" });
		fs.writeFileSync(path.join(outDir, `home-${lang}.svg`), svg);
		console.log(`Generated home-${lang}.svg`);
	}

	// Projects: 1 per project per language (path-based)
	for (const slug of projectSlugs) {
		for (const lang of LOCALES) {
			const url = lang === "en" ? `${SITE}/projects/${slug}` : `${SITE}/${lang}/projects/${slug}`;
			const svg = await QRCode.toString(url, { type: "svg" });
			fs.writeFileSync(path.join(outDir, `projects-${slug}-${lang}.svg`), svg);
			console.log(`Generated projects-${slug}-${lang}.svg`);
		}
	}

	console.log("QR generation complete.");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
