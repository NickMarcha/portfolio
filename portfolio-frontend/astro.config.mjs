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
	i18n: {
		defaultLocale: 'en',
		locales: ['en', 'no', 'es'],
		routing: { prefixDefaultLocale: false },
	},
	integrations: [mdx(), react(), sitemap()],
	vite: {
		plugins: [tailwindcss()],
		resolve: {
			dedupe: ['react', 'react-dom'],
		},
		optimizeDeps: {
			include: ['embla-carousel-react', '@tanstack/react-table', 'react-medium-image-zoom', 'cmdk'],
		},
	},
	image: {
		service: passthroughImageService(),
	},
});
