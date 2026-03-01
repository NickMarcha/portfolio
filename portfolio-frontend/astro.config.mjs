// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, passthroughImageService } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://portfolio.nickmarcha.com',
	base: '/',
	integrations: [mdx(), sitemap()],
	image: {
		service: passthroughImageService(),
	},
});
