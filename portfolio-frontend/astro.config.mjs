// @ts-check

import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, passthroughImageService } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://portfolio.nickmarcha.com',
	base: '/',
	integrations: [mdx(), react(), sitemap()],
	vite: {
		plugins: [tailwindcss()],
	},
	image: {
		service: passthroughImageService(),
	},
});
