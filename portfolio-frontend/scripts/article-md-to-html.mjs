// One-time import of the "Seeing data" article from its markdown parts into the
// HTML file the article page renders. After the import, article.html is the source:
// edit it directly. Re-running this overwrites hand edits, so it refuses to unless
// --force is passed.
//
//   node scripts/article-md-to-html.mjs <parts-dir> [--force]
//
// Figure markers <!-- FIG x.y: ... --> become <figure class="viz-fig" data-fig="x.y">,
// which the page's figure loader fills in.

import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [partsDir, ...flags] = process.argv.slice(2);
if (!partsDir) {
	console.error('usage: node scripts/article-md-to-html.mjs <parts-dir> [--force]');
	process.exit(1);
}
const out = new URL('../src/articles/seeing-data/article.html', import.meta.url);
if (existsSync(out) && !flags.includes('--force')) {
	console.error(`${out.pathname} exists and may have hand edits. Pass --force to overwrite.`);
	process.exit(1);
}

const files = readdirSync(partsDir)
	.filter((f) => f.endsWith('.md'))
	.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
let md = files.map((f) => readFileSync(join(partsDir, f), 'utf8').trim()).join('\n\n');

// The page header renders the title.
md = md.replace(/^# .*\n+/, '');
md = md.replace(
	/<!--\s*FIG\s+([\d.]+)[^>]*-->/g,
	(_, id) => `<figure class="viz-fig" data-fig="${id}"></figure>`,
);

const processor = await createMarkdownProcessor({ syntaxHighlight: false });
const { code } = await processor.render(md);

const figs = (code.match(/data-fig="/g) ?? []).length;
writeFileSync(out, code.replace(/<\/figure>\n?<figure/g, '</figure>\n<figure') + '\n');
console.log(`wrote ${out.pathname}: ${files.length} parts, ${figs} figures`);
