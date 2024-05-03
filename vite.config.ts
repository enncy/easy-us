import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import banner from 'vite-plugin-banner';
import { author, description, homepage, license, name } from './package.json';
import dotenv from 'dotenv';

const bannerContent = `
/*!
 * ${name} ( ${homepage} )
 * ${description}
 * copyright ${author}
 * license ${license}
 */
`;

dotenv.config();

// https://vitejs.dev/config/
export default defineConfig({
	build: {
		/** 取消css代码分离 */
		cssCodeSplit: false,
		/** 输出路径 */
		outDir: './dist',
		/** 清空输出路径 */
		emptyOutDir: false,
		/** 是否压缩代码， 这里写 false，不然打包后类名会发生变化 */
		minify: false,
		/** 打包库， 全局名字为 OCS */
		lib: {
			entry: './src/index.ts',
			name: 'EUS',
			fileName: () => 'index.min.js',
			formats: ['umd']
		}
	},

	plugins: [visualizer(), banner(bannerContent)]
});
