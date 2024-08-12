// Copyright (c) 2024, AgriTheory and contributors
// For license information, please see license.txt

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [vue()],
	build: {
		lib: {
			entry: path.resolve(__dirname, './faceted_search/faceted_search.js'),
			name: 'inventory_tools',
			fileName: format => `inventory_tools.js`, // creates module only output
		},
		outDir: './inventory_tools/public/dist/js',
		target: 'esnext',
		emptyOutDir: false,
		minify: false,
	},
	optimizeDeps: {},
	define: {
		'process.env': process.env,
	},
})
