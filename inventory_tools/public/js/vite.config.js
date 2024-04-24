import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { getProxyOptions } from 'frappe-ui/src/utils/vite-dev-server'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [vue()],
	server: {
		port: 8080,
		proxy: getProxyOptions({ port: 8003 }),
	},
	build: {
		lib: {
			entry: path.resolve(__dirname, './faceted_search/faceted_search.js'),
			name: 'inventory_tools',
			fileName: format => `inventory_tools.js`, // creates module only output
		},
		outDir: './inventory_tools/public/dist/js',
		root: './',
		target: 'es2015',
		emptyOutDir: false,
		minify: false,
	},
	optimizeDeps: {},
	define: {
		'process.env': process.env,
	},
})
