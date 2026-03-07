/**
 * Build-time script to generate og-image.png from icon-me.png.
 * Uses nearest-neighbor scaling so pixel art stays crisp when embedded.
 * Run: node scripts/generate-og-image.mjs
 *
 * Output: public/og-image.png (1200x630)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const inputPath = path.join(publicDir, "icon-me.png");
const outputPath = path.join(publicDir, "og-image.png");

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const BG_COLOR = { r: 26, g: 27, b: 38, alpha: 1 }; // dark theme background

async function main() {
	if (!fs.existsSync(inputPath)) {
		console.warn("icon-me.png not found, skipping og-image generation.");
		return;
	}

	const metadata = await sharp(inputPath).metadata();
	const srcW = metadata.width ?? 64;
	const srcH = metadata.height ?? 64;

	// Scale by integer multiple to preserve pixel art, fit within OG_HEIGHT
	const scale = Math.floor(Math.min(OG_WIDTH / srcW, OG_HEIGHT / srcH));
	const scaledW = Math.min(srcW * scale, OG_WIDTH);
	const scaledH = Math.min(srcH * scale, OG_HEIGHT);

	// Center on 1200x630 canvas
	const padLeft = Math.floor((OG_WIDTH - scaledW) / 2);
	const padRight = OG_WIDTH - scaledW - padLeft;
	const padTop = Math.floor((OG_HEIGHT - scaledH) / 2);
	const padBottom = OG_HEIGHT - scaledH - padTop;

	await sharp(inputPath)
		.resize(scaledW, scaledH, { kernel: sharp.kernel.nearest })
		.extend({
			top: padTop,
			bottom: padBottom,
			left: padLeft,
			right: padRight,
			background: BG_COLOR,
		})
		.png()
		.toFile(outputPath);

	console.log(`Generated og-image.png (${OG_WIDTH}x${OG_HEIGHT}) from icon-me.png`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
