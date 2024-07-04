import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [vue()],
	build: {
		lib: {
			entry: path.resolve(__dirname, './inventory_tools.js'),
			name: 'check_run',
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
