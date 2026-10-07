import {defineConfig} from 'vite';import {svelte} from '@sveltejs/vite-plugin-svelte';
export default defineConfig({plugins:[svelte()],server:{host:'127.0.0.1',port:8770,proxy:{'/api':'http://127.0.0.1:8766'}},build:{outDir:'dist'}});
